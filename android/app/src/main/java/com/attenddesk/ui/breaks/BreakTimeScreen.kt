package com.attenddesk.ui.breaks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.FreeBreakfast
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.attenddesk.AppContainer
import com.attenddesk.data.api.BreakActionRequest
import com.attenddesk.data.api.BreakEventDto
import com.attenddesk.ui.components.ChipTone
import com.attenddesk.ui.components.GradientHeader
import com.attenddesk.ui.components.IconChip
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.components.toneColors
import com.attenddesk.ui.theme.DangerFg
import com.attenddesk.ui.theme.SuccessFg
import com.attenddesk.ui.util.LocalIs24Hour
import com.attenddesk.ui.util.formatClock
import com.attenddesk.ui.util.parseToDhaka
import kotlinx.coroutines.launch
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BreakTimeScreen(container: AppContainer, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    val is24h = LocalIs24Hour.current
    var events by remember { mutableStateOf<List<BreakEventDto>?>(null) }
    var onBreak by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }

    suspend fun load() {
        runCatching { container.api.listMyBreaks() }
            .onSuccess { events = it.events; onBreak = it.onBreak }
            .onFailure { if (events == null) events = emptyList() }
    }
    LaunchedEffect(Unit) { load() }

    fun toggle() {
        busy = true
        scope.launch {
            runCatching { container.api.recordBreak(BreakActionRequest(if (onBreak) "end" else "start")) }
            load()
            busy = false
        }
    }

    Scaffold(
        topBar = { GradientHeader(title = "Break Time", onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            SectionCard {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    IconChip(Icons.Outlined.FreeBreakfast)
                    Column(modifier = Modifier.weight(1f)) {
                        Text(if (onBreak) "On break" else "Not on break", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(
                            if (onBreak) "Tap to end your break" else "Tap to start a break",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = { toggle() },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (onBreak) DangerFg else SuccessFg,
                        contentColor = Color.White,
                    ),
                ) {
                    if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = Color.White)
                    else Text(if (onBreak) "End break" else "Start break")
                }
            }

            Text("HISTORY", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            val list = events
            if (list == null) {
                Text("Loading…", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else if (list.isEmpty()) {
                SectionCard { Text("No breaks recorded yet.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            } else {
                list.forEach { e -> BreakRow(e, is24h) }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

private val DAY = DateTimeFormatter.ofPattern("EEE, d MMM", Locale.ENGLISH)

@Composable
private fun BreakRow(e: BreakEventDto, is24h: Boolean) {
    val started = e.type == "BREAK_START"
    val tone = toneColors(if (started) ChipTone.Warn else ChipTone.Success)
    SectionCard(padding = androidx.compose.foundation.layout.PaddingValues(horizontal = 14.dp, vertical = 12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(if (started) "Break started" else "Break ended", style = MaterialTheme.typography.titleSmall, color = tone.fg, fontWeight = FontWeight.SemiBold)
                Text(parseToDhaka(e.timestamp)?.format(DAY) ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(formatClock(e.timestamp, is24h), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        }
    }
}
