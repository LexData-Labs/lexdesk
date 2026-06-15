package com.attenddesk.checks

data class WifiSnapshot(
    val ssid: String?,
    val bssid: String?,
    val reason: String? = null,
)

data class GpsSnapshot(
    val lat: Double?,
    val lng: Double?,
    val accuracyMeters: Double?,
    val isMock: Boolean,
    val reason: String? = null,
)

data class CheckBundle(
    val wifi: WifiSnapshot?,
    val gps: GpsSnapshot?,
)
