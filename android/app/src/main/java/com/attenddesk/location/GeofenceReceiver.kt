package com.attenddesk.location

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.attenddesk.App
import com.attenddesk.AppContainer
import com.attenddesk.MainActivity
import com.attenddesk.R
import com.attenddesk.data.api.CheckInRequest
import com.attenddesk.data.api.LocationPingRequest
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Receives ENTER / EXIT events from [GeofenceController].
 *
 * Behaviour is HYBRID per the org's policy (see LocationPrefs.faceRequired):
 * - If face verify is OFF for the org, we attempt an auto check-in / check-out
 *   directly via /api/v1/me/check-in with GPS-only proof. The server still
 *   enforces all anti-cheat checks; if WiFi/QR/etc. are required and missing,
 *   the call returns 422 and we fall back to a reminder notification.
 * - If face verify is ON, we never attempt an auto check-in — face match
 *   requires a foreground camera. We post a notification asking the user to
 *   open the Verify tab.
 *
 * Either way, the event itself is recorded as a `geofence_enter` /
 * `geofence_exit` location ping for audit.
 */
class GeofenceReceiver : BroadcastReceiver() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_GEOFENCE) return
        val event = GeofencingEvent.fromIntent(intent)
        if (event == null || event.hasError()) {
            Log.w(TAG, "Geofence event error: ${event?.errorCode}")
            return
        }
        val transition = event.geofenceTransition
        val triggering: List<Geofence> = event.triggeringGeofences.orEmpty()
        Log.i(TAG, "Geofence transition=$transition for ${triggering.map { it.requestId }}")

        // BroadcastReceiver.onReceive returns synchronously — kick the work
        // off on IO and let it run. Geofence broadcasts hold a wakelock for
        // a few seconds; we use goAsync() to extend it cleanly.
        val pending: PendingResult = goAsync()
        scope.launch {
            try {
                handle(context, transition, event)
            } catch (t: Throwable) {
                Log.w(TAG, "Geofence handler crashed: ${t.message}")
            } finally {
                pending.finish()
            }
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun handle(context: Context, transition: Int, event: GeofencingEvent) {
        val app = context.applicationContext as? App ?: return
        val container = app.container
        val snapshot = LocationPrefs.load(context)
        // Auto check-in is a per-user choice, so it works even when the org-wide
        // location mode is "manual" — that env var is not something most admins
        // can change. Either signal being on is enough to keep going.
        val autoCheckIn = runCatching { container.autoCheckInPrefs.flow.first() }.getOrDefault(false)
        if (snapshot.mode == "manual" && !autoCheckIn) {
            Log.i(TAG, "Manual mode and auto check-in off; ignoring geofence event")
            return
        }

        // Why auto check-in did not happen, in words fit for a lock screen.
        // See [postNotification] for why this is carried rather than only logged.
        var detail: String? = null

        // The location that rides along with a geofence transition is produced
        // by the LOW-POWER location engine, because coarse is all geofencing
        // needs — in practice ~100 m. The server's geo check refuses anything
        // coarser than policy.gpsAccuracyMaxMeters (40 m here) as `low_accuracy`
        // and returns 422 WITHOUT ever measuring distance, so a phone sitting
        // 6 m from the office centre was rejected for being imprecise about it.
        //
        // triggeringLocation is also documented as nullable, and several OEMs
        // (Xiaomi among them) deliver the transition without one at all.
        //
        // Both cases want the same answer: go and get a proper high-accuracy
        // fix, exactly as the manual check-in button does.
        val triggered = event.triggeringLocation
        val accuracyLimit = snapshot.gpsAccuracyMaxMeters
        // A null limit means no policy is cached yet, so we don't know what the
        // server will accept — refresh rather than gamble. Assuming a generous
        // default here is what let a 100 m fix pass locally and be refused
        // remotely on a fresh install's first arrival.
        val location = if (triggered != null && accuracyLimit != null && triggered.accuracy <= accuracyLimit) {
            triggered
        } else {
            Log.i(
                TAG,
                "Geofence fix is ${triggered?.accuracy?.toInt()?.toString() ?: "absent"}m " +
                    "(limit ${accuracyLimit?.toString() ?: "unknown"}m); requesting a high-accuracy fix",
            )
            val snap = runCatching {
                // goAsync() extends the broadcast wakelock by seconds, not
                // minutes. Cap the hunt for satellites so it can't outlive the
                // receiver and get killed with the check-in still unsent —
                // better to fall back to the coarse fix and say so.
                kotlinx.coroutines.withTimeoutOrNull(FIX_TIMEOUT_MS) { container.gpsCheck.snapshot() }
            }.getOrNull()
            val lat = snap?.lat
            val lng = snap?.lng
            val refined = if (lat != null && lng != null) {
                android.location.Location("geofence-refined").apply {
                    latitude = lat
                    longitude = lng
                    accuracy = (snap.accuracyMeters ?: 0.0).toFloat()
                    if (snap.isMock) {
                        // Carried through so the server still sees a faked fix.
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) isMock = true
                    }
                }
            } else null
            when {
                refined == null && triggered == null -> {
                    Log.w(TAG, "No triggering location and no fix available (${snap?.reason}); notifying only")
                    detail = "no GPS fix (${snap?.reason?.takeIf { it.isNotBlank() } ?: "location unavailable"})"
                    null
                }
                // Keep whichever is tighter. A refresh can come back worse
                // indoors, and the coarse one at least lets the server decide.
                refined == null -> triggered
                triggered == null -> refined
                else -> if (refined.accuracy <= triggered.accuracy) refined else triggered
            }
        }
        val nowIso = isoNow()

        // 1) Always record the transition as a location ping.
        val source = when (transition) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> "geofence_enter"
            Geofence.GEOFENCE_TRANSITION_EXIT -> "geofence_exit"
            else -> return
        }
        if (location != null) {
            runCatching {
                container.api.locationPing(
                    LocationPingRequest(
                        lat = location.latitude,
                        lng = location.longitude,
                        accuracy = location.accuracy.toDouble(),
                        capturedAt = nowIso,
                        source = source,
                        isMockLocation = isMockLocation(location),
                    ),
                )
            }.onFailure {
                // A failing ping means the network or the auth token is the
                // problem, not the geofence — and the check-in below is about
                // to fail the same way. Keep it as a fallback reason.
                Log.w(TAG, "ping failed: ${it.message}")
                detail = "couldn't reach the server (${shortError(it)})"
            }
        }

        // 2) Auto check-IN only. Exiting the geofence never checks anyone out:
        //    a lunch run past the 40 m radius would otherwise end their day.
        //    Face enrollment can't happen in the background, so if face is
        //    required we only notify.
        val isEnter = transition == Geofence.GEOFENCE_TRANSITION_ENTER

        // Don't auto check-in on a day nobody is working, or a second time on a
        // day already started. Without these, stepping out for lunch and coming
        // back fires another check-in, and a Saturday visit creates attendance
        // for a day off.
        val today = java.time.LocalDate.now(DHAKA)
        val todayIso = today.toString()
        val weeklyOff = today.dayOfWeek == java.time.DayOfWeek.FRIDAY ||
            today.dayOfWeek == java.time.DayOfWeek.SATURDAY
        val holiday = snapshot.isHoliday(todayIso)
        // null means the server could not be asked. Treated as "already in" so
        // a network blip can't mint a duplicate attendance record, but kept
        // distinct from a confirmed yes — the two want different behaviour below.
        val checkedIn: Boolean? =
            if (isEnter && !weeklyOff && !holiday) hasCheckedInToday(container, today) else false
        val alreadyIn = checkedIn != false
        if (isEnter && (weeklyOff || holiday || alreadyIn)) {
            val why = when {
                weeklyOff -> "weekly off"
                holiday -> "holiday"
                checkedIn == null -> "couldn't reach the server to check"
                else -> "already checked in today"
            }
            Log.i(TAG, "Skipping auto check-in: $why")
            // Say nothing when there is nothing to do. Already checked in, or a
            // day nobody is working: a lunch run past the 40 m radius and back
            // would otherwise buzz on every return with news the user already
            // has. Checking out is prompted by the EXIT notification instead.
            //
            // Failing to ASK is different, and still worth surfacing. That is
            // the silent-refusal case that took four releases to track down,
            // and it must not creep back in behind this quiet.
            if (checkedIn == null) {
                postNotification(
                    context,
                    transition,
                    autoCheckedIn = false,
                    detail = detail ?: "couldn't confirm today's attendance with the server",
                )
            }
            return
        }

        val wifi = runCatching { container.wifiCheck.snapshot() }.getOrNull()
        // Follow the org policy rather than being stricter than it. When
        // "Require Wi-Fi" is off, the geofence alone is enough — matching what a
        // manual check-in would accept. Being stricter here failed silently:
        // a phone that can't read its SSID would never auto check in even
        // though tapping the button worked fine.
        val wifiOk = !snapshot.wifiRequired || matchesOfficeWifi(wifi, snapshot.office)

        if (isEnter && !snapshot.faceRequired && location != null && wifiOk) {
            // Drop a duplicate broadcast for the same arrival (see
            // ATTEMPT_DEBOUNCE_MS). Silent: the first broadcast is handling it
            // and will report its own outcome.
            val now = android.os.SystemClock.elapsedRealtime()
            val since = now - runCatching { container.autoCheckInPrefs.lastAttemptAt() }.getOrDefault(0L)
            if (since in 0 until ATTEMPT_DEBOUNCE_MS) {
                Log.i(TAG, "Duplicate geofence broadcast ${since}ms after the last attempt; ignoring")
                return
            }
            runCatching { container.autoCheckInPrefs.markAttempt(now) }

            val attempted = runCatching {
                container.api.checkIn(
                    CheckInRequest(
                        type = "CHECK_IN",
                        lat = location.latitude,
                        lng = location.longitude,
                        accuracyMeters = location.accuracy.toDouble(),
                        isMockLocation = isMockLocation(location),
                        // Send the WiFi we matched on so the server records the
                        // same evidence it would for a manual check-in.
                        ssid = wifi?.ssid,
                        bssid = wifi?.bssid,
                    ),
                )
            }
            if (attempted.isFailure || attempted.getOrNull()?.ok != true) {
                // Name the checks the server actually refused on. "did not pass"
                // alone is what made this unfixable from the outside.
                val why = attempted.exceptionOrNull()?.let { describeFailure(it) }
                    ?: attempted.getOrNull()?.let { failedChecks(it) }
                    ?: "the server declined it"
                Log.i(TAG, "Auto check-in did not pass: $why")
                postNotification(context, transition, autoCheckedIn = false, detail = why)
            } else {
                Log.i(TAG, "Auto check-in succeeded via geofence")
                // Surface the action to the user — Play policy requires that
                // any background-triggered behavior visible to the user be
                // disclosed at the time it happens.
                postNotification(context, transition, autoCheckedIn = true)
            }
        } else {
            // Which gate stopped us, most specific first.
            val gate = when {
                !isEnter -> null
                snapshot.faceRequired -> "face verification is required by your org"
                location == null -> detail ?: "no GPS fix available"
                !wifiOk -> "not on office Wi-Fi (saw ${wifi?.ssid ?: "no network"})"
                else -> detail
            }
            Log.i(TAG, "Auto check-in not attempted: ${gate ?: "not an entry event"}")
            postNotification(context, transition, autoCheckedIn = false, detail = gate)
        }
    }

    /**
     * The required checks the server refused on, in plain words, or null if it
     * refused without saying which.
     */
    private fun failedChecks(response: com.attenddesk.data.api.CheckInResponse): String? =
        response.results
            .filter { it.required && !it.passed }
            .joinToString(", ") { humanReason(it) }
            .takeIf { it.isNotBlank() }

    /** Server reason codes rendered for someone reading a lock screen. */
    private fun humanReason(check: com.attenddesk.data.api.CheckResultDto): String =
        when (check.reason) {
            "low_accuracy" -> "GPS fix wasn't precise enough"
            "outside_geofence" -> "too far from the office"
            "missing_location" -> "no GPS fix was sent"
            "mock_location" -> "the location looked faked"
            "ssid_and_bssid_not_in_allowlist" -> "not on an office network"
            "device_bound_to_other_user" -> "this phone is registered to someone else"
            "missing_qr_token" -> "a QR scan is required"
            "missing_face_embedding" -> "a face scan is required"
            null, "" -> check.name
            else -> check.reason!!
        }

    /**
     * Retrofit throws on any non-2xx, and throwing discards the response body —
     * but that body is the ONLY place the server says which check it refused
     * on. All the notification could show was "HTTP 422", which named the
     * protocol and not the problem. Read the body back off the exception.
     */
    private fun describeFailure(t: Throwable): String {
        if (t is retrofit2.HttpException) {
            val body = runCatching { t.response()?.errorBody()?.string() }.getOrNull()
            if (!body.isNullOrBlank()) {
                runCatching { ERROR_JSON.decodeFromString<com.attenddesk.data.api.CheckInResponse>(body) }
                    .getOrNull()
                    ?.let { failedChecks(it) }
                    ?.let { return it }
            }
        }
        return shortError(t)
    }

    /**
     * Exception text trimmed to something readable on a lock screen. Falls back
     * to the class name, because the common background failures (token refresh,
     * no route to host) often carry no message at all.
     */
    private fun shortError(t: Throwable): String {
        val msg = t.message?.trim()?.takeIf { it.isNotEmpty() }
            ?: t::class.simpleName
            ?: "unknown error"
        return if (msg.length > 120) msg.take(117) + "…" else msg
    }

    /**
     * True when the phone is on the office network. Matches SSID or BSSID
     * against the cached office allowlist, the same either/or rule the server
     * applies. Returns false when WiFi can't be read (Android 13+ hides the
     * SSID without location permission) or when no allowlist is configured —
     * auto check-in should stay silent rather than fire on a guess.
     */
    private fun matchesOfficeWifi(
        wifi: com.attenddesk.checks.WifiSnapshot?,
        office: LocationPrefs.CachedOffice?,
    ): Boolean {
        if (office == null) return false
        if (office.allowedSsids.isEmpty() && office.allowedBssids.isEmpty()) return false
        val ssid = wifi?.ssid?.trim()?.removeSurrounding("\"")
        val bssid = wifi?.bssid?.trim()?.lowercase()
        val ssidOk = !ssid.isNullOrEmpty() && office.allowedSsids.any { it.equals(ssid, ignoreCase = true) }
        val bssidOk = !bssid.isNullOrEmpty() && office.allowedBssids.contains(bssid)
        return ssidOk || bssidOk
    }

    /**
     * [detail] says why auto check-in did not happen. Every failure in this
     * receiver is caught and logged, which made a refusal indistinguishable
     * from a success-then-silence from the outside: three releases were spent
     * guessing at causes the device already knew. Showing the reason on the
     * notification turns the phone itself into the diagnostic.
     */
    private fun postNotification(
        context: Context,
        transition: Int,
        autoCheckedIn: Boolean,
        detail: String? = null,
    ) {
        LocationNotifications.ensureChannels(context)
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return

        val (title, body, notifId) =
            if (transition == Geofence.GEOFENCE_TRANSITION_ENTER) {
                Triple(
                    if (autoCheckedIn) "TeamOS checked you in" else "You arrived at the office",
                    when {
                        autoCheckedIn -> "Auto check-in succeeded at the office geofence."
                        detail != null -> "Auto check-in skipped — $detail. Tap to open TeamOS."
                        else -> "Tap to check in."
                    },
                    LocationNotifications.NOTIF_ID_GEOFENCE_ENTER,
                )
            } else {
                Triple(
                    if (autoCheckedIn) "TeamOS checked you out" else "You left the office",
                    if (autoCheckedIn) "Auto check-out succeeded when you left the geofence."
                    else "Tap to check out.",
                    LocationNotifications.NOTIF_ID_GEOFENCE_EXIT,
                )
            }
        val contentIntent = PendingIntent.getActivity(
            context,
            notifId,
            Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_IMMUTABLE else 0,
        )
        val notif = NotificationCompat.Builder(context, LocationNotifications.CHANNEL_GEOFENCE)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(notifId, notif) }
    }

    private fun isMockLocation(location: android.location.Location): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            location.isMock
        } else {
            @Suppress("DEPRECATION") location.isFromMockProvider
        }
    }

    companion object {
        const val ACTION_GEOFENCE = "com.attenddesk.location.ACTION_GEOFENCE"
        private const val TAG = "GeofenceReceiver"

        /** Lenient on purpose: an error body is read for diagnostics, and a
         *  schema drift there must never cost us the reason it carries. */
        private val ERROR_JSON = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }

        /**
         * Play Services can deliver the same transition more than once — two
         * arrived 3 seconds apart in testing. While both were failing that was
         * invisible; the moment check-in succeeds it is two attendance records
         * for one arrival. hasCheckedInToday can't catch it, since the first
         * record isn't in the server's history before the second attempt reads it.
         */
        private const val ATTEMPT_DEBOUNCE_MS = 90_000L

        /** Ceiling on the high-accuracy fix request; see its call site. */
        private const val FIX_TIMEOUT_MS = 12_000L

        /** Office timezone — "today" must mean the working day, not the phone's. */
        private val DHAKA: java.time.ZoneId = java.time.ZoneId.of("Asia/Dhaka")

        fun isoNow(): String {
            val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            fmt.timeZone = TimeZone.getTimeZone("UTC")
            return fmt.format(Date())
        }
    }

    /**
     * Whether the server already has a successful CHECK_IN for [day] in the
     * office timezone. Asked of the server rather than tracked locally so a
     * check-in made by hand, on the web, or at the door counts too.
     *
     * Returns null when the server could not be asked. Callers fail CLOSED on
     * null — a missed auto check-in is a tap to fix, a duplicate one is an
     * attendance record somebody has to unpick — but null is reported to the
     * user where a confirmed yes is not, since only one of the two is a fault.
     */
    private suspend fun hasCheckedInToday(container: AppContainer, day: java.time.LocalDate): Boolean? {
        val events = runCatching { container.api.history(40).events }.getOrNull() ?: return null
        return events.any { e ->
            e.type == "CHECK_IN" && e.allChecksPassed &&
                runCatching {
                    java.time.Instant.parse(e.timestamp).atZone(DHAKA).toLocalDate() == day
                }.getOrDefault(false)
        }
    }
}
