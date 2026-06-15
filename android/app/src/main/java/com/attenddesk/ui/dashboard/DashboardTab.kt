package com.attenddesk.ui.dashboard

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.attenddesk.AppContainer
import com.attenddesk.BuildConfig
import com.attenddesk.data.api.FeaturesDto
import com.attenddesk.data.api.HistoryEvent
import com.attenddesk.data.parseFeatureDisabled
import com.attenddesk.ui.components.LoadingDots
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.components.ChipTone
import com.attenddesk.ui.components.toneColors
import com.attenddesk.ui.theme.Brand500
import com.attenddesk.ui.theme.EarlyDot
import com.attenddesk.ui.theme.LateDot
import com.attenddesk.ui.theme.SuccessFg
import com.attenddesk.ui.theme.WarnFg
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.YearMonth
import java.time.ZoneId
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardTab(
    container: AppContainer,
    onOpenHistory: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var events by remember { mutableStateOf<List<HistoryEvent>?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var features by remember { mutableStateOf(FeaturesDto()) }
    val role by container.profileStore.roleFlow.collectAsState(initial = null)
    val email by container.profileStore.emailFlow.collectAsState(initial = null)
    val firstName = remember(email) { email?.substringBefore('@')?.replaceFirstChar { it.titlecase() } }

    suspend fun load() {
        // Always force-refresh — the volatile in-memory cache would otherwise
        // hold the user on stale features after a SUPER_ADMIN change. Tabs
        // that don't pull-to-refresh would never see the new state otherwise.
        try { features = container.policyRepo.get(forceRefresh = true).features } catch (_: Throwable) { /* keep cached */ }
        if (!features.service.history) {
            // Endpoint will 403; don't bother fetching. Empty list keeps the
            // calendar + stats math benign (all zeros) and lets us render a
            // distinct "history disabled" card instead.
            events = emptyList()
            loadError = null
            return
        }
        try {
            loadError = null
            events = container.api.history(200).events
        } catch (t: Throwable) {
            // If the server returned a feature_disabled 403, sync our local
            // belief and render the disabled card instead of a generic error.
            // This covers the race where features were toggled between our
            // policy-fetch and our history-fetch.
            if (parseFeatureDisabled(t) == "service.history") {
                container.policyRepo.invalidate()
                features = features.copy(service = features.service.copy(history = false))
                events = emptyList()
                loadError = null
                return
            }
            android.util.Log.w("DashboardTab", "history() failed", t)
            loadError = "Couldn't load your attendance. Pull to refresh or tap retry."
        }
    }

    LaunchedEffect(Unit) { scope.launch { load() } }

    val bdZone = ZoneId.of("Asia/Dhaka")
    val today = LocalDate.now(bdZone)
    val month = YearMonth.from(today)

    val stats = remember(events) { computeStats(events.orEmpty(), month, bdZone) }
    val calendarStatus = remember(events) { buildCalendarStatus(events.orEmpty(), month, bdZone) }

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
            // Greeting
            Column {
                Text(
                    text = firstName?.let { "Hi, $it" } ?: "Welcome",
                    style = MaterialTheme.typography.titleLarge,
                )
                Text(
                    text = todayLabel(),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            if (role == "ADMIN") {
                AdminBanner(adminWebUrl = BuildConfig.ADMIN_WEB_URL)
            }

            if (!features.service.history) {
                HistoryDisabledCard()
            } else if (events == null && loadError != null) {
                LoadErrorCard(
                    message = loadError!!,
                    onRetry = { scope.launch { load() } },
                )
            } else if (events == null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.padding(vertical = 12.dp),
                ) {
                    LoadingDots()
                    Text(
                        "Loading your attendance…",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                // Stat cards — 2 rows of 2
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        label = "Late this month",
                        value = stats.late.toString(),
                        accent = WarnFg,
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        label = "Early leave this month",
                        value = stats.early.toString(),
                        accent = WarnFg,
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        label = "Days present",
                        value = stats.presentDays.toString(),
                        accent = Brand500,
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        label = "On-time days",
                        value = stats.onTimeDays.toString(),
                        accent = SuccessFg,
                    )
                }

                SectionCard(title = "${month.month.name.lowercase().replaceFirstChar { it.titlecase() }} calendar") {
                    MiniCalendar(
                        statusByDay = calendarStatus,
                        month = month,
                        today = today,
                    )
                    Spacer(Modifier.height(6.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        LegendDot(color = SuccessFg, label = "On-time")
                        LegendDot(color = LateDot, label = "Late")
                        LegendDot(color = EarlyDot, label = "Early")
                    }
                }

                TextButton(onClick = onOpenHistory, modifier = Modifier.fillMaxWidth()) {
                    Text("View full history")
                }
            }
        }
    }
}

@Composable
private fun HistoryDisabledCard() {
    SectionCard(title = "Attendance history") {
        Text(
            text = "Your organization has disabled attendance history for employees. " +
                "Your check-ins still count — your admin can see them in the web reports.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun StatCard(
    modifier: Modifier,
    label: String,
    value: String,
    accent: Color,
) {
    Box(
        modifier = modifier
            .background(MaterialTheme.colorScheme.surface, MaterialTheme.shapes.medium)
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, MaterialTheme.shapes.medium),
    ) {
        Row {
            // Left accent bar — fixed 4dp wide stripe
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(80.dp)
                    .background(accent),
            )
            Column(modifier = Modifier.padding(start = 12.dp, top = 12.dp, end = 14.dp, bottom = 12.dp)) {
                Text(
                    text = label.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = value,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

@Composable
private fun LoadErrorCard(message: String, onRetry: () -> Unit) {
    val tone = toneColors(ChipTone.Danger)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(tone.bg, MaterialTheme.shapes.medium)
            .border(1.dp, tone.border, MaterialTheme.shapes.medium)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodySmall,
            color = tone.fg,
        )
        OutlinedButton(onClick = onRetry, shape = MaterialTheme.shapes.small) {
            Text("Retry")
        }
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(modifier = Modifier.size(8.dp).background(color, androidx.compose.foundation.shape.CircleShape))
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun AdminBanner(adminWebUrl: String) {
    val context = LocalContext.current
    val tone = toneColors(ChipTone.Info)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(tone.bg, MaterialTheme.shapes.medium)
            .border(1.dp, tone.border, MaterialTheme.shapes.medium)
            .padding(14.dp),
    ) {
        Column {
            Text(
                "You're signed in as admin",
                style = MaterialTheme.typography.titleSmall,
                color = tone.fg,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                "Use the web dashboard for full controls. Marking attendance from the app still works.",
                style = MaterialTheme.typography.bodySmall,
                color = tone.fg,
            )
            Spacer(Modifier.height(10.dp))
            OutlinedButton(
                onClick = {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(adminWebUrl))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                },
                shape = MaterialTheme.shapes.small,
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.OpenInNew,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                )
                Spacer(Modifier.size(6.dp))
                Text("Open admin web")
            }
        }
    }
}

private data class DashStats(
    val late: Int,
    val early: Int,
    val presentDays: Int,
    val onTimeDays: Int,
)

/**
 * For each day, finds the earliest successful CHECK_IN and the latest
 * successful CHECK_OUT. Multiple check-ins on the same day collapse to one;
 * the day's late/on-time status comes from the first one only.
 */
private data class DayCanon(
    val firstCheckIn: HistoryEvent? = null,
    val lastCheckOut: HistoryEvent? = null,
)

private fun buildCanon(events: List<HistoryEvent>, zone: ZoneId): Map<LocalDate, DayCanon> {
    val out = mutableMapOf<LocalDate, DayCanon>()
    for (e in events) {
        if (!e.allChecksPassed) continue
        val date = e.toBdDate(zone) ?: continue
        val slot = out[date] ?: DayCanon()
        val updated = when (e.type) {
            "CHECK_IN" -> {
                val cur = slot.firstCheckIn
                if (cur == null || e.timestamp < cur.timestamp) slot.copy(firstCheckIn = e) else slot
            }
            "CHECK_OUT" -> {
                val cur = slot.lastCheckOut
                if (cur == null || e.timestamp > cur.timestamp) slot.copy(lastCheckOut = e) else slot
            }
            else -> slot
        }
        out[date] = updated
    }
    return out
}

private fun computeStats(events: List<HistoryEvent>, month: YearMonth, zone: ZoneId): DashStats {
    val canon = buildCanon(events, zone).filterKeys { YearMonth.from(it) == month }
    var late = 0
    var early = 0
    var onTimeDays = 0
    for ((_, slot) in canon) {
        slot.firstCheckIn?.let { if (it.isLate) late++ else onTimeDays++ }
        if (slot.lastCheckOut?.isEarly == true) early++
    }
    return DashStats(
        late = late,
        early = early,
        presentDays = canon.size,
        onTimeDays = onTimeDays,
    )
}

private fun buildCalendarStatus(
    events: List<HistoryEvent>,
    month: YearMonth,
    zone: ZoneId,
): Map<LocalDate, DayStatus> {
    val canon = buildCanon(events, zone).filterKeys { YearMonth.from(it) == month }
    val out = mutableMapOf<LocalDate, DayStatus>()
    for ((date, slot) in canon) {
        // Late takes priority over early-leave when both happen on the same day
        // — being late is the more visible policy break.
        out[date] = when {
            slot.firstCheckIn?.isLate == true   -> DayStatus.Late
            slot.lastCheckOut?.isEarly == true  -> DayStatus.EarlyLeave
            else                                -> DayStatus.OnTime
        }
    }
    return out
}

private fun HistoryEvent.toBdDate(zone: ZoneId): LocalDate? = try {
    OffsetDateTime.parse(timestamp).atZoneSameInstant(zone).toLocalDate()
} catch (_: Throwable) { null }

private fun todayLabel(): String =
    SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(Date())
