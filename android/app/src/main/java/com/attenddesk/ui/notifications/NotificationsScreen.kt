package com.attenddesk.ui.notifications

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.EventAvailable
import androidx.compose.material.icons.outlined.FactCheck
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.attenddesk.AppContainer
import com.attenddesk.ui.components.EmptyState
import com.attenddesk.ui.components.GradientHeader
import com.attenddesk.ui.components.LoadingDots
import com.attenddesk.ui.components.NotificationRow
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.util.DhakaZone
import com.attenddesk.ui.util.LocalIs24Hour
import com.attenddesk.ui.util.formatClock
import com.attenddesk.ui.util.parseToDhaka
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.ZonedDateTime
import java.time.temporal.ChronoUnit

private data class Notif(
    val icon: ImageVector,
    val title: String,
    val body: String,
    val at: ZonedDateTime?,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(container: AppContainer, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    val is24h = LocalIs24Hour.current
    var items by remember { mutableStateOf<List<Notif>?>(null) }

    suspend fun load() {
        val out = mutableListOf<Notif>()
        runCatching {
            container.api.history(40).events.forEach { e ->
                if (!e.allChecksPassed) return@forEach
                val verb = if (e.type == "CHECK_IN") "Checked in" else "Checked out"
                out += Notif(
                    icon = Icons.Outlined.FactCheck,
                    title = "$verb · ${formatClock(e.timestamp, is24h)}",
                    body = if (e.isLate) "Marked as late" else if (e.isEarly) "Marked as early leave" else "Attendance recorded",
                    at = parseToDhaka(e.timestamp),
                )
            }
        }
        runCatching {
            container.api.listMyLeaveRequests().requests.forEach { r ->
                if (r.status == "approved" || r.status == "rejected") {
                    out += Notif(
                        icon = Icons.Outlined.EventAvailable,
                        title = "Leave ${r.status}",
                        body = (if (r.subject.isNotBlank()) r.subject + " · " else "") + "${r.fromDay} → ${r.toDay}",
                        at = parseToDhaka(r.decidedAt ?: r.createdAt),
                    )
                }
            }
        }
        items = out.sortedByDescending { it.at?.toInstant()?.toEpochMilli() ?: 0L }.take(40)
    }
    LaunchedEffect(Unit) { scope.launch { load() } }

    Scaffold(
        topBar = { GradientHeader(title = "Notifications", onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            when {
                items == null -> Box(Modifier.fillMaxSize(), Alignment.Center) { LoadingDots() }
                items!!.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    EmptyState(
                        icon = Icons.Outlined.NotificationsNone,
                        title = "You're all caught up",
                        description = "Check-in confirmations and leave decisions show up here.",
                    )
                }
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(items!!) { n ->
                        SectionCard(padding = PaddingValues(12.dp)) {
                            NotificationRow(icon = n.icon, title = n.title, body = n.body, time = relativeTime(n.at))
                        }
                    }
                }
            }
        }
    }
}

private fun relativeTime(at: ZonedDateTime?): String {
    if (at == null) return ""
    val now = ZonedDateTime.now(DhakaZone)
    val mins = ChronoUnit.MINUTES.between(at, now)
    return when {
        mins < 1 -> "now"
        mins < 60 -> "${mins}m ago"
        mins < 60 * 24 -> "${mins / 60}h ago"
        else -> {
            val days = ChronoUnit.DAYS.between(at.toLocalDate(), LocalDate.now(DhakaZone))
            if (days == 1L) "1 day ago" else "$days days ago"
        }
    }
}
