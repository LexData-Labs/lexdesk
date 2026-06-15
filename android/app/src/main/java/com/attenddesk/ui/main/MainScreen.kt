package com.attenddesk.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.EventAvailable
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.attenddesk.AppContainer
import com.attenddesk.ui.components.BrandMark
import com.attenddesk.ui.dashboard.DashboardTab
import com.attenddesk.ui.leaves.LeavesTab
import com.attenddesk.ui.profile.ProfileTab
import com.attenddesk.ui.verification.VerificationTab
import kotlinx.coroutines.launch

private enum class Tab(val label: String, val icon: ImageVector) {
    Dashboard("Dashboard", Icons.Outlined.Insights),
    Verify("Verify",       Icons.Outlined.CheckCircle),
    Leaves("Leaves",       Icons.Outlined.EventAvailable),
    Profile("Profile",     Icons.Outlined.Person),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    container: AppContainer,
    onOpenPermissions: () -> Unit,
    onOpenHistory: () -> Unit,
    onOpenFaceEnroll: () -> Unit,
    onVerifyFace: () -> Unit,
    onScanQr: () -> Unit,
    onChangePassword: () -> Unit,
    onLoggedOut: () -> Unit,
) {
    // rememberSaveable so the active tab survives navigation away (e.g. Face
    // enroll / Verify) and back — otherwise the user lands on Dashboard after
    // completing an action they started from Verify or Profile.
    var selected by rememberSaveable { mutableIntStateOf(0) }
    // Visible tabs derived from feature flags. Leaves tab is gated by
    // service.leaveRequests — when the org admin turns it off via the system
    // admin features page, the tab vanishes from the bottom bar.
    val scope = rememberCoroutineScope()
    var leavesEnabled by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        scope.launch {
            try {
                val policy = container.policyRepo.get(forceRefresh = true)
                leavesEnabled = policy.features.service.leaveRequests
                // Apply the org's location mode whenever a fresh policy lands.
                // applyMode is now idempotent — calling with the same config
                // is a no-op.
                runCatching { container.locationModeManager.applyMode(policy) }
            } catch (_: Throwable) { /* keep optimistic default */ }
        }
    }

    // Resume-triggered refresh: when the user backgrounds the app, an admin
    // changes something on the web, and then the user brings the app back,
    // pick up that change without requiring a cold restart. 60s throttle
    // prevents a rapid pause/resume cycle from flooding /me/policy.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        var lastResumeRefreshMs = 0L
        val minIntervalMs = 60_000L
        val observer = LifecycleEventObserver { _, event ->
            if (event != Lifecycle.Event.ON_RESUME) return@LifecycleEventObserver
            val now = System.currentTimeMillis()
            if (now - lastResumeRefreshMs < minIntervalMs) return@LifecycleEventObserver
            lastResumeRefreshMs = now
            scope.launch {
                try {
                    val policy = container.policyRepo.get(forceRefresh = true)
                    leavesEnabled = policy.features.service.leaveRequests
                    runCatching { container.locationModeManager.applyMode(policy) }
                } catch (_: Throwable) { /* keep existing state */ }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
    val visibleTabs = remember(leavesEnabled) {
        Tab.entries.filter { it != Tab.Leaves || leavesEnabled }
    }
    // Clamp the selected index if the visible list shrank (e.g. Leaves was on
    // and the admin turned it off mid-session).
    if (selected >= visibleTabs.size) selected = 0
    val tab = visibleTabs[selected]

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        BrandMark(size = 30.dp)
                        Text(
                            "AttendDesk · ${tab.label}",
                            style = MaterialTheme.typography.titleMedium,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                visibleTabs.forEachIndexed { index, t ->
                    NavigationBarItem(
                        selected = selected == index,
                        onClick = { selected = index },
                        icon = { Icon(t.icon, contentDescription = t.label) },
                        label = { Text(t.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.10f),
                        ),
                    )
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background),
        ) {
            when (tab) {
                Tab.Dashboard -> DashboardTab(
                    container = container,
                    onOpenHistory = onOpenHistory,
                )
                Tab.Verify -> VerificationTab(
                    container = container,
                    onOpenPermissions = onOpenPermissions,
                    onOpenFaceEnroll = onOpenFaceEnroll,
                    onVerifyFace = onVerifyFace,
                    onScanQr = onScanQr,
                )
                Tab.Leaves -> LeavesTab(
                    container = container,
                    onFeatureDisabled = {
                        leavesEnabled = false
                        selected = 0
                    },
                )
                Tab.Profile -> ProfileTab(
                    container = container,
                    onOpenFaceEnroll = onOpenFaceEnroll,
                    onChangePassword = onChangePassword,
                    onLoggedOut = onLoggedOut,
                )
            }
        }
    }
}
