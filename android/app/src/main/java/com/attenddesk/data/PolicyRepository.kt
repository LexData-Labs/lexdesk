package com.attenddesk.data

import com.attenddesk.data.api.AttendApi
import com.attenddesk.data.api.PolicyResponse
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.HttpException

/**
 * Thrown when the server rejects a request because the org's SUPER_ADMIN has
 * disabled that feature. Callers catch this to render a feature-disabled UI
 * (e.g. the dashboard's "history disabled" card) instead of a generic load
 * error. The thrown `feature` is the dotted path from the server's
 * `{ error, feature }` response — e.g. "service.history", "verify.face".
 */
class FeatureDisabledException(val feature: String) : RuntimeException("feature_disabled:$feature")

/**
 * Return the dotted feature path when [t] is a Retrofit 403 carrying the
 * server's standard `{ error: "feature_disabled", feature: "..." }` body.
 * Otherwise null. Callers use this in catch blocks to distinguish a
 * SUPER_ADMIN-disabled feature from a real network/server error.
 */
fun parseFeatureDisabled(t: Throwable): String? {
    val http = t as? HttpException ?: return null
    if (http.code() != 403) return null
    val raw = runCatching { http.response()?.errorBody()?.string() }.getOrNull() ?: return null
    val obj = runCatching { Json.parseToJsonElement(raw).jsonObject }.getOrNull() ?: return null
    val error = obj["error"]?.jsonPrimitive?.contentOrNull
    if (error != "feature_disabled") return null
    return obj["feature"]?.jsonPrimitive?.contentOrNull
}

class PolicyRepository(private val api: AttendApi) {
    @Volatile private var cached: PolicyResponse? = null

    suspend fun get(forceRefresh: Boolean = false): PolicyResponse {
        if (!forceRefresh) cached?.let { return it }
        val fresh = api.policy()
        cached = fresh
        return fresh
    }

    /**
     * Drop the in-memory cache. Callers should invalidate when they detect a
     * 403 mid-session so the next get() returns fresh SUPER_ADMIN-controlled
     * features rather than the stale belief that led to the 403.
     */
    fun invalidate() {
        cached = null
    }
}
