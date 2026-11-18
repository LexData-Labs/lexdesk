package com.attenddesk.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import kotlinx.coroutines.flow.Flow
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

    val flow: Flow<Boolean> = dataStore.data.map { it[enabledKey] ?: false }

    suspend fun set(enabled: Boolean) {
        dataStore.edit { it[enabledKey] = enabled }
    }
}
