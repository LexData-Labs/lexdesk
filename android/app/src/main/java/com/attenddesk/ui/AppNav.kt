package com.attenddesk.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.attenddesk.AppContainer
import com.attenddesk.ui.faceenroll.FaceEnrollScreen
import com.attenddesk.ui.faceverify.FaceVerifyScreen
import com.attenddesk.ui.history.HistoryScreen
import com.attenddesk.ui.login.LoginScreen
import com.attenddesk.ui.main.MainScreen
import com.attenddesk.ui.permissions.PermissionsScreen
import com.attenddesk.ui.qrscan.QrScanScreen
import com.attenddesk.ui.setpw.SetPasswordScreen
import com.google.firebase.auth.FirebaseAuth

object Routes {
    const val LOGIN = "login"
    const val SET_PW = "set-password"
    const val PERMISSIONS = "permissions"
    const val HOME = "home"
    const val HISTORY = "history"
    const val FACE_ENROLL = "face-enroll"
    const val FACE_VERIFY = "face-verify"
    const val QR_SCAN = "qr-scan"
}

@Composable
fun AppNav(container: AppContainer) {
    val navController = rememberNavController()
    val signedIn = remember { mutableStateOf(FirebaseAuth.getInstance().currentUser != null) }
    val start = if (signedIn.value) Routes.HOME else Routes.LOGIN

    NavHost(navController = navController, startDestination = start) {
        composable(Routes.LOGIN) {
            LoginScreen(
                container = container,
                onLoggedIn = { mustChangePw ->
                    navController.navigate(if (mustChangePw) Routes.SET_PW else Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.SET_PW) {
            SetPasswordScreen(
                container = container,
                onDone = { navController.navigate(Routes.LOGIN) { popUpTo(Routes.SET_PW) { inclusive = true } } },
            )
        }
        composable(Routes.PERMISSIONS) {
            PermissionsScreen(onGranted = { navController.popBackStack() })
        }
        composable(Routes.HOME) {
            MainScreen(
                container = container,
                onOpenPermissions = { navController.navigate(Routes.PERMISSIONS) },
                onOpenHistory     = { navController.navigate(Routes.HISTORY) },
                onOpenFaceEnroll  = { navController.navigate(Routes.FACE_ENROLL) },
                onVerifyFace      = { navController.navigate(Routes.FACE_VERIFY) },
                onScanQr          = { navController.navigate(Routes.QR_SCAN) },
                onChangePassword  = { navController.navigate(Routes.SET_PW) },
                onLoggedOut = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.HISTORY) {
            HistoryScreen(container = container, onBack = { navController.popBackStack() })
        }
        composable(Routes.FACE_ENROLL) {
            FaceEnrollScreen(container = container, onDone = { navController.popBackStack() })
        }
        composable(Routes.FACE_VERIFY) {
            FaceVerifyScreen(
                container = container,
                onDone = { navController.popBackStack() },
                onCancel = { navController.popBackStack() },
            )
        }
        composable(Routes.QR_SCAN) {
            QrScanScreen(
                onResult = { token ->
                    container.setQrToken(token)
                    navController.popBackStack()
                },
                onCancel = { navController.popBackStack() },
            )
        }
    }
}
