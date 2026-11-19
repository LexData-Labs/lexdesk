package com.attenddesk.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/**
 * Per-user auto check-in setting (off by default).
 *
 * Deliberately separate from LocationPrefs: that holds a snapshot of
 * server-sent policy, whereas this is the person's own choice. When this is on,
 * the app registers geofences itself rather than waiting for the org-wide
 * LEXDESK_LOCATION_MODE to say "geofence".
 */
class AutoCheckInPreferences(private val dataStore: DataStore<Preferences>) {
    private val enabledKey = booleanPreferencesKey("auto_checkin_enabled")
    private val lastAttemptKey = longPreferencesKey("auto_checkin_last_attempt_ms")

    val flow: Flow<Boolean> = dataStore.data.map { it[enabledKey] ?: false }

    suspend fun set(enabled: Boolean) {
        dataStore.edit { it[enabledKey] = enabled }
    }

    /**
     * Elapsed-realtime stamp of the last auto check-in attempt, used to drop
     * duplicate geofence broadcasts. SystemClock.elapsedRealtime, not wall
     * clock, so a clock change or timezone shift can't make an old attempt look
     * like it is in the future and suppress a real arrival indefinitely. It
     * resets to 0 on reboot, which at worst allows one extra attempt.
     */
    suspend fun lastAttemptAt(): Long = dataStore.data.map { it[lastAttemptKey] ?: 0L }.first()

    suspend fun markAttempt(elapsedRealtimeMs: Long) {
        dataStore.edit { it[lastAttemptKey] = elapsedRealtimeMs }
    }
}
