package com.attenddesk.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.attenddesk.ui.theme.EarlyDot
import com.attenddesk.ui.theme.LateDot
import com.attenddesk.ui.theme.SuccessFg
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle as JTextStyle
import java.util.Locale

/** Per-day status used to color the calendar dot. */
enum class DayStatus { None, OnTime, Late, EarlyLeave }

/**
 * A minimal month calendar — 7 columns (Sun..Sat), up to 6 rows, with a colored
 * dot under each date that had an attendance event. No external calendar library.
 */
@Composable
fun MiniCalendar(
    statusByDay: Map<LocalDate, DayStatus>,
    month: YearMonth,
    modifier: Modifier = Modifier,
    today: LocalDate = LocalDate.now(),
) {
    Column(modifier = modifier.fillMaxWidth()) {
        // Month header
        Text(
            text = "${month.month.getDisplayName(JTextStyle.FULL, Locale.getDefault())} ${month.year}",
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.padding(bottom = 10.dp),
        )

        // Day-of-week labels — Sunday-first to match common BD/US calendars.
        Row(modifier = Modifier.fillMaxWidth()) {
            for (label in listOf("S", "M", "T", "W", "T", "F", "S")) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
            }
        }
        Spacer(Modifier.height(4.dp))

        // Build the cells. Leading blanks for the first row + trailing blanks
        // for the last row to keep the grid 7-wide.
        val firstDay = month.atDay(1)
        val leadingBlanks = (firstDay.dayOfWeek.toSundayFirstIndex()) // 0..6
        val totalDays = month.lengthOfMonth()
        val totalCells = leadingBlanks + totalDays
        val rows = (totalCells + 6) / 7  // ceil

        for (row in 0 until rows) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
            ) {
                for (col in 0 until 7) {
                    val cellIndex = row * 7 + col
                    val dayNumber = cellIndex - leadingBlanks + 1
                    if (dayNumber in 1..totalDays) {
                        val date = month.atDay(dayNumber)
                        DayCell(
                            day = dayNumber,
                            status = statusByDay[date] ?: DayStatus.None,
                            isToday = date == today,
                            modifier = Modifier.weight(1f),
                        )
                    } else {
                        Spacer(Modifier.weight(1f).height(36.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun DayCell(
    day: Int,
    status: DayStatus,
    isToday: Boolean,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .padding(2.dp)
            .height(36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .let {
                    if (isToday) it.background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f), CircleShape)
                    else it
                },
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = day.toString(),
                style = MaterialTheme.typography.bodySmall,
                color = if (isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                fontWeight = if (isToday) FontWeight.SemiBold else FontWeight.Normal,
            )
        }
        Spacer(Modifier.height(2.dp))
        val dotColor: Color? = when (status) {
            DayStatus.OnTime     -> SuccessFg
            DayStatus.Late       -> LateDot
            DayStatus.EarlyLeave -> EarlyDot
            DayStatus.None       -> null
        }
        Box(
            modifier = Modifier
                .size(4.dp)
                .background(dotColor ?: Color.Transparent, CircleShape),
        )
    }
}

/**
 * Convert ISO 8601 DayOfWeek (Mon=1..Sun=7) to a Sunday-first column index (Sun=0..Sat=6).
 */
private fun DayOfWeek.toSundayFirstIndex(): Int = when (this) {
    DayOfWeek.SUNDAY    -> 0
    DayOfWeek.MONDAY    -> 1
    DayOfWeek.TUESDAY   -> 2
    DayOfWeek.WEDNESDAY -> 3
    DayOfWeek.THURSDAY  -> 4
    DayOfWeek.FRIDAY    -> 5
    DayOfWeek.SATURDAY  -> 6
}
