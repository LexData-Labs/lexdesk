package com.attenddesk.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/**
 * A short confetti burst for a successful check-in — the one moment of this app
 * people hit every single day.
 *
 * Deliberately a one-shot: it animates once per [key] (the event id) and then
 * sits at rest, so recomposition or a rotate doesn't re-fire it. Nothing here
 * blocks or delays the result text, which stays the source of truth.
 */
@Composable
fun CheckInCelebration(key: Any?, modifier: Modifier = Modifier) {
    val progress = remember(key) { Animatable(0f) }
    // Fixed per burst so particles don't reshuffle on every frame.
    val pieces = remember(key) {
        List(18) {
            Particle(
                angle = Random.nextDouble(-0.95, -0.15).toFloat(),
                speed = Random.nextDouble(0.55, 1.0).toFloat(),
                spin = Random.nextDouble(-1.0, 1.0).toFloat(),
                size = Random.nextDouble(3.5, 7.0).toFloat(),
                tone = Random.nextInt(4),
            )
        }
    }

    LaunchedEffect(key) {
        if (key != null) {
            progress.snapTo(0f)
            progress.animateTo(1f, animationSpec = tween(durationMillis = 1100))
        }
    }

    if (key == null) return

    Canvas(modifier = modifier.fillMaxWidth().height(96.dp)) {
        val p = progress.value
        if (p <= 0f || p >= 1f) return@Canvas
        val originX = size.width / 2f
        val originY = size.height * 0.78f
        // Greyscale-friendly tones: the brand palette is monochrome, so the
        // confetti carries the colour instead of recolouring the whole screen.
        val tones = listOf(
            Color(0xFF22C55E), Color(0xFFEAB308), Color(0xFF7C3AED), Color(0xFF38BDF8),
        )
        pieces.forEach { piece ->
            val dist = piece.speed * size.width * 0.42f * p
            val x = originX + cos(piece.angle * Math.PI).toFloat() * dist
            // Gravity: rises, then falls away.
            val y = originY + sin(piece.angle * Math.PI).toFloat() * dist + (p * p * size.height * 0.55f)
            val alpha = (1f - p).coerceIn(0f, 1f)
            rotate(degrees = piece.spin * 360f * p, pivot = Offset(x, y)) {
                drawRect(
                    color = tones[piece.tone].copy(alpha = alpha),
                    topLeft = Offset(x, y),
                    size = androidx.compose.ui.geometry.Size(piece.size, piece.size * 1.6f),
                )
            }
        }
    }
}

private data class Particle(
    val angle: Float,
    val speed: Float,
    val spin: Float,
    val size: Float,
    val tone: Int,
)

/** Spring-in scale for the success tick, so it lands with a little bounce. */
@Composable
fun rememberPopScale(key: Any?): Float {
    val scale = remember(key) { Animatable(if (key == null) 1f else 0.6f) }
    LaunchedEffect(key) {
        if (key != null) {
            scale.snapTo(0.6f)
            scale.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow))
        }
    }
    return scale.value
}
