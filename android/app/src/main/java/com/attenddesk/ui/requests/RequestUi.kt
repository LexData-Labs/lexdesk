package com.attenddesk.ui.requests

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.attenddesk.ui.components.ChipTone
import com.attenddesk.ui.components.EmptyState
import com.attenddesk.ui.components.GradientHeader
import com.attenddesk.ui.components.LoadingDots
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.components.StatusChip
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale

val REQ_BD_ZONE: ZoneId = ZoneId.of("Asia/Dhaka")
val REQ_ISO_DAY: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
val REQ_DISPLAY_DAY: DateTimeFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)

fun statusTone(status: String): ChipTone = when (status) {
    "approved" -> ChipTone.Success
    "rejected" -> ChipTone.Danger
    "cancelled" -> ChipTone.Muted
    else -> ChipTone.Warn
}

@Composable
fun RequestStatusChip(status: String) {
    StatusChip(text = status, tone = statusTone(status), showDot = false)
}

/** Generic request card: a title, some detail lines, a status chip, optional cancel. */
@Composable
fun RequestRowCard(
    title: String,
    lines: List<String>,
    status: String,
    decisionNote: String? = null,
    onCancel: (() -> Unit)? = null,
) {
    SectionCard {
        Row(verticalAlignment = Alignment.Top) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                lines.filter { it.isNotBlank() }.forEach {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (!decisionNote.isNullOrBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Text("Note: $decisionNote", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Spacer(Modifier.width(8.dp))
            RequestStatusChip(status)
        }
        if (onCancel != null && status == "pending") {
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onCancel) { Text("Cancel request") }
        }
    }
}

/** Header + pull-to-refresh list + "add" FAB scaffold shared by request screens. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun <T> RequestScreenScaffold(
    title: String,
    onBack: () -> Unit,
    onAdd: (() -> Unit)?,
    refreshing: Boolean,
    onRefresh: () -> Unit,
    items: List<T>?,
    emptyTitle: String,
    emptyText: String,
    key: (T) -> Any,
    row: @Composable (T) -> Unit,
) {
    Scaffold(
        topBar = { GradientHeader(title = title, onBack = onBack) },
        floatingActionButton = {
            if (onAdd != null) {
                FloatingActionButton(onClick = onAdd, containerColor = MaterialTheme.colorScheme.primary) {
                    Icon(Icons.Outlined.Add, contentDescription = "New", tint = MaterialTheme.colorScheme.onPrimary)
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        androidx.compose.material3.pulltorefresh.PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = onRefresh,
            modifier = Modifier.padding(padding).fillMaxSize(),
        ) {
            when {
                items == null -> Box(Modifier.fillMaxSize(), Alignment.Center) { LoadingDots() }
                items.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    EmptyState(title = emptyTitle, description = emptyText)
                }
                else -> LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) { items(items, key = key) { row(it) } }
            }
        }
    }
}

/** OutlinedButton that opens a date picker; shows [label] + the chosen day. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DateField(label: String, day: LocalDate, onPick: (LocalDate) -> Unit, modifier: Modifier = Modifier) {
    var open by remember { mutableStateOf(false) }
    OutlinedButton(onClick = { open = true }, modifier = modifier) {
        Column(horizontalAlignment = Alignment.Start) {
            Text(label, style = MaterialTheme.typography.labelSmall)
            Text(day.format(REQ_DISPLAY_DAY), style = MaterialTheme.typography.bodyMedium)
        }
    }
    if (open) {
        val state = rememberDatePickerState(initialSelectedDateMillis = day.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { open = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { onPick(Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate()) }
                    open = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { open = false }) { Text("Cancel") } },
        ) { DatePicker(state = state) }
    }
}
