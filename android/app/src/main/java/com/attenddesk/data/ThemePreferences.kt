package com.attenddesk.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

enum class ThemeMode { System, Light, Dark }

/** Clock display preference, surfaced in the drawer as a 12h / 24h toggle. */
enum class TimeFormat { H12, H24 }

/**
 * Persists the user's theme + clock-format preferences. Theme defaults to
 * [ThemeMode.System]; clock defaults to [TimeFormat.H12] (matches the reference
 * app's default 12-hour display).
 */
class ThemePreferences(private val dataStore: DataStore<Preferences>) {
    private val themeModeKey = stringPreferencesKey("theme_mode")
    private val timeFormatKey = stringPreferencesKey("time_format")

    val themeModeFlow: Flow<ThemeMode> = dataStore.data.map { prefs ->
        when (prefs[themeModeKey]) {
            "light" -> ThemeMode.Light
            "dark"  -> ThemeMode.Dark
            else    -> ThemeMode.System
        }
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        dataStore.edit { prefs ->
            prefs[themeModeKey] = when (mode) {
                ThemeMode.System -> "system"
                ThemeMode.Light  -> "light"
                ThemeMode.Dark   -> "dark"
            }
        }
    }

    val timeFormatFlow: Flow<TimeFormat> = dataStore.data.map { prefs ->
        if (prefs[timeFormatKey] == "h24") TimeFormat.H24 else TimeFormat.H12
    }

    suspend fun setTimeFormat(format: TimeFormat) {
        dataStore.edit { prefs ->
            prefs[timeFormatKey] = if (format == TimeFormat.H24) "h24" else "h12"
        }
    }
}
