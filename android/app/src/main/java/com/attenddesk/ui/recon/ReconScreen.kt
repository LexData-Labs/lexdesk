package com.attenddesk.ui.recon

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.attenddesk.AppContainer
import com.attenddesk.data.api.ReconDto
import com.attenddesk.data.api.ReconSubmitRequest
import com.attenddesk.ui.requests.DateField
import com.attenddesk.ui.requests.REQ_ISO_DAY
import com.attenddesk.ui.requests.RequestRowCard
import com.attenddesk.ui.requests.RequestScreenScaffold
import com.attenddesk.ui.util.LocalIs24Hour
import com.attenddesk.ui.util.formatClock
import kotlinx.coroutines.launch
import java.time.LocalDate

private val HHMM = Regex("^([01]?\\d|2[0-3]):[0-5]\\d$")

private fun isoFrom(day: LocalDate, hhmm: String): String? {
    val t = hhmm.trim()
    if (!HHMM.matches(t)) return null
    val parts = t.split(":")
    return "${day.format(REQ_ISO_DAY)}T${parts[0].padStart(2, '0')}:${parts[1]}:00"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReconScreen(container: AppContainer, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    val is24h = LocalIs24Hour.current
    var items by remember { mutableStateOf<List<ReconDto>?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var showForm by remember { mutableStateOf(false) }

    suspend fun load() {
        runCatching { container.api.listMyRecon().requests }.onSuccess { items = it }.onFailure { if (items == null) items = emptyList() }
    }
    LaunchedEffect(Unit) { load() }

    RequestScreenScaffold(
        title = "Recon. Application",
        onBack = onBack,
        onAdd = { showForm = true },
        refreshing = refreshing,
        onRefresh = { refreshing = true; scope.launch { load(); refreshing = false } },
        items = items,
        emptyTitle = "No reconciliations",
        emptyText = "Request an attendance correction with the + button.",
        key = { it.id },
    ) { r ->
        val parts = buildList {
            r.proposedInIso?.let { add("In: ${formatClock(it, is24h)}") }
            r.proposedOutIso?.let { add("Out: ${formatClock(it, is24h)}") }
        }.joinToString(" · ")
        RequestRowCard(
            title = "Reconcile ${r.day}",
            lines = listOf(parts, r.reason),
            status = r.status,
            decisionNote = r.decisionNote,
            onCancel = { scope.launch { runCatching { container.api.cancelRecon(r.id) }; load() } },
        )
    }

    if (showForm) {
        ReconForm(onDismiss = { showForm = false }, onSubmit = { req ->
            scope.launch {
                val ok = runCatching { container.api.submitRecon(req) }.isSuccess
                if (ok) { showForm = false; load() }
            }
        })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReconForm(onDismiss: () -> Unit, onSubmit: (ReconSubmitRequest) -> Unit) {
    var day by remember { mutableStateOf(LocalDate.now()) }
    var inHhmm by remember { mutableStateOf("") }
    var outHhmm by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    val inIso = isoFrom(day, inHhmm)
    val outIso = isoFrom(day, outHhmm)
    val canSubmit = reason.trim().isNotEmpty() && (inIso != null || outIso != null)

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(enabled = canSubmit, onClick = {
                onSubmit(ReconSubmitRequest(day = day.format(REQ_ISO_DAY), proposedInIso = inIso, proposedOutIso = outIso, reason = reason.trim()))
            }) { Text("Submit") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        title = { Text("Reconcile attendance") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                DateField("Date", day, { day = it }, Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = inHhmm, onValueChange = { inHhmm = it }, label = { Text("In (HH:mm)") }, singleLine = true, modifier = Modifier.weight(1f))
                    OutlinedTextField(value = outHhmm, onValueChange = { outHhmm = it }, label = { Text("Out (HH:mm)") }, singleLine = true, modifier = Modifier.weight(1f))
                }
                Text("Enter at least one corrected time (24-hour, e.g. 09:30).", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(value = reason, onValueChange = { if (it.length <= 500) reason = it }, label = { Text("Reason") }, minLines = 2, modifier = Modifier.fillMaxWidth())
            }
        },
    )
}
