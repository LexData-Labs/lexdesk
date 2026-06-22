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
import com.attenddesk.ui.approvals.ApprovalsScreen
import com.attenddesk.ui.assets.AssetsScreen
import com.attenddesk.ui.attendance.MyAttendanceScreen
import com.attenddesk.ui.attendance.TeamScreen
import com.attenddesk.ui.breaks.BreakTimeScreen
import com.attenddesk.ui.comingsoon.ComingSoonScreen
import com.attenddesk.ui.directory.DirectoryScreen
import com.attenddesk.ui.faceenroll.FaceEnrollScreen
import com.attenddesk.ui.faceverify.FaceVerifyScreen
import com.attenddesk.ui.leaves.LeaveBalanceScreen
import com.attenddesk.ui.login.LoginScreen
import com.attenddesk.ui.main.MainScreen
import com.attenddesk.ui.notices.NoticeBoardScreen
import com.attenddesk.ui.notifications.NotificationsScreen
import com.attenddesk.ui.permissions.PermissionsScreen
import com.attenddesk.ui.profile.ProfileScreen
import com.attenddesk.ui.qr.MyQrScreen
import com.attenddesk.ui.qrscan.QrScanScreen
import com.attenddesk.ui.recon.ReconScreen
import com.attenddesk.ui.reminder.ReminderSettingsScreen
import com.attenddesk.ui.remote.RemoteScreen
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
    const val DIRECTORY = "directory"
    const val NOTICES = "notices"
    const val BREAK_TIME = "break-time"
    const val RECON = "recon"
    const val REMOTE = "remote"
    const val TEAM = "team"
    const val ATT_REMINDER = "attendance-reminder"
    const val NOTIFICATIONS = "notifications"
    const val PROFILE = "profile"
    const val MY_QR = "my-qr"
    const val FACE_ENROLL = "face-enroll"
    const val FACE_VERIFY = "face-verify"
    const val QR_SCAN = "qr-scan"
    const val APPROVALS = "approvals/{tab}"
    const val COMING_SOON = "coming-soon/{title}"
    fun approvals(tab: Int) = "approvals/$tab"
    fun comingSoon(title: String) = "coming-soon/${Uri.encode(title)}"
}

@Composable
fun AppNav(container: AppContainer) {
    val navController = rememberNavController()
    val signedIn = remember { mutableStateOf(FirebaseAuth.getInstance().currentUser != null) }
    val start = if (signedIn.value) Routes.HOME else Routes.LOGIN

    fun back() = navController.popBackStack()
    val toLogin: () -> Unit = { navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } } }

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
            SetPasswordScreen(container = container, onDone = toLogin)
        }
        composable(Routes.PERMISSIONS) {
            PermissionsScreen(onGranted = { navController.popBackStack() })
        }
        composable(Routes.HOME) {
            MainScreen(
                container = container,
                onNavigate = { route -> navController.navigate(route) },
                onLoggedOut = toLogin,
            )
        }
        composable(Routes.CHECK_IN) {
            CheckInScreen(
                container = container,
                onBack = { back() },
                onOpenPermissions = { navController.navigate(Routes.PERMISSIONS) },
                onOpenFaceEnroll = { navController.navigate(Routes.FACE_ENROLL) },
                onVerifyFace = { navController.navigate(Routes.FACE_VERIFY) },
                onScanQr = { navController.navigate(Routes.QR_SCAN) },
            )
        }
        composable(Routes.MY_ATTENDANCE) { MyAttendanceScreen(container = container, onBack = { back() }) }
        composable(Routes.LEAVE_BALANCE) { LeaveBalanceScreen(container = container, onBack = { back() }) }
        composable(Routes.ASSETS) { AssetsScreen(container = container, onBack = { back() }) }
        composable(Routes.DIRECTORY) { DirectoryScreen(container = container, onBack = { back() }) }
        composable(Routes.NOTICES) { NoticeBoardScreen(container = container, onBack = { back() }) }
        composable(Routes.BREAK_TIME) { BreakTimeScreen(container = container, onBack = { back() }) }
        composable(Routes.RECON) { ReconScreen(container = container, onBack = { back() }) }
        composable(Routes.REMOTE) { RemoteScreen(container = container, onBack = { back() }) }
        composable(Routes.TEAM) { TeamScreen(container = container, onBack = { back() }) }
        composable(Routes.ATT_REMINDER) { ReminderSettingsScreen(container = container, onBack = { back() }) }
        composable(Routes.NOTIFICATIONS) { NotificationsScreen(container = container, onBack = { back() }) }
        composable(Routes.MY_QR) { MyQrScreen(container = container, onBack = { back() }) }
        composable(Routes.PROFILE) {
            ProfileScreen(
                container = container,
                onBack = { back() },
                onOpenFaceEnroll = { navController.navigate(Routes.FACE_ENROLL) },
                onChangePassword = { navController.navigate(Routes.SET_PW) },
                onLoggedOut = toLogin,
            )
        }
        composable(
            route = Routes.APPROVALS,
            arguments = listOf(navArgument("tab") { type = NavType.IntType; defaultValue = 0 }),
        ) { entry ->
            val tab = entry.arguments?.getInt("tab") ?: 0
            ApprovalsScreen(container = container, onBack = { back() }, initialTab = tab)
        }
        composable(
            route = Routes.COMING_SOON,
            arguments = listOf(navArgument("title") { type = NavType.StringType }),
        ) { entry ->
            val title = entry.arguments?.getString("title")?.let { Uri.decode(it) } ?: "Coming soon"
            ComingSoonScreen(title = title, onBack = { back() })
        }
        composable(Routes.FACE_ENROLL) {
            FaceEnrollScreen(container = container, onDone = { navController.popBackStack() })
        }
        composable(Routes.FACE_VERIFY) {
            FaceVerifyScreen(container = container, onDone = { navController.popBackStack() }, onCancel = { navController.popBackStack() })
        }
        composable(Routes.QR_SCAN) {
            QrScanScreen(onResult = { token -> container.setQrToken(token); navController.popBackStack() }, onCancel = { navController.popBackStack() })
        }
    }
}
