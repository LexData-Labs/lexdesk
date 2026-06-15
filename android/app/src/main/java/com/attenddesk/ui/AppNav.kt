package com.attenddesk.ui

import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.attenddesk.AppContainer
import com.attenddesk.ui.assets.AssetsScreen
import com.attenddesk.ui.attendance.MyAttendanceScreen
import com.attenddesk.ui.comingsoon.ComingSoonScreen
import com.attenddesk.ui.faceenroll.FaceEnrollScreen
import com.attenddesk.ui.faceverify.FaceVerifyScreen
import com.attenddesk.ui.leaves.LeaveBalanceScreen
import com.attenddesk.ui.login.LoginScreen
import com.attenddesk.ui.main.MainScreen
import com.attenddesk.ui.notifications.NotificationsScreen
import com.attenddesk.ui.permissions.PermissionsScreen
import com.attenddesk.ui.profile.ProfileScreen
import com.attenddesk.ui.qr.MyQrScreen
import com.attenddesk.ui.qrscan.QrScanScreen
import com.attenddesk.ui.setpw.SetPasswordScreen
import com.attenddesk.ui.verification.CheckInScreen
import com.google.firebase.auth.FirebaseAuth

object Routes {
    const val LOGIN = "login"
    const val SET_PW = "set-password"
    const val PERMISSIONS = "permissions"
    const val HOME = "home"
    const val CHECK_IN = "check-in"
    const val MY_ATTENDANCE = "my-attendance"
    const val LEAVE_BALANCE = "leave-balance"
    const val ASSETS = "assets"
    const val NOTIFICATIONS = "notifications"
    const val PROFILE = "profile"
    const val MY_QR = "my-qr"
    const val FACE_ENROLL = "face-enroll"
    const val FACE_VERIFY = "face-verify"
    const val QR_SCAN = "qr-scan"
    const val COMING_SOON = "coming-soon/{title}"
    fun comingSoon(title: String) = "coming-soon/${Uri.encode(title)}"
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
                onDone = { navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } } },
            )
        }
        composable(Routes.PERMISSIONS) {
            PermissionsScreen(onGranted = { navController.popBackStack() })
        }
        composable(Routes.HOME) {
            MainScreen(
                container = container,
                onCheckIn = { navController.navigate(Routes.CHECK_IN) },
                onMyAttendance = { navController.navigate(Routes.MY_ATTENDANCE) },
                onOpenLeaveBalance = { navController.navigate(Routes.LEAVE_BALANCE) },
                onOpenAssets = { navController.navigate(Routes.ASSETS) },
                onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                onOpenProfile = { navController.navigate(Routes.PROFILE) },
                onOpenMyQr = { navController.navigate(Routes.MY_QR) },
                onComingSoon = { title -> navController.navigate(Routes.comingSoon(title)) },
                onChangePassword = { navController.navigate(Routes.SET_PW) },
                onLoggedOut = { navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } } },
            )
        }
        composable(Routes.CHECK_IN) {
            CheckInScreen(
                container = container,
                onBack = { navController.popBackStack() },
                onOpenPermissions = { navController.navigate(Routes.PERMISSIONS) },
                onOpenFaceEnroll = { navController.navigate(Routes.FACE_ENROLL) },
                onVerifyFace = { navController.navigate(Routes.FACE_VERIFY) },
                onScanQr = { navController.navigate(Routes.QR_SCAN) },
            )
        }
        composable(Routes.MY_ATTENDANCE) {
            MyAttendanceScreen(container = container, onBack = { navController.popBackStack() })
        }
        composable(Routes.LEAVE_BALANCE) {
            LeaveBalanceScreen(container = container, onBack = { navController.popBackStack() })
        }
        composable(Routes.ASSETS) {
            AssetsScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.NOTIFICATIONS) {
            NotificationsScreen(container = container, onBack = { navController.popBackStack() })
        }
        composable(Routes.PROFILE) {
            ProfileScreen(
                container = container,
                onBack = { navController.popBackStack() },
                onOpenFaceEnroll = { navController.navigate(Routes.FACE_ENROLL) },
                onChangePassword = { navController.navigate(Routes.SET_PW) },
                onLoggedOut = { navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } } },
            )
        }
        composable(Routes.MY_QR) {
            MyQrScreen(container = container, onBack = { navController.popBackStack() })
        }
        composable(
            route = Routes.COMING_SOON,
            arguments = listOf(navArgument("title") { type = NavType.StringType }),
        ) { entry ->
            val title = entry.arguments?.getString("title")?.let { Uri.decode(it) } ?: "Coming soon"
            ComingSoonScreen(title = title, onBack = { navController.popBackStack() })
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
