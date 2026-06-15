package com.attenddesk.checks

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.LinkAddress
import android.net.LinkProperties
import android.net.NetworkCapabilities
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.core.content.getSystemService

/**
 * Reads the connected WiFi SSID/BSSID across Android API levels, with a gateway-MAC
 * fallback for the case where SSID is hidden (no/insufficient permission, location off).
 *
 * API constraints:
 *   - API 27 (8.1)+ : SSID/BSSID readable only with ACCESS_FINE_LOCATION AND location services ON
 *   - API 31 (12)+ : prefer NetworkCapabilities.transportInfo over WifiManager.connectionInfo
 *   - API 33 (13)+ : also NEARBY_WIFI_DEVICES runtime permission
 */
class WifiCheck(private val app: Context) {

    fun snapshot(): WifiSnapshot {
        val fineGranted = ContextCompat.checkSelfPermission(
            app, Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        val nearbyGranted = if (Build.VERSION.SDK_INT >= 33) {
            ContextCompat.checkSelfPermission(
                app, Manifest.permission.NEARBY_WIFI_DEVICES,
            ) == PackageManager.PERMISSION_GRANTED
        } else true

        if (!fineGranted) {
            return WifiSnapshot(null, null, reason = "missing_fine_location")
        }
        if (!nearbyGranted) {
            return WifiSnapshot(null, null, reason = "missing_nearby_wifi_devices")
        }

        val info = readWifiInfo()
        val ssid = info?.normalizedSsid()
        val bssid = info?.bssid?.lowercase()
        val ssidUsable = !ssid.isNullOrBlank() && ssid != "<unknown ssid>"
        val bssidUsable = !bssid.isNullOrBlank() && bssid != "02:00:00:00:00:00"

        // Happy path: at least one of SSID / BSSID is readable.
        if (ssidUsable || bssidUsable) {
            return WifiSnapshot(
                ssid = ssid?.takeIf { ssidUsable },
                bssid = bssid?.takeIf { bssidUsable },
                reason = null,
            )
        }

        // Both SSID and BSSID are redacted by the OS (Android privacy mask,
        // MIUI / OEM privacy mode, etc.). Fall back to the default gateway IP,
        // which is exposed via LinkProperties without any location permission.
        // We surface it as the SSID so the admin can add it to the allowed
        // SSIDs list — e.g. "192.168.1.1".
        val gw = defaultGatewayIp()
        if (gw != null) {
            return WifiSnapshot(
                ssid = gw,
                bssid = null,
                reason = "gateway_fallback",
            )
        }

        return WifiSnapshot(
            ssid = null,
            bssid = null,
            reason = "unreadable(raw_ssid=${info?.ssid ?: "null"}, raw_bssid=${info?.bssid ?: "null"})",
        )
    }

    @SuppressLint("MissingPermission")
    private fun readWifiInfo(): WifiInfo? {
        val cm = app.getSystemService<ConnectivityManager>() ?: return null
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val activeNetwork = cm.activeNetwork ?: return null
            val caps = cm.getNetworkCapabilities(activeNetwork) ?: return null
            val transport = caps.transportInfo
            if (transport is WifiInfo) return transport
        }
        @Suppress("DEPRECATION")
        val wm = app.getSystemService<WifiManager>() ?: return null
        @Suppress("DEPRECATION")
        return wm.connectionInfo
    }

    private fun WifiInfo.normalizedSsid(): String? {
        val raw = this.ssid ?: return null
        return raw.removePrefix("\"").removeSuffix("\"").trim()
    }

    /**
     * Returns the IP address of the default gateway for the active network, or
     * null if it can't be resolved. Available via LinkProperties without any
     * runtime permission (no fine-location dependency), so it works even when
     * the OS or OEM has masked the SSID/BSSID.
     */
    private fun defaultGatewayIp(): String? {
        return try {
            val cm = app.getSystemService<ConnectivityManager>() ?: return null
            val active = cm.activeNetwork ?: return null
            val lp: LinkProperties = cm.getLinkProperties(active) ?: return null
            lp.routes
                .firstOrNull { it.isDefaultRoute }
                ?.gateway?.hostAddress
        } catch (_: Throwable) {
            null
        }
    }

    @Suppress("unused")
    private fun LinkAddress.isLocalLink() = address.isLinkLocalAddress
}
