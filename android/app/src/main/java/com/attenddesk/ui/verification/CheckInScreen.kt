package com.attenddesk.ui.verification

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.attenddesk.AppContainer
import com.attenddesk.ui.components.GradientHeader

/**
 * Full-screen host for the existing anti-cheat check-in flow. In the redesigned
 * IA the "Check In / Out" module on Home and the QR/Face actions on Attendance
 * both route here; [VerificationTab] keeps all of its WiFi/GPS/QR/Face logic.
 */
@Composable
fun CheckInScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onOpenPermissions: () -> Unit,
    onOpenFaceEnroll: () -> Unit,
    onVerifyFace: () -> Unit,
    onScanQr: () -> Unit,
) {
    Scaffold(
        topBar = { GradientHeader(title = "Check In / Out", onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            VerificationTab(
                container = container,
                onOpenPermissions = onOpenPermissions,
                onOpenFaceEnroll = onOpenFaceEnroll,
                onVerifyFace = onVerifyFace,
                onScanQr = onScanQr,
            )
        }
    }
}
