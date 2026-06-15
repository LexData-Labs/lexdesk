package com.attenddesk.ui.claim

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.attenddesk.AppContainer
import com.attenddesk.data.api.ClaimDto
import com.attenddesk.data.api.ClaimSubmitRequest
import com.attenddesk.ui.requests.DateField
import com.attenddesk.ui.requests.REQ_ISO_DAY
import com.attenddesk.ui.requests.RequestRowCard
import com.attenddesk.ui.requests.RequestScreenScaffold
import kotlinx.coroutines.launch
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClaimScreen(container: AppContainer, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<ClaimDto>?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var showForm by remember { mutableStateOf(false) }

    suspend fun load() {
        runCatching { container.api.listMyClaims().requests }.onSuccess { items = it }.onFailure { if (items == null) items = emptyList() }
    }
    androidx.compose.runtime.LaunchedEffect(Unit) { load() }

    RequestScreenScaffold(
        title = "Claim",
        onBack = onBack,
        onAdd = { showForm = true },
        refreshing = refreshing,
        onRefresh = { refreshing = true; scope.launch { load(); refreshing = false } },
        items = items,
        emptyTitle = "No claims",
        emptyText = "Submit an expense claim with the + button.",
        key = { it.id },
    ) { c ->
        RequestRowCard(
            title = "${c.currency} ${trimAmount(c.amount)} · ${c.subject}",
            lines = listOf(c.category, c.day),
            status = c.status,
            decisionNote = c.decisionNote,
            onCancel = { scope.launch { runCatching { container.api.cancelClaim(c.id) }; load() } },
        )
    }

    if (showForm) {
        ClaimForm(
            onDismiss = { showForm = false },
            onSubmit = { req ->
                scope.launch {
                    val ok = runCatching { container.api.submitClaim(req) }.isSuccess
                    if (ok) { showForm = false; load() }
                }
            },
        )
    }
}

private fun trimAmount(a: Double): String = if (a == a.toLong().toDouble()) a.toLong().toString() else a.toString()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ClaimForm(onDismiss: () -> Unit, onSubmit: (ClaimSubmitRequest) -> Unit) {
    var subject by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var day by remember { mutableStateOf(LocalDate.now()) }
    var details by remember { mutableStateOf("") }
    val amountVal = amount.toDoubleOrNull()
    val canSubmit = subject.trim().isNotEmpty() && amountVal != null && amountVal >= 0

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(
                enabled = canSubmit,
                onClick = {
                    onSubmit(ClaimSubmitRequest(
                        subject = subject.trim(),
                        category = category.trim(),
                        amount = amountVal ?: 0.0,
                        currency = "BDT",
                        day = day.format(REQ_ISO_DAY),
                        details = details.trim(),
                    ))
                },
            ) { Text("Submit") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        title = { Text("New claim") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(value = subject, onValueChange = { if (it.length <= 120) subject = it }, label = { Text("Subject") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = category, onValueChange = { if (it.length <= 60) category = it }, label = { Text("Category (e.g. Travel)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text("Amount (BDT)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                DateField(label = "Date", day = day, onPick = { day = it }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = details, onValueChange = { if (it.length <= 1000) details = it }, label = { Text("Details (optional)") }, minLines = 3, modifier = Modifier.fillMaxWidth())
            }
        },
    )
}
