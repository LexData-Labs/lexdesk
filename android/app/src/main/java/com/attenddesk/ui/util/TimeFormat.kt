package com.attenddesk.ui.util

import androidx.compose.runtime.staticCompositionLocalOf
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/** All attendance/leave date math runs in the org's timezone (mirrors the web). */
val DhakaZone: ZoneId = ZoneId.of("Asia/Dhaka")

/**
 * True when the user picked 24-hour display. Provided by MainActivity from
 * [com.attenddesk.data.ThemePreferences.timeFormatFlow] so every time label
 * across the app reacts to the drawer toggle. Defaults to 12-hour.
 */
val LocalIs24Hour = staticCompositionLocalOf { false }

private val H12 = DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH)
private val H24 = DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH)

/** Best-effort parse of an ISO-8601 timestamp (Zulu, offset, or local) → ZonedDateTime in Dhaka. */
fun parseToDhaka(iso: String?): ZonedDateTime? {
    if (iso.isNullOrBlank()) return null
    return runCatching { Instant.parse(iso).atZone(DhakaZone) }
        .recoverCatching { OffsetDateTime.parse(iso).atZoneSameInstant(DhakaZone) }
        .recoverCatching { LocalDateTime.parse(iso).atZone(DhakaZone) }
        .getOrNull()
}

/** "09:37 AM" or "09:37" depending on [is24h]. Returns [fallback] when unparseable. */
fun formatClock(iso: String?, is24h: Boolean, fallback: String = "—"): String {
    val z = parseToDhaka(iso) ?: return fallback
    return z.format(if (is24h) H24 else H12)
}

private val DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH)
private val WEEKDAY = DateTimeFormatter.ofPattern("EEEE", Locale.ENGLISH)

fun formatDay(date: LocalDate): String = date.format(DAY)
fun formatWeekday(date: LocalDate): String = date.format(WEEKDAY)

/**
 * Render a leave length that may be fractional. Half days arrive as 0.5, so
 * "2 days" / "1 day" / "0.5 day" rather than Kotlin's raw "2.0".
 */
fun formatLeaveDays(days: Double): String {
    val n = if (days == days.toLong().toDouble()) days.toLong().toString() else days.toString()
    return if (days == 1.0) "$n day" else "$n days"
}

/** Bare number for a possibly-fractional day count: 2.0 -> "2", 0.5 -> "0.5". */
fun trimDays(days: Double): String =
    if (days == days.toLong().toDouble()) days.toLong().toString() else days.toString()
