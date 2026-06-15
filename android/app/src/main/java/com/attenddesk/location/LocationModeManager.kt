package com.attenddesk.location

import android.content.Context
import android.util.Log
import com.attenddesk.data.api.PolicyResponse

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
        if (unchanged) {
            Log.i(tag, "Location config unchanged ($mode); skipping teardown")
            return
        }

        Log.i(tag, "Applying location mode = $mode")
        // Stop all running mechanisms first (clean slate) but keep prefs —
        // we're about to overwrite them with the new policy.
        stopAll()
        LocationPrefs.save(app, policy)
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
