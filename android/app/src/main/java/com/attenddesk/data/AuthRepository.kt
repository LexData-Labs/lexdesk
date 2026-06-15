package com.attenddesk.data

import com.attenddesk.data.api.AttendApi
import com.attenddesk.data.api.MeResponse
import com.attenddesk.data.api.SetPasswordRequest
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.tasks.await

data class LoginResult(val me: MeResponse)

class AuthRepository(
    private val api: AttendApi,
    private val profileStore: ProfileStore,
) {
    private val firebaseAuth: FirebaseAuth get() = FirebaseAuth.getInstance()

    suspend fun login(email: String, password: String): LoginResult {
        firebaseAuth.signInWithEmailAndPassword(email.trim().lowercase(), password).await()
        try {
            // Force a fresh ID token so custom claims (role, orgId) are present.
            firebaseAuth.currentUser?.getIdToken(true)?.await()
            val me = api.me()
            profileStore.save(email = me.email, role = me.role)
            return LoginResult(me)
        } catch (t: Throwable) {
            // Firebase has already persisted the auth state. If a post-signIn step
            // fails, sign out so the user isn't left with a zombie session that
            // auto-logs-in on relaunch (with no profile cached).
            android.util.Log.w("AuthRepository", "Post-signIn step failed; signing out", t)
            runCatching { firebaseAuth.signOut() }
            throw t
        }
    }

    suspend fun setPassword(new: String) {
        api.setPassword(SetPasswordRequest(newPassword = new))
        // Server revoked refresh tokens. Sign out locally so AppNav lands on /login
        // with a clean Firebase Auth state for the user to re-enter their new password.
        // Do NOT call getIdToken(true) here — refresh tokens are now invalid and the
        // call will throw, which would mask the successful password change.
        try {
            firebaseAuth.signOut()
        } catch (_: Throwable) {
            // ignore — even if signOut throws, the API call already succeeded.
        }
    }

    suspend fun logout() {
        firebaseAuth.signOut()
        profileStore.clear()
    }
}
