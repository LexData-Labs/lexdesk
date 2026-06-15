package com.attenddesk.ui.remote

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
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
import com.attenddesk.data.api.RemoteDto
import com.attenddesk.data.api.RemoteSubmitRequest
import com.attenddesk.ui.requests.DateField
import com.attenddesk.ui.requests.REQ_ISO_DAY
import com.attenddesk.ui.requests.RequestRowCard
import com.attenddesk.ui.requests.RequestScreenScaffold
import kotlinx.coroutines.launch
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RemoteScreen(container: AppContainer, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<RemoteDto>?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var showForm by remember { mutableStateOf(false) }

    suspend fun load() {
        runCatching { container.api.listMyRemote().requests }.onSuccess { items = it }.onFailure { if (items == null) items = emptyList() }
    }
    LaunchedEffect(Unit) { load() }

    RequestScreenScaffold(
        title = "Remote Attendance",
        onBack = onBack,
        onAdd = { showForm = true },
        refreshing = refreshing,
        onRefresh = { refreshing = true; scope.launch { load(); refreshing = false } },
        items = items,
        emptyTitle = "No remote requests",
        emptyText = "Request remote attendance with the + button.",
        key = { it.id },
    ) { r ->
        RequestRowCard(
            title = "Remote · ${r.day}",
            lines = listOf(r.place, r.reason),
            status = r.status,
            decisionNote = r.decisionNote,
            onCancel = { scope.launch { runCatching { container.api.cancelRemote(r.id) }; load() } },
        )
    }

    if (showForm) {
        RemoteForm(onDismiss = { showForm = false }, onSubmit = { req ->
            scope.launch {
                val ok = runCatching { container.api.submitRemote(req) }.isSuccess
                if (ok) { showForm = false; load() }
            }
        })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RemoteForm(onDismiss: () -> Unit, onSubmit: (RemoteSubmitRequest) -> Unit) {
    var day by remember { mutableStateOf(LocalDate.now()) }
    var place by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    val canSubmit = reason.trim().isNotEmpty()

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(enabled = canSubmit, onClick = {
                onSubmit(RemoteSubmitRequest(day = day.format(REQ_ISO_DAY), reason = reason.trim(), place = place.trim()))
            }) { Text("Submit") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        title = { Text("Remote attendance") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                DateField("Date", day, { day = it }, Modifier.fillMaxWidth())
                OutlinedTextField(value = place, onValueChange = { if (it.length <= 120) place = it }, label = { Text("Location (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = reason, onValueChange = { if (it.length <= 500) reason = it }, label = { Text("Reason") }, minLines = 2, modifier = Modifier.fillMaxWidth())
            }
        },
    )
}
