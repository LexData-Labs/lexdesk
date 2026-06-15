package com.attenddesk.ui.attendance

import com.attenddesk.data.api.HistoryEvent
import com.attenddesk.ui.components.DayType
import com.attenddesk.ui.dashboard.DayStatus
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.YearMonth
import java.time.ZoneId

/**
 * Shared attendance math used by the Home / Attendance / My-Attendance / Leave
 * screens. Extracted from the original DashboardTab so the new layout can reuse
 * the same canonicalization (one row per day = earliest IN + latest OUT).
 */

fun HistoryEvent.toBdDate(zone: ZoneId): LocalDate? = try {
    OffsetDateTime.parse(timestamp).atZoneSameInstant(zone).toLocalDate()
} catch (_: Throwable) {
    null
}

data class DayCanon(
    val firstCheckIn: HistoryEvent? = null,
    val lastCheckOut: HistoryEvent? = null,
)

fun buildCanon(events: List<HistoryEvent>, zone: ZoneId): Map<LocalDate, DayCanon> {
    val out = mutableMapOf<LocalDate, DayCanon>()
    for (e in events) {
        if (!e.allChecksPassed) continue
        val date = e.toBdDate(zone) ?: continue
        val slot = out[date] ?: DayCanon()
        out[date] = when (e.type) {
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
    }
    return out
}

data class MonthStats(
    val presentDays: Int,
    val late: Int,
    val early: Int,
    val onTimeDays: Int,
)

fun computeMonthStats(events: List<HistoryEvent>, month: YearMonth, zone: ZoneId): MonthStats {
    val canon = buildCanon(events, zone).filterKeys { YearMonth.from(it) == month }
    var late = 0
    var early = 0
    var onTimeDays = 0
    for ((_, slot) in canon) {
        slot.firstCheckIn?.let { if (it.isLate) late++ else onTimeDays++ }
        if (slot.lastCheckOut?.isEarly == true) early++
    }
    return MonthStats(presentDays = canon.size, late = late, early = early, onTimeDays = onTimeDays)
}

fun buildCalendarStatus(events: List<HistoryEvent>, month: YearMonth, zone: ZoneId): Map<LocalDate, DayStatus> {
    val canon = buildCanon(events, zone).filterKeys { YearMonth.from(it) == month }
    val out = mutableMapOf<LocalDate, DayStatus>()
    for ((date, slot) in canon) {
        out[date] = when {
            slot.firstCheckIn?.isLate == true  -> DayStatus.Late
            slot.lastCheckOut?.isEarly == true -> DayStatus.EarlyLeave
            else                               -> DayStatus.OnTime
        }
    }
    return out
}

/** One row on the My Attendance list: a present day with its IN/OUT + classification. */
data class DayRow(
    val date: LocalDate,
    val type: DayType,
    val inIso: String?,
    val outIso: String?,
)

/** Days that have at least one passing check, newest first. */
fun buildDayRows(events: List<HistoryEvent>, zone: ZoneId): List<DayRow> =
    buildCanon(events, zone).entries
        .sortedByDescending { it.key }
        .map { (date, slot) ->
            val late = slot.firstCheckIn?.isLate == true
            DayRow(
                date = date,
                type = if (late) DayType.Delay else DayType.Present,
                inIso = slot.firstCheckIn?.timestamp,
                outIso = slot.lastCheckOut?.timestamp,
            )
        }

/** Today's canonical IN/OUT (or null when no passing check yet). */
fun todayCanon(events: List<HistoryEvent>, today: LocalDate, zone: ZoneId): DayCanon? =
    buildCanon(events, zone)[today]
