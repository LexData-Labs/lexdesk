package com.attenddesk.location

import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import android.content.Context
import com.attenddesk.data.api.PolicyResponse
import kotlinx.coroutines.flow.first

/**
 * Compact, disk-persisted slice of the policy that the location subsystem
 * needs to re-bootstrap itself without a network round trip. Required so
 * BootReceiver can re-register geofences / re-start the FGS before the
 * network is up.
 *
 * Kept in a SEPARATE DataStore from the main `attenddesk_prefs` (which holds
 * unrelated profile state) so unrelated concerns can be cleared independently.
 */
private val Context.locationDataStore by preferencesDataStore(name = "attenddesk_location")

object LocationPrefs {
    private val K_MODE = stringPreferencesKey("mode")
    private val K_PERIODIC = intPreferencesKey("periodicIntervalMinutes")
    private val K_CONTINUOUS = intPreferencesKey("continuousIntervalSeconds")
    private val K_FACE_REQUIRED = booleanPreferencesKey("faceRequired")
    private val K_OFFICE_LAT = doublePreferencesKey("officeLat")
    private val K_OFFICE_LNG = doublePreferencesKey("officeLng")
    private val K_OFFICE_RADIUS = intPreferencesKey("officeRadiusMeters")
    private val K_OFFICE_ID = stringPreferencesKey("officeId")

    suspend fun save(context: Context, policy: PolicyResponse) {
        val office = policy.office
        val face = policy.features.verify.face
        context.locationDataStore.edit { p ->
            p[K_MODE] = policy.features.location.mode
            p[K_PERIODIC] = policy.features.location.periodicIntervalMinutes
            p[K_CONTINUOUS] = policy.features.location.continuousIntervalSeconds
            p[K_FACE_REQUIRED] = face
            if (office != null) {
                p[K_OFFICE_ID] = office.id
                p[K_OFFICE_LAT] = office.lat
                p[K_OFFICE_LNG] = office.lng
                p[K_OFFICE_RADIUS] = office.radiusMeters
            } else {
                p.remove(K_OFFICE_ID)
                p.remove(K_OFFICE_LAT)
                p.remove(K_OFFICE_LNG)
                p.remove(K_OFFICE_RADIUS)
            }
        }
    }

    /** Reset to 'manual' / null office. Called on logout and feature_disabled 403. */
    suspend fun clear(context: Context) {
        context.locationDataStore.edit { p ->
            p[K_MODE] = "manual"
            p.remove(K_OFFICE_ID)
            p.remove(K_OFFICE_LAT)
            p.remove(K_OFFICE_LNG)
            p.remove(K_OFFICE_RADIUS)
        }
    }

    suspend fun load(context: Context): Snapshot {
        val p = context.locationDataStore.data.first()
        val mode = p[K_MODE] ?: "manual"
        val periodic = p[K_PERIODIC] ?: 15
        val continuous = p[K_CONTINUOUS] ?: 60
        val faceRequired = p[K_FACE_REQUIRED] ?: true
        val officeId = p[K_OFFICE_ID]
        val officeLat = p[K_OFFICE_LAT]
        val officeLng = p[K_OFFICE_LNG]
        val officeRadius = p[K_OFFICE_RADIUS]
        val office = if (officeId != null && officeLat != null && officeLng != null && officeRadius != null) {
            CachedOffice(officeId, officeLat, officeLng, officeRadius)
        } else null
        return Snapshot(mode, periodic, continuous, faceRequired, office)
    }

    data class Snapshot(
        val mode: String,
        val periodicIntervalMinutes: Int,
        val continuousIntervalSeconds: Int,
        val faceRequired: Boolean,
        val office: CachedOffice?,
    )

    data class CachedOffice(
        val id: String,
        val lat: Double,
        val lng: Double,
        val radiusMeters: Int,
    )
}
