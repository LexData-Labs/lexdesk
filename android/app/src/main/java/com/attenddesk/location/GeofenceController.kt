package com.attenddesk.location

import android.Manifest
import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.tasks.await

/**
 * Registers (and tears down) a single circular geofence around the org's
 * office. ENTER and EXIT events are routed to [GeofenceReceiver].
 *
 * Background location MUST be granted on Android 10+ for `addGeofences()` to
 * fire ENTER/EXIT while the app is not visible. We don't check it here — the
 * caller does, and surfaces the missing-permission UX.
 */
class GeofenceController(private val context: Context) {

    private val client = LocationServices.getGeofencingClient(context)
    private val tag = "GeofenceController"

    @SuppressLint("MissingPermission")
    suspend fun register(office: LocationPrefs.CachedOffice): Boolean {
        if (!hasRequiredPermissions()) {
            Log.w(tag, "Skipping geofence register — missing permission")
            return false
        }
        // Geofence API silently rejects very small radii on most devices
        // (the documented floor is 100m, though some OEMs are stricter).
        // Bump up to 100m so a misconfigured tiny office still produces
        // ENTER/EXIT events.
        val radius = maxOf(office.radiusMeters.toFloat(), 100f)
        if (radius != office.radiusMeters.toFloat()) {
            Log.w(tag, "Clamping geofence radius ${office.radiusMeters}m -> 100m")
        }
        val geofence = Geofence.Builder()
            .setRequestId(GEOFENCE_REQUEST_ID)
            .setCircularRegion(office.lat, office.lng, radius)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(
                Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT,
            )
            .setLoiteringDelay(60_000)
            .build()
        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofence(geofence)
            .build()
        return try {
            // remove the previous registration first so an office change
            // doesn't leave a stale fence in place.
            runCatching { client.removeGeofences(listOf(GEOFENCE_REQUEST_ID)).await() }
            client.addGeofences(request, pendingIntent(context)).await()
            true
        } catch (e: Exception) {
            Log.w(tag, "addGeofences failed: ${e.message}")
            false
        }
    }

    suspend fun unregister() {
        runCatching { client.removeGeofences(listOf(GEOFENCE_REQUEST_ID)).await() }
    }

    private fun hasRequiredPermissions(): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        val bg = if (Build.VERSION.SDK_INT >= 29) {
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_BACKGROUND_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED
        } else true
        return fine && bg
    }

    companion object {
        const val GEOFENCE_REQUEST_ID = "office_primary"

        private fun pendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, GeofenceReceiver::class.java).apply {
                action = GeofenceReceiver.ACTION_GEOFENCE
            }
            // FLAG_MUTABLE required on API 31+ because the Geofencing API
            // mutates the intent with the GeofencingEvent extras before
            // delivering it to our receiver.
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
            return PendingIntent.getBroadcast(context, 0, intent, flags)
        }
    }
}
