package com.attenddesk.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.attenddesk.data.ThemeMode

private val LightColors = lightColorScheme(
    primary = Brand500,
    onPrimary = Color.White,
    primaryContainer = Brand100,
    onPrimaryContainer = Brand900,
    secondary = Brand600,
    onSecondary = Color.White,
    secondaryContainer = Brand50,
    onSecondaryContainer = Brand800,
    background = SurfaceBg,
    onBackground = Slate900,
    surface = SurfaceElevated,
    onSurface = Slate900,
    surfaceVariant = Slate50,
    onSurfaceVariant = Slate600,
    outline = Slate300,
    outlineVariant = OutlineSubtle,
    error = DangerFg,
    onError = Color.White,
    errorContainer = DangerBg,
    onErrorContainer = DangerFg,
)

private val DarkColors = darkColorScheme(
    primary = Brand400,
    onPrimary = Brand900,
    primaryContainer = Brand800,
    onPrimaryContainer = Brand100,
    secondary = Brand300,
    onSecondary = Brand900,
    secondaryContainer = Brand700,
    onSecondaryContainer = Brand100,
    background = SurfaceBgDark,
    onBackground = Slate100,
    surface = SurfaceElevatedDark,
    onSurface = Slate100,
    surfaceVariant = Slate800,
    onSurfaceVariant = Slate400,
    outline = Slate700,
    outlineVariant = OutlineSubtleDark,
    error = DangerFgDark,
    onError = Slate900,
    errorContainer = DangerBgDark,
    onErrorContainer = DangerFgDark,
)

private val AttendDeskShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(20.dp),
)

/**
 * True when the active scheme is dark. Components that need to swap palettes
 * (e.g. status chip tones, soft surfaces) should read this rather than calling
 * [isSystemInDarkTheme] directly so they respect the user's manual override.
 */
val LocalIsDark = staticCompositionLocalOf { false }

@Composable
fun AttendDeskTheme(
    themeMode: ThemeMode = ThemeMode.System,
    content: @Composable () -> Unit,
) {
    val systemDark = isSystemInDarkTheme()
    val isDark = when (themeMode) {
        ThemeMode.System -> systemDark
        ThemeMode.Light  -> false
        ThemeMode.Dark   -> true
    }
    val scheme = if (isDark) DarkColors else LightColors
    CompositionLocalProvider(LocalIsDark provides isDark) {
        MaterialTheme(
            colorScheme = scheme,
            typography = AttendDeskTypography,
            shapes = AttendDeskShapes,
            content = content,
        )
    }
}
