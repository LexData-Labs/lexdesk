package com.attenddesk.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

enum class ChipTone { Success, Danger, Warn, Info, Muted }

@Composable
fun StatusChip(
    text: String,
    tone: ChipTone,
    modifier: Modifier = Modifier,
    showDot: Boolean = true,
) {
    val c = toneColors(tone)
    val shape = RoundedCornerShape(999.dp)
    Row(
        modifier = modifier
            .background(c.bg, shape)
            .border(1.dp, c.border, shape)
            .padding(PaddingValues(horizontal = 8.dp, vertical = 3.dp)),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (showDot) {
            androidx.compose.foundation.layout.Box(
                Modifier
                    .size(6.dp)
                    .background(c.fg, CircleShape)
            )
        }
        Text(
            text = text,
            color = c.fg,
            style = MaterialTheme.typography.labelMedium,
        )
    }
}
