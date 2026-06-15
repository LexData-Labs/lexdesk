package com.attenddesk.data.api

import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface AttendApi {
    @POST("auth/set-password")
    suspend fun setPassword(@Body body: SetPasswordRequest)

    @GET("me")
    suspend fun me(): MeResponse

    @GET("me/policy")
    suspend fun policy(): PolicyResponse

    @GET("me/history")
    suspend fun history(@Query("limit") limit: Int = 30): HistoryResponse

    @POST("me/enroll-face")
    suspend fun enrollFace(@Body body: EnrollFaceRequest)

    @POST("me/check-in")
    suspend fun checkIn(@Body body: CheckInRequest): CheckInResponse

    @Multipart
    @POST("me/photo")
    suspend fun uploadPhoto(@Part file: MultipartBody.Part): PhotoUploadResponse

    @DELETE("me/photo")
    suspend fun deletePhoto()

    @DELETE("me/data")
    suspend fun deleteData()

    @GET("me/leave-requests")
    suspend fun listMyLeaveRequests(): LeaveRequestListResponse

    @POST("me/leave-requests")
    suspend fun submitLeaveRequest(@Body body: LeaveRequestSubmitRequest): LeaveRequestSubmitResponse

    @DELETE("me/leave-requests/{id}")
    suspend fun cancelLeaveRequest(@Path("id") id: String)

    @POST("me/location-ping")
    suspend fun locationPing(@Body body: LocationPingRequest): LocationPingResponse
}
