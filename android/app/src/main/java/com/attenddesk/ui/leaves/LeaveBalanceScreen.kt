package com.attenddesk.ui.leaves

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.attenddesk.AppContainer
import com.attenddesk.data.api.LeaveRequestDto
import com.attenddesk.ui.components.ChipTone
import com.attenddesk.ui.components.DonutChart
import com.attenddesk.ui.components.DonutSegment
import com.attenddesk.ui.components.GradientHeader
import com.attenddesk.ui.components.LoadingDots
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.components.StatusChip
import com.attenddesk.ui.theme.Brand500
import com.attenddesk.ui.theme.WarnFg
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val DISPLAY: DateTimeFormatter = DateTimeFormatter.ofPattern("EEE, dd/MM/yyyy", Locale.US)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaveBalanceScreen(container: AppContainer, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var requests by remember { mutableStateOf<List<LeaveRequestDto>?>(null) }
    var refreshing by remember { mutableStateOf(false) }

    suspend fun load() {
        try { requests = container.api.listMyLeaveRequests().requests } catch (_: Throwable) { if (requests == null) requests = emptyList() }
    }
    LaunchedEffect(Unit) { scope.launch { load() } }

    val approvedDays = remember(requests) { requests.orEmpty().filter { it.status == "approved" }.sumOf { it.totalDays } }
    val pendingDays = remember(requests) { requests.orEmpty().filter { it.status == "pending" }.sumOf { it.totalDays } }

    Scaffold(
        topBar = { GradientHeader(title = "My Leave Balance", onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        androidx.compose.material3.pulltorefresh.PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = { refreshing = true; scope.launch { load(); refreshing = false } },
            modifier = Modifier.padding(padding).fillMaxSize(),
        ) {
            if (requests == null) {
                Box(Modifier.fillMaxSize(), Alignment.Center) { LoadingDots() }
                return@PullToRefreshBox
            }
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                SectionCard(title = "My Leave Balance") {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        DonutChart(
                            segments = listOf(
                                DonutSegment(approvedDays.toFloat(), Brand500),
                                DonutSegment(pendingDays.toFloat(), WarnFg),
                            ),
                            diameter = 140.dp,
                            ringWidth = 20.dp,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("$approvedDays", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                                Text("days taken", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        Spacer(Modifier.size(16.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Legend(Brand500, "Approved", approvedDays)
                            Legend(WarnFg, "Pending", pendingDays)
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Days taken to date. Annual entitlement / remaining balance appears once your org configures it.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Text("LEAVE HISTORY", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (requests!!.isEmpty()) {
                    SectionCard {
                        Text("No leave history yet.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else {
                    requests!!.forEach { req -> HistoryCard(req) }
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun Legend(color: Color, label: String, count: Int) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.size(12.dp).clip(CircleShape).background(color))
        Text("$label ($count)", style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun HistoryCard(req: LeaveRequestDto) {
    SectionCard {
        Row(verticalAlignment = Alignment.Top) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    "${req.totalDays} day application",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(rangeLabel(req.fromDay, req.toDay), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                if (req.subject.isNotBlank()) {
                    Text(req.subject, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            LeaveStatusChip(req.status)
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

private fun rangeLabel(fromDay: String, toDay: String): String {
    val from = runCatching { LocalDate.parse(fromDay).format(DISPLAY) }.getOrDefault(fromDay)
    if (fromDay == toDay) return from
    val to = runCatching { LocalDate.parse(toDay).format(DISPLAY) }.getOrDefault(toDay)
    return "$from – $to"
}
