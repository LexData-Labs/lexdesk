package com.attenddesk.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.attenddesk.ui.theme.DangerFg
import com.attenddesk.ui.theme.Navy700
import com.attenddesk.ui.theme.Navy900

/**
 * Deep navy-indigo hero bar with rounded bottom corners. Fills behind the status
 * bar (edge-to-edge) and pads its content down past it. Shows a hamburger or back
 * nav icon, a centered/leading title, an optional notification bell (with unread
 * dot), and an optional [bottomContent] block for richer headers (greeting,
 * In/Out pills, etc.).
 */
@Composable
fun GradientHeader(
    title: String,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
    onMenu: (() -> Unit)? = null,
    onBell: (() -> Unit)? = null,
    bellBadge: Boolean = false,
    centerTitle: Boolean = false,
    bottomContent: (@Composable ColumnScope.() -> Unit)? = null,
) {
    val brush = Brush.linearGradient(
        colors = listOf(Navy700, Navy900),
        start = Offset(0f, 0f),
        end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
    )
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(bottomStart = 26.dp, bottomEnd = 26.dp))
            .background(brush),
    ) {
        Column(
            modifier = Modifier
                .statusBarsPadding()
                .padding(horizontal = 6.dp)
                .padding(top = 4.dp, bottom = 16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                when {
                    onBack != null -> IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White)
                    }
                    onMenu != null -> IconButton(onClick = onMenu) {
                        Icon(Icons.Outlined.Menu, "Menu", tint = Color.White)
                    }
                    else -> androidx.compose.foundation.layout.Spacer(Modifier.size(8.dp))
                }
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = if (centerTitle) 0.dp else 6.dp),
                )
                if (onBell != null) {
                    Box {
                        IconButton(onClick = onBell) {
                            Icon(Icons.Outlined.Notifications, "Notifications", tint = Color.White)
                        }
                        if (bellBadge) {
                            Box(
                                Modifier
                                    .align(Alignment.TopEnd)
                                    .offset(x = (-10).dp, y = 10.dp)
                                    .size(9.dp)
                                    .clip(CircleShape)
                                    .background(DangerFg),
                            )
                        }
                    }
                } else {
                    androidx.compose.foundation.layout.Spacer(Modifier.size(8.dp))
                }
            }
            if (bottomContent != null) {
                androidx.compose.foundation.layout.Spacer(Modifier.height(4.dp))
                Column(
                    modifier = Modifier.padding(horizontal = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    content = bottomContent,
                )
            }
        }
    }
}
