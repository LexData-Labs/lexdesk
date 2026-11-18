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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The TeamOS robot, drawn rather than shipped as an asset — the APK is already
 * ~116 MB and this keeps it vector-sharp at any size and tintable per theme.
 * Mirrors the mascot on the web sign-in page so the two feel like one product.
 *
 * [blink] gives it a slow idle blink; turn it off for small decorative uses
 * where motion would just be noise.
 */
@Composable
fun RoboMascot(
    modifier: Modifier = Modifier,
    size: Dp = 72.dp,
    tint: Color = Color.White,
    blink: Boolean = true,
) {
    val transition = rememberInfiniteTransition(label = "robo-blink")
    val animatedEye by transition.animateFloat(
        initialValue = 1f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            // Open for most of the cycle, then a quick wink near the end.
            animation = tween(durationMillis = 4000, easing = { f -> if (f > 0.94f && f < 0.98f) 0f else 1f }),
            repeatMode = RepeatMode.Restart,
        ),
        label = "robo-eye",
    )
    val eye = if (blink) animatedEye else 1f

    Canvas(modifier = modifier.size(size)) {
        val w = this.size.width
        val h = this.size.height
        val body = tint
        val dark = tint.copy(alpha = 0.25f)

        // Antenna
        drawLine(body, Offset(w * 0.5f, h * 0.10f), Offset(w * 0.5f, h * 0.22f), strokeWidth = w * 0.045f)
        drawCircle(body, radius = w * 0.055f, center = Offset(w * 0.5f, h * 0.08f))

        // Head
        drawRoundRect(
            color = body,
            topLeft = Offset(w * 0.18f, h * 0.22f),
            size = Size(w * 0.64f, h * 0.40f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(w * 0.18f, w * 0.18f),
        )
        // Visor
        drawRoundRect(
            color = dark,
            topLeft = Offset(w * 0.26f, h * 0.30f),
            size = Size(w * 0.48f, h * 0.22f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(w * 0.10f, w * 0.10f),
        )
        // Eyes — squash vertically on blink rather than vanishing, which reads
        // as a wink instead of a flicker.
        val eyeH = (h * 0.075f) * eye.coerceAtLeast(0.12f)
        listOf(0.385f, 0.615f).forEach { cx ->
            drawRoundRect(
                color = body,
                topLeft = Offset(w * cx - w * 0.045f, h * 0.405f - eyeH / 2f),
                size = Size(w * 0.09f, eyeH),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(w * 0.03f, w * 0.03f),
            )
        }

        // Ears
        listOf(0.12f, 0.82f).forEach { x ->
            drawRoundRect(
                color = body,
                topLeft = Offset(w * x, h * 0.34f),
                size = Size(w * 0.06f, h * 0.14f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(w * 0.03f, w * 0.03f),
            )
        }

        // Body
        drawRoundRect(
            color = body,
            topLeft = Offset(w * 0.26f, h * 0.66f),
            size = Size(w * 0.48f, h * 0.26f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(w * 0.14f, w * 0.14f),
        )
        drawCircle(dark, radius = w * 0.05f, center = Offset(w * 0.5f, h * 0.78f))
    }
}
