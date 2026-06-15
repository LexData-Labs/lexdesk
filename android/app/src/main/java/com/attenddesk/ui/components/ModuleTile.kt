package com.attenddesk.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.attenddesk.ui.theme.ChipPurpleBg
import com.attenddesk.ui.theme.ChipPurpleBgDark
import com.attenddesk.ui.theme.ChipPurpleFg
import com.attenddesk.ui.theme.ChipPurpleFgDark
import com.attenddesk.ui.theme.LocalIsDark

/**
 * Light-indigo rounded square holding a single glyph — the recurring "icon chip"
 * used behind every module/action label in the reference design.
 */
@Composable
fun IconChip(
    icon: ImageVector,
    modifier: Modifier = Modifier,
    size: Dp = 48.dp,
    bg: Color? = null,
    fg: Color? = null,
) {
    val dark = LocalIsDark.current
    val chipBg = bg ?: if (dark) ChipPurpleBgDark else ChipPurpleBg
    val chipFg = fg ?: if (dark) ChipPurpleFgDark else ChipPurpleFg
    Box(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(14.dp))
            .background(chipBg),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = chipFg, modifier = Modifier.size(size * 0.5f))
    }
}

/** One entry in a [ModuleGrid]. */
data class ModuleItem(
    val label: String,
    val icon: ImageVector,
    val onClick: () -> Unit,
    val enabled: Boolean = true,
)

/** A single tappable tile: icon chip above a (up to 2-line) label. */
@Composable
fun ModuleTile(item: ModuleItem, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable(enabled = item.enabled, onClick = item.onClick)
            .padding(vertical = 10.dp, horizontal = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        IconChip(item.icon)
        Text(
            text = item.label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            minLines = 2,
        )
    }
}

/**
 * Lays out [items] in fixed-width rows of [columns] (default 3) — a manual grid
 * so it can sit inside a vertically-scrolling Column without nested-scroll
 * conflicts that a LazyVerticalGrid would cause.
 */
@Composable
fun ModuleGrid(
    items: List<ModuleItem>,
    modifier: Modifier = Modifier,
    columns: Int = 3,
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        items.chunked(columns).forEach { rowItems ->
            Row(modifier = Modifier.fillMaxWidth()) {
                rowItems.forEach { item ->
                    ModuleTile(item, modifier = Modifier.weight(1f))
                }
                // Pad short final rows so tiles stay left-aligned to their column.
                repeat(columns - rowItems.size) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}
