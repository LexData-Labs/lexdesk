package com.attenddesk.checks

import com.attenddesk.data.api.VerifyFeaturesDto
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

/**
 * Runs WiFi + GPS in parallel. QR and Face are interactive and gathered by the
 * UI flow (scan camera, capture selfie), then merged at submit time.
 *
 * When SUPER_ADMIN has disabled a verify feature for the org, skip gathering
 * that signal entirely — avoids unnecessary Location permission noise and
 * keeps the UI's "no data" rows in sync with what the server will actually
 * check. Pass `null` (the default) to gather both, which is the safe pre-fetch
 * behavior when features haven't loaded yet.
 */
class AntiCheatRunner(
    private val wifiCheck: WifiCheck,
    private val gpsCheck: GpsCheck,
) {
    suspend fun gatherAmbient(verify: VerifyFeaturesDto? = null): CheckBundle = coroutineScope {
        val gatherWifi = verify?.wifi != false
        val gatherGps = verify?.gps != false
        val wifi = if (gatherWifi) async { wifiCheck.snapshot() } else null
        val gps = if (gatherGps) async { gpsCheck.snapshot() } else null
        CheckBundle(wifi = wifi?.await(), gps = gps?.await())
    }
}
