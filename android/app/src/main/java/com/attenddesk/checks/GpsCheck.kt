package com.attenddesk.checks

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.core.content.getSystemService
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

class GpsCheck(private val app: Context) {

    @SuppressLint("MissingPermission")
    suspend fun snapshot(): GpsSnapshot {
        val fineGranted = ContextCompat.checkSelfPermission(
            app, Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        if (!fineGranted) {
            return GpsSnapshot(null, null, null, false, "missing_fine_location")
        }
        val lm = app.getSystemService<LocationManager>()
        if (lm?.isLocationEnabled != true) {
            return GpsSnapshot(null, null, null, false, "location_services_off")
        }

        val fused = LocationServices.getFusedLocationProviderClient(app)
        return suspendCancellableCoroutine { cont ->
            val task = fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
            task.addOnSuccessListener { loc ->
                if (loc == null) {
                    cont.resume(GpsSnapshot(null, null, null, false, "no_fix"))
                } else {
                    val isMock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        loc.isMock
                    } else {
                        @Suppress("DEPRECATION") loc.isFromMockProvider
                    }
                    cont.resume(
                        GpsSnapshot(
                            lat = loc.latitude,
                            lng = loc.longitude,
                            accuracyMeters = loc.accuracy.toDouble(),
                            isMock = isMock,
                            reason = if (isMock) "mock_location" else null,
                        ),
                    )
                }
            }
            task.addOnFailureListener { e ->
                cont.resume(GpsSnapshot(null, null, null, false, "fix_error:${e.message}"))
            }
        }
    }
}
