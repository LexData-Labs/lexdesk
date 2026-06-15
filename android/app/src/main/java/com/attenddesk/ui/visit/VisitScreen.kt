package com.attenddesk.ui.visit

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
import com.attenddesk.data.api.VisitDto
import com.attenddesk.data.api.VisitSubmitRequest
import com.attenddesk.ui.requests.DateField
import com.attenddesk.ui.requests.REQ_DISPLAY_DAY
import com.attenddesk.ui.requests.REQ_ISO_DAY
import com.attenddesk.ui.requests.RequestRowCard
import com.attenddesk.ui.requests.RequestScreenScaffold
import kotlinx.coroutines.launch
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VisitScreen(container: AppContainer, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<VisitDto>?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var showForm by remember { mutableStateOf(false) }

    suspend fun load() {
        runCatching { container.api.listMyVisits().requests }.onSuccess { items = it }.onFailure { if (items == null) items = emptyList() }
    }
    LaunchedEffect(Unit) { load() }

    RequestScreenScaffold(
        title = "Visit Applications",
        onBack = onBack,
        onAdd = { showForm = true },
        refreshing = refreshing,
        onRefresh = { refreshing = true; scope.launch { load(); refreshing = false } },
        items = items,
        emptyTitle = "No visit applications",
        emptyText = "Apply for a field visit with the + button.",
        key = { it.id },
    ) { v ->
        RequestRowCard(
            title = v.subject,
            lines = listOf(v.place, range(v.fromDay, v.toDay) + " · ${v.totalDays} day${if (v.totalDays == 1) "" else "s"}", v.details),
            status = v.status,
            decisionNote = v.decisionNote,
            onCancel = { scope.launch { runCatching { container.api.cancelVisit(v.id) }; load() } },
        )
    }

    if (showForm) {
        VisitForm(onDismiss = { showForm = false }, onSubmit = { req ->
            scope.launch {
                val ok = runCatching { container.api.submitVisit(req) }.isSuccess
                if (ok) { showForm = false; load() }
            }
        })
    }
}

private fun range(from: String, to: String): String {
    val f = runCatching { LocalDate.parse(from).format(REQ_DISPLAY_DAY) }.getOrDefault(from)
    if (from == to) return f
    val t = runCatching { LocalDate.parse(to).format(REQ_DISPLAY_DAY) }.getOrDefault(to)
    return "$f – $t"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VisitForm(onDismiss: () -> Unit, onSubmit: (VisitSubmitRequest) -> Unit) {
    var fromDay by remember { mutableStateOf(LocalDate.now()) }
    var toDay by remember { mutableStateOf(LocalDate.now()) }
    var place by remember { mutableStateOf("") }
    var subject by remember { mutableStateOf("") }
    var details by remember { mutableStateOf("") }
    val rangeOk = !fromDay.isAfter(toDay)
    val canSubmit = subject.trim().isNotEmpty() && place.trim().isNotEmpty() && rangeOk

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(enabled = canSubmit, onClick = {
                onSubmit(VisitSubmitRequest(
                    fromDay = fromDay.format(REQ_ISO_DAY),
                    toDay = toDay.format(REQ_ISO_DAY),
                    place = place.trim(),
                    subject = subject.trim(),
                    details = details.trim(),
                ))
            }) { Text("Submit") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        title = { Text("New visit") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    DateField("From", fromDay, { fromDay = it; if (toDay.isBefore(it)) toDay = it }, Modifier.weight(1f))
                    DateField("To", toDay, { toDay = it }, Modifier.weight(1f))
                }
                if (!rangeOk) Text("End must be on/after start.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                OutlinedTextField(value = place, onValueChange = { if (it.length <= 120) place = it }, label = { Text("Place") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = subject, onValueChange = { if (it.length <= 120) subject = it }, label = { Text("Purpose") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = details, onValueChange = { if (it.length <= 1000) details = it }, label = { Text("Details (optional)") }, minLines = 3, modifier = Modifier.fillMaxWidth())
            }
        },
    )
}
