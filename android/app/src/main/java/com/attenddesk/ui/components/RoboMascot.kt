package com.attenddesk.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The TeamOS robot, drawn rather than shipped as an asset — keeps it
 * vector-sharp at any size and tintable per theme, with no APK cost.
 *
 * Head-only by design. A full body shrinks to an unreadable blob at the ~50dp
 * the header affords; a face fills the same box with features big enough to
 * actually see. [visor] must be genuinely dark rather than a translucent tint,
 * or the eyes disappear into a light-coloured head.
 */
@Composable
fun RoboMascot(
    modifier: Modifier = Modifier,
    size: Dp = 72.dp,
    tint: Color = Color.White,
    visor: Color = Color(0xFF1A1A1A),
    blink: Boolean = true,
) {
    val transition = rememberInfiniteTransition(label = "robo-blink")
    val animatedEye by transition.animateFloat(
        initialValue = 1f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 3800, easing = { f -> if (f > 0.93f && f < 0.97f) 0.1f else 1f }),
            repeatMode = RepeatMode.Restart,
        ),
        label = "robo-eye",
    )
    val eye = if (blink) animatedEye else 1f

    Canvas(modifier = modifier.size(size)) {
        val w = this.size.width
        val h = this.size.height

        // Antenna
        drawLine(tint, Offset(w * 0.5f, h * 0.04f), Offset(w * 0.5f, h * 0.17f), strokeWidth = w * 0.05f)
        drawCircle(tint, radius = w * 0.07f, center = Offset(w * 0.5f, h * 0.05f))

        // Ears, behind the head
        listOf(0.015f, 0.90f).forEach { x ->
            drawRoundRect(
                color = tint,
                topLeft = Offset(w * x, h * 0.44f),
                size = Size(w * 0.085f, h * 0.20f),
                cornerRadius = CornerRadius(w * 0.04f, w * 0.04f),
            )
        }

        // Head — modest corner radius so it stays a head, not an oval.
        val headTop = h * 0.19f
        val headH = h * 0.70f
        drawRoundRect(
            color = tint,
            topLeft = Offset(w * 0.10f, headTop),
            size = Size(w * 0.80f, headH),
            cornerRadius = CornerRadius(w * 0.24f, w * 0.24f),
        )

        // Visor — opaque and dark, so the eyes read against it.
        val visorTop = headTop + headH * 0.22f
        val visorH = headH * 0.44f
        drawRoundRect(
            color = visor,
            topLeft = Offset(w * 0.20f, visorTop),
            size = Size(w * 0.60f, visorH),
            cornerRadius = CornerRadius(w * 0.16f, w * 0.16f),
        )

        // Eyes — squash on blink rather than vanishing, so it reads as a wink.
        val eyeCy = visorTop + visorH / 2f
        val eyeH = (visorH * 0.46f) * eye.coerceAtLeast(0.1f)
        val eyeW = w * 0.105f
        listOf(0.38f, 0.62f).forEach { cx ->
            drawRoundRect(
                color = tint,
                topLeft = Offset(w * cx - eyeW / 2f, eyeCy - eyeH / 2f),
                size = Size(eyeW, eyeH),
                cornerRadius = CornerRadius(eyeW / 2f, eyeW / 2f),
            )
        }

        // Smile, small and centred under the visor.
        drawRoundRect(
            color = visor.copy(alpha = 0.55f),
            topLeft = Offset(w * 0.42f, headTop + headH * 0.76f),
            size = Size(w * 0.16f, h * 0.022f),
            cornerRadius = CornerRadius(w * 0.02f, w * 0.02f),
        )
    }
}
