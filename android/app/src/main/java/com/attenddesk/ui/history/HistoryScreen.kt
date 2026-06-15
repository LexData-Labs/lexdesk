package com.attenddesk.ui.history

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.EventNote
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.unit.dp
import com.attenddesk.AppContainer
import com.attenddesk.data.api.HistoryEvent
import com.attenddesk.ui.components.AppTopBar
import com.attenddesk.ui.components.ChipTone
import com.attenddesk.ui.components.EmptyState
import com.attenddesk.ui.components.LoadingDots
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.components.StatusChip
import com.attenddesk.ui.components.toneColors
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.time.OffsetDateTime
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(container: AppContainer, onBack: () -> Unit) {
    var events by remember { mutableStateOf<List<HistoryEvent>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun load() {
        try {
            events = container.api.history(50).events
            error = null
        } catch (e: Throwable) {
            error = e.message ?: "Failed to load"
        }
    }

    LaunchedEffect(Unit) { scope.launch { load() } }

    Scaffold(
        topBar = { AppTopBar(title = "History", onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        androidx.compose.material3.pulltorefresh.PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = {
                refreshing = true
                scope.launch { load(); refreshing = false }
            },
            modifier = Modifier
                .padding(padding)
                .fillMaxSize(),
        ) {
            when {
                error != null -> ErrorView(
                    modifier = Modifier.padding(20.dp),
                    message = error!!,
                    onRetry = { scope.launch { events = null; error = null; load() } },
                )

                events == null -> Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    LoadingDots()
                }

                events!!.isEmpty() -> Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    EmptyState(
                        icon = Icons.AutoMirrored.Outlined.EventNote,
                        title = "No check-ins yet",
                        description = "Your attendance events will appear here.",
                    )
                }

                else -> {
                    val grouped = remember(events) { groupByDay(events!!) }
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        grouped.forEach { (day, dayEvents) ->
                            item(key = "h-$day") {
                                Text(
                                    text = day.uppercase(),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(start = 4.dp, bottom = 4.dp),
                                )
                            }
                            items(dayEvents, key = { it.id }) { e -> EventRow(e) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EventRow(e: HistoryEvent) {
    SectionCard(padding = PaddingValues(horizontal = 14.dp, vertical = 12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = formatTime(e.timestamp),
                    style = MaterialTheme.typography.titleSmall,
                )
                Text(
                    text = if (e.type == "CHECK_IN") "Check in" else "Check out",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Column(
                verticalArrangement = Arrangement.spacedBy(4.dp),
                horizontalAlignment = Alignment.End,
            ) {
                if (e.allChecksPassed) {
                    StatusChip(text = "passed", tone = ChipTone.Success)
                } else {
                    StatusChip(text = "rejected", tone = ChipTone.Danger)
                }
                if (e.type == "CHECK_IN" && e.isLate) {
                    StatusChip(text = "late", tone = ChipTone.Warn)
                } else if (e.type == "CHECK_OUT" && e.isEarly) {
                    StatusChip(text = "early leave", tone = ChipTone.Warn)
                }
            }
        }
    }
}

@Composable
private fun ErrorView(modifier: Modifier, message: String, onRetry: () -> Unit) {
    val tone = toneColors(ChipTone.Danger)
    Box(modifier = modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(tone.bg, MaterialTheme.shapes.medium)
                .border(1.dp, tone.border, MaterialTheme.shapes.medium)
                .padding(14.dp),
        ) {
            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Box(
                        Modifier
                            .size(20.dp)
                            .background(tone.fg.copy(alpha = 0.10f), CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.ErrorOutline,
                            contentDescription = null,
                            tint = tone.fg,
                            modifier = Modifier.size(14.dp),
                        )
                    }
                    Text(
                        text = "Couldn't load history",
                        style = MaterialTheme.typography.titleSmall,
                        color = tone.fg,
                    )
                }
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodySmall,
                    color = tone.fg,
                    modifier = Modifier.padding(top = 4.dp, start = 28.dp),
                )
                OutlinedButton(
                    onClick = onRetry,
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.padding(top = 10.dp, start = 28.dp),
                ) { Text("Retry") }
            }
        }
    }
}

private fun parseTimestamp(s: String): Date? = try {
    Date(OffsetDateTime.parse(s).toInstant().toEpochMilli())
} catch (_: Throwable) {
    null
}

private fun formatTime(s: String): String =
    parseTimestamp(s)
        ?.let { SimpleDateFormat("HH:mm", Locale.getDefault()).format(it) }
        ?: s

private fun formatDay(s: String): String {
    val d = parseTimestamp(s) ?: return s
    val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    val day = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(d)
    return when (day) {
        today -> "Today"
        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            .format(Date(System.currentTimeMillis() - 24L * 3600 * 1000)) -> "Yesterday"
        else -> SimpleDateFormat("EEEE, MMM d", Locale.getDefault()).format(d)
    }
}

private fun groupByDay(events: List<HistoryEvent>): List<Pair<String, List<HistoryEvent>>> {
    val map = linkedMapOf<String, MutableList<HistoryEvent>>()
    for (e in events) {
        val day = formatDay(e.timestamp)
        map.getOrPut(day) { mutableListOf() }.add(e)
    }
    return map.entries.map { it.key to it.value }
}
