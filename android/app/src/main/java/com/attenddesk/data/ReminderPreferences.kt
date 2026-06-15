package com.attenddesk.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

data class ReminderConfig(val enabled: Boolean, val hour: Int, val minute: Int)

/** Persists the daily attendance-reminder setting (off by default, 9:00 AM). */
class ReminderPreferences(private val dataStore: DataStore<Preferences>) {
    private val enabledKey = booleanPreferencesKey("reminder_enabled")
    private val hourKey = intPreferencesKey("reminder_hour")
    private val minuteKey = intPreferencesKey("reminder_minute")

    val flow: Flow<ReminderConfig> = dataStore.data.map { p ->
        ReminderConfig(
            enabled = p[enabledKey] ?: false,
            hour = p[hourKey] ?: 9,
            minute = p[minuteKey] ?: 0,
        )
    }

    suspend fun set(enabled: Boolean, hour: Int, minute: Int) {
        dataStore.edit { p ->
            p[enabledKey] = enabled
            p[hourKey] = hour
            p[minuteKey] = minute
        }
    }
}
