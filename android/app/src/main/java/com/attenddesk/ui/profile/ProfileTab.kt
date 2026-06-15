package com.attenddesk.ui.profile

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Face
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import com.attenddesk.AppContainer
import com.attenddesk.data.ThemeMode
import com.attenddesk.data.api.FeaturesDto
import com.attenddesk.data.api.MeResponse
import com.attenddesk.data.parseFeatureDisabled
import com.attenddesk.ui.components.ChipTone
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.components.StatusChip
import com.attenddesk.ui.components.ThemeModeToggle
import com.attenddesk.ui.components.toneColors
import com.attenddesk.ui.theme.Brand500
import com.attenddesk.ui.theme.Brand700
import com.attenddesk.ui.theme.DangerFg
import com.attenddesk.util.ImageCompress
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.text.SimpleDateFormat
import java.time.OffsetDateTime
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileTab(
    container: AppContainer,
    onOpenFaceEnroll: () -> Unit,
    onChangePassword: () -> Unit,
    onLoggedOut: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var me by remember { mutableStateOf<MeResponse?>(null) }
    var features by remember { mutableStateOf(FeaturesDto()) }
    var refreshing by remember { mutableStateOf(false) }
    var photoBusy by remember { mutableStateOf(false) }
    var photoError by remember { mutableStateOf<String?>(null) }
    var showPhotoSheet by remember { mutableStateOf(false) }
    // Tracks the FileProvider URI we handed to the camera intent so we can read
    // back the bytes after capture. Camera returns only a Boolean — the URI
    // is ours to keep.
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
    val role by container.profileStore.roleFlow.collectAsState(initial = null)
    val email by container.profileStore.emailFlow.collectAsState(initial = null)
    val themeMode by container.themePrefs.themeModeFlow.collectAsState(initial = ThemeMode.System)

    suspend fun load() {
        try { me = container.api.me() } catch (_: Throwable) { /* keep cached */ }
        // Always force-refresh: the in-memory cache would otherwise show
        // SUPER_ADMIN-disabled features as enabled until cold restart.
        try { features = container.policyRepo.get(forceRefresh = true).features } catch (_: Throwable) { /* keep cached */ }
    }

    fun uploadFromUri(uri: Uri) {
        photoBusy = true
        photoError = null
        scope.launch {
            try {
                val bytes = withContext(Dispatchers.IO) {
                    ImageCompress.compressForUpload(context, uri)
                }
                val body = bytes.toRequestBody("image/jpeg".toMediaType())
                val part = MultipartBody.Part.createFormData("file", "photo.jpg", body)
                container.api.uploadPhoto(part)
                load()
            } catch (e: Throwable) {
                if (parseFeatureDisabled(e) != null) {
                    // SUPER_ADMIN disabled photos mid-session. Invalidate the
                    // policy cache and reload so the UI hides the photo
                    // controls instead of showing a generic error.
                    container.policyRepo.invalidate()
                    load()
                    photoError = "Profile photos have been disabled for your organization."
                } else {
                    android.util.Log.w("ProfileTab", "photo upload failed", e)
                    photoError = "Couldn't upload photo. Try again."
                }
            } finally {
                photoBusy = false
            }
        }
    }

    fun removePhoto() {
        photoBusy = true
        photoError = null
        scope.launch {
            try {
                container.api.deletePhoto()
                load()
            } catch (e: Throwable) {
                if (parseFeatureDisabled(e) != null) {
                    container.policyRepo.invalidate()
                    load()
                    photoError = "Profile photos have been disabled for your organization."
                } else {
                    android.util.Log.w("ProfileTab", "photo delete failed", e)
                    photoError = "Couldn't remove photo. Try again."
                }
            } finally {
                photoBusy = false
            }
        }
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri != null) uploadFromUri(uri)
    }
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture(),
    ) { success ->
        val uri = pendingCameraUri
        pendingCameraUri = null
        if (success && uri != null) uploadFromUri(uri)
    }

    LaunchedEffect(Unit) { scope.launch { load() } }

    androidx.compose.material3.pulltorefresh.PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = {
            refreshing = true
            scope.launch { load(); refreshing = false }
        },
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // User card
            SectionCard(padding = PaddingValues(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Avatar(
                        name = me?.name ?: email ?: "?",
                        photoUrl = me?.photoUrl,
                        busy = photoBusy,
                        editable = features.service.photos,
                        onClick = { if (features.service.photos) showPhotoSheet = true },
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = me?.name ?: "—",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            text = email ?: me?.email ?: "—",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            when (role ?: me?.role) {
                                "ADMIN" -> StatusChip(text = "Admin", tone = ChipTone.Info)
                                "EMPLOYEE" -> StatusChip(text = "Employee", tone = ChipTone.Muted)
                                else -> { /* unknown — show nothing */ }
                            }
                            if (features.verify.face && me?.faceEnrolledAt != null) {
                                StatusChip(text = "Face enrolled", tone = ChipTone.Success)
                            }
                        }
                    }
                }
                if (photoError != null) {
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text = photoError!!,
                        color = toneColors(ChipTone.Danger).fg,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            // Account & security — Face + Password as a settings-style list.
            // Face row stays visible across feature-flag states, but only acts
            // as a tappable navigation row when the user can actually enroll;
            // otherwise it renders as an informational row.
            val canEnrollFace = features.verify.face && features.service.faceEnrollment
            val enrolledAt = me?.faceEnrolledAt
            val faceSubtitle = when {
                !features.verify.face -> "Disabled for your organization"
                enrolledAt != null && canEnrollFace -> "Enrolled ${formatBdDate(enrolledAt)} · tap to re-enroll"
                enrolledAt != null -> "Enrolled ${formatBdDate(enrolledAt)}"
                canEnrollFace -> "Tap to enroll your face"
                else -> "Enrollment disabled — already-enrolled employees still check in"
            }
            SectionCard(title = "Account") {
                AccountRow(
                    icon = Icons.Outlined.Face,
                    title = "Face",
                    subtitle = faceSubtitle,
                    onClick = onOpenFaceEnroll,
                    enabled = canEnrollFace,
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                AccountRow(
                    icon = Icons.Outlined.Lock,
                    title = "Password",
                    subtitle = "Change your password",
                    onClick = onChangePassword,
                )
            }

            // Appearance — theme mode toggle
            SectionCard(title = "Appearance") {
                Text(
                    text = "Choose how the app looks. “System” matches your phone.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                ThemeModeToggle(
                    selected = themeMode,
                    onSelect = { mode ->
                        scope.launch { container.themePrefs.setThemeMode(mode) }
                    },
                )
            }

            Spacer(Modifier.height(4.dp))

            // Sign out — destructive action
            Button(
                onClick = {
                    scope.launch {
                        // Tear down any active background-location mechanism
                        // BEFORE clearing the session, so the FGS / WorkManager
                        // job / geofence registration can't keep posting pings
                        // for an unauthenticated user.
                        runCatching { container.locationModeManager.teardownAll() }
                        container.authRepo.logout()
                        onLoggedOut()
                    }
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = DangerFg,
                    contentColor = Color.White,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = MaterialTheme.shapes.small,
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.Logout,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.size(8.dp))
                Text("Sign out")
            }
            Spacer(Modifier.height(12.dp))
        }
    }

    if (showPhotoSheet) {
        val sheetState = rememberModalBottomSheetState()
        ModalBottomSheet(
            onDismissRequest = { showPhotoSheet = false },
            sheetState = sheetState,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            ) {
                Text(
                    text = "Profile photo",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                )
                SheetAction(
                    icon = Icons.Outlined.PhotoCamera,
                    label = "Take photo",
                    onClick = {
                        showPhotoSheet = false
                        val uri = newCameraTempUri(context)
                        pendingCameraUri = uri
                        cameraLauncher.launch(uri)
                    },
                )
                SheetAction(
                    icon = Icons.Outlined.PhotoLibrary,
                    label = "Choose from gallery",
                    onClick = {
                        showPhotoSheet = false
                        galleryLauncher.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                        )
                    },
                )
                if (me?.photoUrl != null) {
                    SheetAction(
                        icon = Icons.Outlined.Delete,
                        label = "Remove photo",
                        tint = toneColors(ChipTone.Danger).fg,
                        onClick = {
                            showPhotoSheet = false
                            removePhoto()
                        },
                    )
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun Avatar(
    name: String,
    photoUrl: String?,
    busy: Boolean,
    editable: Boolean,
    onClick: () -> Unit,
) {
    val initials = name.split(Regex("\\s+"))
        .mapNotNull { it.firstOrNull()?.toString() }
        .take(2)
        .joinToString("")
        .uppercase()
        .ifBlank { "?" }
    val brush = Brush.linearGradient(listOf(Brand500, Brand700))
    // Subtle desaturation when photos are disabled org-wide so the avatar
    // doesn't *look* like an interactive button when it isn't.
    val outerAlpha = if (editable) 1f else 0.78f
    Box(
        modifier = Modifier
            .size(64.dp)
            .clip(CircleShape)
            .alpha(outerAlpha)
            .clickable(enabled = editable && !busy, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .background(brush, CircleShape)
                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            if (photoUrl != null) {
                AsyncImage(
                    model = photoUrl,
                    contentDescription = "Profile photo",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape),
                )
            } else {
                Text(
                    text = initials,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    style = MaterialTheme.typography.titleMedium,
                )
            }
        }
        // Edit / busy badge — bottom-right corner. Hidden when photos are
        // disabled org-wide; the avatar still renders the photo or initials.
        if (editable || busy) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .size(22.dp)
                    .background(MaterialTheme.colorScheme.surface, CircleShape)
                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                if (busy) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(12.dp),
                        strokeWidth = 1.5.dp,
                        color = MaterialTheme.colorScheme.primary,
                    )
                } else {
                    Icon(
                        imageVector = Icons.Outlined.Edit,
                        contentDescription = "Edit photo",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(12.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun SheetAction(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
    tint: Color = MaterialTheme.colorScheme.onSurface,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = tint, modifier = Modifier.size(22.dp))
        Text(text = label, color = tint, style = MaterialTheme.typography.bodyLarge)
    }
}

private fun newCameraTempUri(context: android.content.Context): Uri {
    val dir = File(context.cacheDir, "profile_photos").apply { mkdirs() }
    val file = File(dir, "capture-${System.currentTimeMillis()}.jpg")
    return FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )
}

private fun formatBdDate(iso: String): String = try {
    val d = OffsetDateTime.parse(iso).toInstant()
    SimpleDateFormat("MMM d, yyyy", Locale.getDefault()).format(Date(d.toEpochMilli()))
} catch (_: Throwable) {
    iso
}

@Composable
private fun AccountRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = enabled, onClick = onClick)
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(Brand500.copy(alpha = 0.10f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (enabled) Brand500 else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(18.dp),
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (enabled) {
            Icon(
                imageVector = Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
