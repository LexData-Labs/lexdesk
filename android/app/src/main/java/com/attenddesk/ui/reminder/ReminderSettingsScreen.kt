package com.attenddesk.ui.reminder

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.attenddesk.AppContainer
import com.attenddesk.data.ReminderConfig
import com.attenddesk.reminder.ReminderWorker
import com.attenddesk.ui.components.GradientHeader
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.util.LocalIs24Hour
import kotlinx.coroutines.launch
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReminderSettingsScreen(container: AppContainer, onBack: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val is24h = LocalIs24Hour.current
    val cfg by container.reminderPrefs.flow.collectAsState(initial = ReminderConfig(false, 9, 0))
    val autoCheckIn by container.autoCheckInPrefs.flow.collectAsState(initial = false)
    var showTime by remember { mutableStateOf(false) }
    var autoWarning by remember { mutableStateOf<String?>(null) }

    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }

    // Set by a permission result to re-run the enable once the user has
    // answered; a launcher can't call applyAutoCheckIn directly because it is
    // declared below it.
    var pendingAuto by remember { mutableStateOf(false) }

    val fineLocLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) pendingAuto = true
        else autoWarning = "Auto check-in needs location access. Allow it, then turn this on again."
    }
    val bgLocLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) pendingAuto = true
        else autoWarning = "Auto check-in only works with Location set to \"Allow all the time\". " +
            "Open app settings to change it, then turn this on again."
    }

    fun hasBackgroundLocation(): Boolean =
        Build.VERSION.SDK_INT < 29 || ContextCompat.checkSelfPermission(
            ctx, Manifest.permission.ACCESS_BACKGROUND_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED

    fun hasFineLocation(): Boolean = ContextCompat.checkSelfPermission(
        ctx, Manifest.permission.ACCESS_FINE_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED

    // Registering geofences needs background location; without it the switch
    // would look on and silently never fire, so say so instead.
    fun applyAutoCheckIn(enabled: Boolean) {
        scope.launch {
            container.autoCheckInPrefs.set(enabled)
            val app = ctx.applicationContext as com.attenddesk.App
            if (!enabled) {
                com.attenddesk.location.GeofenceController(app).unregister()
                autoWarning = null
                return@launch
            }
            // Ask for the permissions rather than sending people to hunt for
            // them. Background location must be requested on its own, and only
            // once foreground location is already granted — Android denies it
            // outright otherwise.
            if (!hasFineLocation()) {
                autoWarning = null
                fineLocLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                return@launch
            }
            if (!hasBackgroundLocation()) {
                autoWarning = null
                bgLocLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                return@launch
            }

            val snapshot = com.attenddesk.location.LocationPrefs.load(ctx)
            val office = snapshot.office
            val wifiRequired = snapshot.wifiRequired
            autoWarning = when {
                office == null ->
                    "No office location is configured yet. Open Check-in once to load it, then turn this on again."
                // Only a blocker when the policy actually requires Wi-Fi.
                wifiRequired && office.allowedSsids.isEmpty() && office.allowedBssids.isEmpty() ->
                    "Your office has no Wi-Fi networks configured, so auto check-in can't confirm you're on it. Ask an admin to add the office Wi-Fi."
                !com.attenddesk.location.GeofenceController(app).register(office) ->
                    "Couldn't start auto check-in. Open app settings and set Location to \"Allow all the time\", then try again."
                else -> null
            }
            if (autoWarning != null) container.autoCheckInPrefs.set(false)
        }
    }

    LaunchedEffect(pendingAuto) {
        if (pendingAuto) {
            pendingAuto = false
            applyAutoCheckIn(true)
        }
    }

    fun apply(enabled: Boolean, hour: Int, minute: Int) {
        scope.launch { container.reminderPrefs.set(enabled, hour, minute) }
        if (enabled) {
            if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
            ReminderWorker.schedule(ctx, hour, minute)
        } else {
            ReminderWorker.cancel(ctx)
        }
    }

    Scaffold(
        topBar = { GradientHeader(title = "Settings", onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            SectionCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Daily reminder", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text("A local nudge to mark your attendance", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(checked = cfg.enabled, onCheckedChange = { apply(it, cfg.hour, cfg.minute) })
                }
            }
            SectionCard {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable(enabled = cfg.enabled) { showTime = true },
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Reminder time", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text(timeLabel(cfg.hour, cfg.minute, is24h), style = MaterialTheme.typography.bodyMedium, color = if (cfg.enabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Text(
                "Reminders are delivered on this device only and don't affect your check-in record.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            SectionCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Auto check-in", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(
                            "Check in automatically when you reach the office",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(checked = autoCheckIn, onCheckedChange = { applyAutoCheckIn(it) })
                }
            }
            Text(
                if (autoWarning != null) autoWarning!!
                else "Uses the same rules as checking in by hand — your admin decides whether office Wi-Fi " +
                    "is needed as well as being at the office. You'll get a notification whenever it checks " +
                    "you in. Leaving never checks you out — do that yourself.",
                style = MaterialTheme.typography.bodySmall,
                color = if (autoWarning != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
            )
            // Android stops showing the permission dialog once it has been
            // denied twice, so the only route left is the app's settings page.
            if (autoWarning?.contains("app settings", ignoreCase = true) == true) {
                TextButton(onClick = {
                    ctx.startActivity(
                        Intent(
                            android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.fromParts("package", ctx.packageName, null),
                        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                    )
                }) { Text("Open app settings") }
            }
            Spacer(Modifier.height(4.dp))
        }
    }

    if (showTime) {
        val state = rememberTimePickerState(initialHour = cfg.hour, initialMinute = cfg.minute, is24Hour = is24h)
        AlertDialog(
            onDismissRequest = { showTime = false },
            confirmButton = { TextButton(onClick = { apply(true, state.hour, state.minute); showTime = false }) { Text("OK") } },
            dismissButton = { TextButton(onClick = { showTime = false }) { Text("Cancel") } },
            title = { Text("Reminder time") },
            text = { TimePicker(state = state) },
        )
    }
}

private fun timeLabel(hour: Int, minute: Int, is24h: Boolean): String {
    val fmt = DateTimeFormatter.ofPattern(if (is24h) "HH:mm" else "hh:mm a", Locale.ENGLISH)
    return LocalTime.of(hour.coerceIn(0, 23), minute.coerceIn(0, 59)).format(fmt)
}
