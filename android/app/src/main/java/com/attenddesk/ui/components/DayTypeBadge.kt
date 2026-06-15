package com.attenddesk.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/** Day classification shown as a colored letter badge on attendance rows. */
enum class DayType(val letter: String, val tone: ChipTone) {
    Present("P", ChipTone.Success),
    Delay("D", ChipTone.Info),       // present but late
    WeeklyOff("W", ChipTone.Muted),  // weekend / weekly holiday
    Absent("A", ChipTone.Danger),
}

@Composable
fun DayTypeBadge(type: DayType, modifier: Modifier = Modifier) {
    val c = toneColors(type.tone)
    Box(
        modifier = modifier
            .size(22.dp)
            .clip(CircleShape)
            .background(c.bg),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = type.letter,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = c.fg,
        )
    }
}
