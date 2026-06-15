package com.attenddesk.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.core.content.getSystemService
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.attenddesk.App
import com.attenddesk.data.api.LocationPingRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Periodic background-location worker. Runs every `periodicIntervalMinutes`
 * (clamped to WorkManager's 15-minute floor for periodic work). Reads ONE
 * location fix at BALANCED accuracy and posts it to /api/v1/me/location-ping.
 *
 * Never auto-retries on permission revocation — Result.success() is correct
 * because the next scheduled tick is the natural retry point.
 */
class PeriodicLocationWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    @SuppressLint("MissingPermission")
    override suspend fun doWork(): Result {
        val ctx = applicationContext
        val app = ctx.applicationContext as? App ?: return Result.success()

        val fine = ContextCompat.checkSelfPermission(
            ctx, Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        val bg = if (Build.VERSION.SDK_INT >= 29) {
            ContextCompat.checkSelfPermission(
                ctx, Manifest.permission.ACCESS_BACKGROUND_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED
        } else true
        if (!fine || !bg) {
            Log.i(TAG, "Skipping run — permissions not granted")
            return Result.success()
        }
        val lm = ctx.getSystemService<LocationManager>()
        if (lm?.isLocationEnabled != true) {
            Log.i(TAG, "Skipping run — location services off")
            return Result.success()
        }

        val location: Location = readLocation(ctx) ?: return Result.success()

        return try {
            app.container.api.locationPing(
                LocationPingRequest(
                    lat = location.latitude,
                    lng = location.longitude,
                    accuracy = location.accuracy.toDouble(),
                    capturedAt = GeofenceReceiver.isoNow(),
                    source = "periodic",
                    isMockLocation = isMock(location),
                ),
            )
            Result.success()
        } catch (e: retrofit2.HttpException) {
            if (e.code() == 403) {
                // Server says feature is disabled — cancel future runs so we
                // don't keep banging on /location-ping. The next foreground
                // policy fetch will re-apply whatever mode is current.
                cancel(ctx)
                Result.success()
            } else {
                Log.w(TAG, "ping failed ${e.code()}; retry")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.w(TAG, "ping crashed: ${e.message}; retry")
            Result.retry()
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun readLocation(ctx: Context): Location? {
        val fused = LocationServices.getFusedLocationProviderClient(ctx)
        return suspendCancellableCoroutine { cont ->
            val task = fused.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, null)
            task.addOnSuccessListener { cont.resume(it) }
            task.addOnFailureListener { cont.resume(null) }
        }
    }

    private fun isMock(location: Location): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) location.isMock
        else @Suppress("DEPRECATION") location.isFromMockProvider
    }

    companion object {
        const val WORK_NAME = "attenddesk_location_periodic"
        private const val TAG = "PeriodicLocWorker"

        fun schedule(context: Context, intervalMinutes: Int) {
            // WorkManager's minimum periodic interval is 15m — clamp.
            val minutes = intervalMinutes.coerceAtLeast(15).toLong()
            val request = PeriodicWorkRequestBuilder<PeriodicLocationWorker>(
                minutes, TimeUnit.MINUTES,
            )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request,
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }
    }
}
