package com.attenddesk.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Caches the signed-in user's email and role for UI display.
 * Auth tokens are owned by Firebase Auth, not this class.
 */
class ProfileStore(private val dataStore: DataStore<Preferences>) {
    private val emailKey = stringPreferencesKey("email")
    private val roleKey = stringPreferencesKey("role")

    val emailFlow: Flow<String?> = dataStore.data.map { it[emailKey] }
    val roleFlow: Flow<String?> = dataStore.data.map { it[roleKey] }

    suspend fun save(email: String, role: String) {
        dataStore.edit { prefs ->
            prefs[emailKey] = email
            prefs[roleKey] = role
        }
    }

    suspend fun clear() {
        dataStore.edit { it.clear() }
    }
}
