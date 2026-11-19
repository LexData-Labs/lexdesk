package com.attenddesk.location

import android.content.Context
import android.util.Log
import com.attenddesk.data.api.PolicyResponse
import kotlinx.coroutines.flow.first

/**
 * Single owner of "which background-location mechanism is currently active".
 *
 * Call [applyMode] every time a fresh policy arrives — initial app open,
 * pull-to-refresh, post-check-in re-fetch. It will tear down whatever was
 * running and stand up the right mechanism for the new mode. Idempotent.
 *
 * Reads from / writes to [LocationPrefs] so BootReceiver and individual
 * mode handlers can read the same snapshot without a round trip.
 */
class LocationModeManager(private val app: Context) {

    private val tag = "LocationModeManager"

    /** Apply the mode encoded in [policy] and persist a snapshot for BootReceiver. */
    suspend fun applyMode(policy: PolicyResponse) {
        val mode = policy.features.location.mode

        // Idempotency: if the incoming policy matches the cached snapshot
        // byte-for-byte on every field that drives a mode handler, do
        // nothing. Without this, every resume-triggered refresh would tear
        // down + restart the FGS / geofence / worker even when nothing
        // changed — making the continuous-mode notification flicker once
        // per app resume.
        val cached = runCatching { LocationPrefs.load(app) }.getOrNull()
        val incomingOffice = policy.office
        val unchanged = cached != null &&
            cached.mode == mode &&
            cached.periodicIntervalMinutes == policy.features.location.periodicIntervalMinutes &&
            cached.continuousIntervalSeconds == policy.features.location.continuousIntervalSeconds &&
            cached.office?.id == incomingOffice?.id &&
            cached.office?.lat == incomingOffice?.lat &&
            cached.office?.lng == incomingOffice?.lng &&
            cached.office?.radiusMeters == incomingOffice?.radiusMeters
        // Persist the snapshot unconditionally, BEFORE the early return below.
        //
        // That return guards tearing down and restarting location mechanisms,
        // which is all it was ever meant to do. But it used to skip this save
        // too, and `unchanged` only compares mode, intervals and office
        // geometry — so every policy field outside that list (face and Wi-Fi
        // requirements, holidays, the Wi-Fi allowlist) stopped reaching disk
        // the moment the mode and office stood still, which is always.
        //
        // DataStore outlives an app update, so a stale faceRequired=true could
        // survive reinstalls indefinitely and keep blocking auto check-in long
        // after the server stopped asking for a face. Saving is a cheap,
        // idempotent write; only the restart needs guarding.
        LocationPrefs.save(app, policy)

        if (unchanged) {
            Log.i(tag, "Location config unchanged ($mode); skipping teardown")
            // Still assert the user's geofence: an app update or reboot drops
            // registrations even when the policy behind them never moved.
            ensureUserGeofence(cached?.office)
            return
        }

        Log.i(tag, "Applying location mode = $mode")
        // Stop all running mechanisms first (clean slate). Prefs are already
        // written above; stopAll does not read them.
        stopAll()
        when (mode) {
            "manual" -> {
                /* nothing to do */
            }
            "geofence" -> {
                val office = policy.office
                if (office == null) {
                    Log.w(tag, "Geofence mode but no office configured; skipping registration")
                    return
                }
                GeofenceController(app).register(
                    LocationPrefs.CachedOffice(
                        id = office.id,
                        lat = office.lat,
                        lng = office.lng,
                        radiusMeters = office.radiusMeters,
                    ),
                )
            }
            "periodic" -> {
                PeriodicLocationWorker.schedule(app, policy.features.location.periodicIntervalMinutes)
            }
            "continuous" -> {
                LocationForegroundService.start(app, policy.features.location.continuousIntervalSeconds)
            }
            else -> Log.w(tag, "Unknown mode '$mode'; treating as manual")
        }
        ensureUserGeofence(policy.office?.let {
            LocationPrefs.CachedOffice(it.id, it.lat, it.lng, it.radiusMeters)
        })
    }

    /**
     * Re-register the geofence when the user has auto check-in switched on.
     *
     * Auto check-in is a per-user choice and does not depend on the org-wide
     * mode, which is "manual" for most orgs. But [applyMode] and [applyCached]
     * both call [stopAll] first, so every app launch, policy refresh and reboot
     * quietly removed the geofence the Settings toggle had registered — the
     * feature worked until the next time the app was opened, then stopped with
     * no sign of why.
     */
    private suspend fun ensureUserGeofence(office: LocationPrefs.CachedOffice?) {
        val on = runCatching {
            val app = this.app.applicationContext as? com.attenddesk.App ?: return
            app.container.autoCheckInPrefs.flow.first()
        }.getOrDefault(false)
        if (!on) return
        val target = office ?: runCatching { LocationPrefs.load(app).office }.getOrNull()
        if (target == null) {
            Log.w(tag, "Auto check-in is on but no office is cached; cannot register")
            return
        }
        val ok = GeofenceController(app).register(target)
        Log.i(tag, "Auto check-in on — geofence re-registered: $ok")
    }

    /**
     * Re-apply the cached snapshot — used by BootReceiver before the network
     * is necessarily up. Skips any mode that requires server data we don't
     * have cached.
     */
    suspend fun applyCached() {
        val snap = LocationPrefs.load(app)
        Log.i(tag, "Applying cached mode = ${snap.mode}")
        stopAll()
        when (snap.mode) {
            "manual" -> { /* nothing */ }
            "geofence" -> {
                val office = snap.office
                if (office == null) {
                    Log.w(tag, "Cached geofence mode but no office; skipping")
                    return
                }
                GeofenceController(app).register(office)
            }
            "periodic" -> PeriodicLocationWorker.schedule(app, snap.periodicIntervalMinutes)
            "continuous" -> LocationForegroundService.start(app, snap.continuousIntervalSeconds)
            else -> Log.w(tag, "Unknown cached mode '${snap.mode}'")
        }
        // Reboot also drops registered geofences, so the user's own toggle has
        // to put it back here too.
        ensureUserGeofence(snap.office)
    }

    /**
     * Tear down every background mechanism AND reset the cached snapshot to
     * 'manual' so BootReceiver won't re-launch anything after a reboot.
     * Called on logout and when the server returns 403 mid-run.
     */
    suspend fun teardownAll() {
        stopAll()
        runCatching { LocationPrefs.clear(app) }
    }

    /** Stop running mechanisms without touching the persisted snapshot. */
    private suspend fun stopAll() {
        runCatching { GeofenceController(app).unregister() }
        runCatching { PeriodicLocationWorker.cancel(app) }
        runCatching { LocationForegroundService.stop(app) }
    }
}
