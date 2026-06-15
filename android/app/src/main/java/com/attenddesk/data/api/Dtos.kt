package com.attenddesk.data.api

import kotlinx.serialization.Serializable

@Serializable
data class SetPasswordRequest(val newPassword: String)

@Serializable
data class MeResponse(
    val id: String,
    val email: String,
    val name: String,
    val role: String,
    val mustChangePassword: Boolean,
    val faceEnrolledAt: String? = null,
    val photoUrl: String? = null,
    val photoUpdatedAt: String? = null,
)

@Serializable
data class PhotoUploadResponse(val ok: Boolean, val photoUrl: String? = null)

@Serializable
data class PolicyDto(
    val requireWifi: Boolean,
    val requireGeo: Boolean,
    val requireQr: Boolean,
    val requireFace: Boolean,
    val faceThreshold: Double,
    val gpsAccuracyMaxMeters: Int,
)

@Serializable
data class OfficeDto(
    val id: String,
    val name: String,
    val lat: Double,
    val lng: Double,
    val radiusMeters: Int,
    val allowedSsids: List<String>,
    val allowedBssids: List<String>,
)

@Serializable
data class VerifyFeaturesDto(
    val wifi: Boolean = true,
    val gps: Boolean = true,
    val qr: Boolean = true,
    val face: Boolean = true,
)

@Serializable
data class ServiceFeaturesDto(
    val kiosk: Boolean = true,
    val photos: Boolean = true,
    val faceEnrollment: Boolean = true,
    val history: Boolean = true,
    val leaveRequests: Boolean = true,
)

@Serializable
data class LocationFeatureDto(
    val mode: String = "manual", // "manual" | "geofence" | "periodic" | "continuous"
    val periodicIntervalMinutes: Int = 15,
    val continuousIntervalSeconds: Int = 60,
)

@Serializable
data class FeaturesDto(
    val verify: VerifyFeaturesDto = VerifyFeaturesDto(),
    val service: ServiceFeaturesDto = ServiceFeaturesDto(),
    val location: LocationFeatureDto = LocationFeatureDto(),
)

@Serializable
data class LocationPingRequest(
    val lat: Double,
    val lng: Double,
    val accuracy: Double,
    val capturedAt: String, // ISO-8601
    val source: String, // "periodic" | "continuous" | "geofence_enter" | "geofence_exit"
    val isMockLocation: Boolean? = null,
)

@Serializable
data class LocationPingResponse(val ok: Boolean = false)

@Serializable
data class PolicyResponse(
    val policy: PolicyDto?,
    val office: OfficeDto?,
    val features: FeaturesDto = FeaturesDto(),
    val faceEmbeddingDim: Int = 192,
    val faceEmbeddingModel: String = "mobilefacenet-v1",
)

@Serializable
data class HistoryEvent(
    val id: String,
    val type: String,
    val timestamp: String,
    val allChecksPassed: Boolean,
    val lat: Double? = null,
    val lng: Double? = null,
    val ssid: String? = null,
    val faceMatchScore: Double? = null,
    val isLate: Boolean = false,
    val isEarly: Boolean = false,
    val scheduledStart: String? = null,
    val scheduledEnd: String? = null,
)

@Serializable
data class HistoryResponse(val events: List<HistoryEvent>)

@Serializable
data class EnrollFaceRequest(val embeddings: List<String>)

@Serializable
data class CheckInRequest(
    val type: String, // "CHECK_IN" or "CHECK_OUT"
    val lat: Double? = null,
    val lng: Double? = null,
    val accuracyMeters: Double? = null,
    val isMockLocation: Boolean? = null,
    val ssid: String? = null,
    val bssid: String? = null,
    val qrToken: String? = null,
    val faceEmbeddingB64: String? = null,
    val faceLivenessOk: Boolean? = null,
)

@Serializable
data class CheckResultDto(
    val name: String,
    val required: Boolean,
    val passed: Boolean,
    val reason: String? = null,
)

@Serializable
data class CheckInResponse(
    val ok: Boolean,
    val eventId: String? = null,
    val results: List<CheckResultDto> = emptyList(),
    val faceMatchScore: Double? = null,
    val isLate: Boolean = false,
    val isEarly: Boolean = false,
    val scheduledStart: String? = null,
    val scheduledEnd: String? = null,
)

@Serializable
data class LeaveRequestDto(
    val id: String,
    val uid: String,
    val userEmail: String,
    val userName: String,
    val fromDay: String,
    val toDay: String,
    val totalDays: Int,
    val subject: String = "",
    val details: String = "",
    val status: String, // "pending" | "approved" | "rejected" | "cancelled"
    val createdAt: String? = null,
    val decidedAt: String? = null,
    val decidedBy: String? = null,
    val decisionNote: String? = null,
)

@Serializable
data class LeaveRequestListResponse(val requests: List<LeaveRequestDto> = emptyList())

@Serializable
data class LeaveRequestSubmitRequest(
    val fromDay: String,
    val toDay: String,
    val subject: String,
    val details: String,
)

@Serializable
data class LeaveRequestSubmitResponse(val id: String)
