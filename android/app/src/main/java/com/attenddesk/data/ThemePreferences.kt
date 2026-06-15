package com.attenddesk.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

enum class ThemeMode { System, Light, Dark }

/**
 * Persists the user's theme preference. Defaults to [ThemeMode.System] so a
 * fresh install follows the OS setting until the user opts in.
 */
class ThemePreferences(private val dataStore: DataStore<Preferences>) {
    private val themeModeKey = stringPreferencesKey("theme_mode")

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
}
