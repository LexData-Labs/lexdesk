package com.attenddesk.ui.leaves

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.attenddesk.AppContainer
import com.attenddesk.data.api.LeaveRequestDto
import com.attenddesk.data.api.LeaveRequestSubmitRequest
import com.attenddesk.data.parseFeatureDisabled
import com.attenddesk.ui.components.ChipTone
import com.attenddesk.ui.components.LoadingDots
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.components.StatusChip
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale

private val BD_ZONE: ZoneId = ZoneId.of("Asia/Dhaka")
private val ISO_DAY: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
private val DISPLAY_DAY: DateTimeFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeavesTab(
    container: AppContainer,
    onFeatureDisabled: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var requests by remember { mutableStateOf<List<LeaveRequestDto>?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var showSubmit by remember { mutableStateOf(false) }

    suspend fun load() {
        try {
            loadError = null
            requests = container.api.listMyLeaveRequests().requests
        } catch (t: Throwable) {
            if (parseFeatureDisabled(t) == "service.leaveRequests") {
                container.policyRepo.invalidate()
                onFeatureDisabled()
                return
            }
            android.util.Log.w("LeavesTab", "load failed", t)
            loadError = "Couldn't load your leave requests. Pull to refresh or tap retry."
        }
    }

    LaunchedEffect(Unit) { scope.launch { load() } }

    androidx.compose.material3.pulltorefresh.PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = {
            refreshing = true
            scope.launch { load(); refreshing = false }
        },
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Column {
                Text(
                    text = "Leave requests",
                    style = MaterialTheme.typography.titleLarge,
                )
                Text(
                    text = "Apply for time off — your admin will approve or reject from the web dashboard.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Button(
                onClick = { showSubmit = true },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Request leave") }

            when {
                requests == null && loadError != null -> {
                    SectionCard {
                        Text(loadError!!, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(8.dp))
                        TextButton(onClick = { scope.launch { load() } }) { Text("Retry") }
                    }
                }
                requests == null -> {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(vertical = 12.dp),
                    ) {
                        LoadingDots()
                        Text(
                            "Loading your requests…",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                requests!!.isEmpty() -> {
                    SectionCard {
                        Text(
                            "No leave requests yet. Tap Request leave to submit your first one.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                else -> {
                    val pending = requests!!.filter { it.status == "pending" }
                    val decided = requests!!.filter { it.status != "pending" }
                    if (pending.isNotEmpty()) {
                        Text(
                            text = "Pending (${pending.size})".uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        pending.forEach { req ->
                            LeaveCard(
                                req = req,
                                onCancel = {
                                    scope.launch {
                                        runCatching { container.api.cancelLeaveRequest(req.id) }
                                        load()
                                    }
                                },
                            )
                        }
                    }
                    if (decided.isNotEmpty()) {
                        Text(
                            text = "Decided (${decided.size})".uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        decided.forEach { req ->
                            LeaveCard(req = req, onCancel = null)
                        }
                    }
                }
            }
        }
    }

    if (showSubmit) {
        SubmitLeaveDialog(
            onDismiss = { showSubmit = false },
            onSubmit = { fromDay, toDay, subject, details ->
                scope.launch {
                    val ok = runCatching {
                        container.api.submitLeaveRequest(
                            LeaveRequestSubmitRequest(
                                fromDay = fromDay,
                                toDay = toDay,
                                subject = subject,
                                details = details,
                            ),
                        )
                    }.onFailure { t ->
                        if (parseFeatureDisabled(t) == "service.leaveRequests") {
                            container.policyRepo.invalidate()
                            onFeatureDisabled()
                        }
                    }.isSuccess
                    if (ok) {
                        showSubmit = false
                        load()
                    }
                }
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SubmitLeaveDialog(
    onDismiss: () -> Unit,
    onSubmit: (String, String, String, String) -> Unit,
) {
    var fromDay by remember { mutableStateOf(LocalDate.now(BD_ZONE)) }
    var toDay by remember { mutableStateOf(LocalDate.now(BD_ZONE)) }
    var subject by remember { mutableStateOf("") }
    var details by remember { mutableStateOf("") }
    var picking by remember { mutableStateOf<PickWhich?>(null) }

    val subjectOk = subject.trim().isNotEmpty()
    val rangeOk = !fromDay.isAfter(toDay)
    val canSubmit = subjectOk && rangeOk

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(
                onClick = {
                    if (canSubmit) {
                        onSubmit(
                            fromDay.format(ISO_DAY),
                            toDay.format(ISO_DAY),
                            subject.trim(),
                            details.trim(),
                        )
                    }
                },
                enabled = canSubmit,
            ) { Text("Submit") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
        title = { Text("Request leave") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { picking = PickWhich.From },
                        modifier = Modifier.weight(1f),
                    ) {
                        Column(horizontalAlignment = Alignment.Start) {
                            Text("From", style = MaterialTheme.typography.labelSmall)
                            Text(fromDay.format(DISPLAY_DAY), style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                    OutlinedButton(
                        onClick = { picking = PickWhich.To },
                        modifier = Modifier.weight(1f),
                    ) {
                        Column(horizontalAlignment = Alignment.Start) {
                            Text("To", style = MaterialTheme.typography.labelSmall)
                            Text(toDay.format(DISPLAY_DAY), style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
                val days = java.time.temporal.ChronoUnit.DAYS.between(fromDay, toDay).toInt() + 1
                Text(
                    text = if (!rangeOk) {
                        "End date must be on or after the start date."
                    } else {
                        "$days day${if (days == 1) "" else "s"}"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = if (!rangeOk) MaterialTheme.colorScheme.error
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedTextField(
                    value = subject,
                    onValueChange = { if (it.length <= 120) subject = it },
                    label = { Text("Subject") },
                    placeholder = { Text("e.g. Family wedding") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = details,
                    onValueChange = { if (it.length <= 1000) details = it },
                    label = { Text("Details (optional)") },
                    minLines = 4,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
    )

    picking?.let { which ->
        val initial = if (which == PickWhich.From) fromDay else toDay
        val state = rememberDatePickerState(
            initialSelectedDateMillis = initial.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli(),
        )
        DatePickerDialog(
            onDismissRequest = { picking = null },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { ms ->
                        val picked = Instant.ofEpochMilli(ms)
                            .atZone(ZoneOffset.UTC)
                            .toLocalDate()
                        if (which == PickWhich.From) {
                            fromDay = picked
                            if (toDay.isBefore(picked)) toDay = picked
                        } else {
                            toDay = picked
                        }
                    }
                    picking = null
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { picking = null }) { Text("Cancel") }
            },
        ) {
            DatePicker(state = state)
        }
    }
}

private enum class PickWhich { From, To }

@Composable
private fun LeaveCard(req: LeaveRequestDto, onCancel: (() -> Unit)?) {
    SectionCard {
        Row(verticalAlignment = Alignment.Top) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = formatRange(req.fromDay, req.toDay),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = "${req.totalDays} day${if (req.totalDays == 1) "" else "s"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(6.dp))
                if (req.subject.isNotBlank()) {
                    Text(
                        text = req.subject,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                if (req.details.isNotBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = req.details,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (!req.decisionNote.isNullOrBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "Admin note: ${req.decisionNote}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.width(8.dp))
            LeaveStatusChip(req.status)
        }
        if (onCancel != null && req.status == "pending") {
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onCancel) { Text("Cancel request") }
        }
    }
}

@Composable
private fun LeaveStatusChip(status: String) {
    val tone = when (status) {
        "approved" -> ChipTone.Success
        "rejected" -> ChipTone.Danger
        "cancelled" -> ChipTone.Muted
        else -> ChipTone.Warn
    }
    StatusChip(text = status, tone = tone, showDot = false)
}

private fun formatRange(fromDay: String, toDay: String): String {
    val from = LocalDate.parse(fromDay).format(DISPLAY_DAY)
    if (fromDay == toDay) return from
    val to = LocalDate.parse(toDay).format(DISPLAY_DAY)
    return "$from – $to"
}
