package com.attenddesk.ui.reminder

import android.Manifest
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
    var showTime by remember { mutableStateOf(false) }

    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }

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
        topBar = { GradientHeader(title = "Attendance Reminder", onBack = onBack) },
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
