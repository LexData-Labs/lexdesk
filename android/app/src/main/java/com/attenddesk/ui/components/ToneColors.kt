package com.attenddesk.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.attenddesk.ui.theme.DangerBg
import com.attenddesk.ui.theme.DangerBgDark
import com.attenddesk.ui.theme.DangerBorder
import com.attenddesk.ui.theme.DangerBorderDark
import com.attenddesk.ui.theme.DangerFg
import com.attenddesk.ui.theme.DangerFgDark
import com.attenddesk.ui.theme.InfoBg
import com.attenddesk.ui.theme.InfoBgDark
import com.attenddesk.ui.theme.InfoBorder
import com.attenddesk.ui.theme.InfoBorderDark
import com.attenddesk.ui.theme.InfoFg
import com.attenddesk.ui.theme.InfoFgDark
import com.attenddesk.ui.theme.LocalIsDark
import com.attenddesk.ui.theme.MutedBg
import com.attenddesk.ui.theme.MutedBgDark
import com.attenddesk.ui.theme.MutedBorder
import com.attenddesk.ui.theme.MutedBorderDark
import com.attenddesk.ui.theme.MutedFg
import com.attenddesk.ui.theme.MutedFgDark
import com.attenddesk.ui.theme.SuccessBg
import com.attenddesk.ui.theme.SuccessBgDark
import com.attenddesk.ui.theme.SuccessBorder
import com.attenddesk.ui.theme.SuccessBorderDark
import com.attenddesk.ui.theme.SuccessFg
import com.attenddesk.ui.theme.SuccessFgDark
import com.attenddesk.ui.theme.WarnBg
import com.attenddesk.ui.theme.WarnBgDark
import com.attenddesk.ui.theme.WarnBorder
import com.attenddesk.ui.theme.WarnBorderDark
import com.attenddesk.ui.theme.WarnFg
import com.attenddesk.ui.theme.WarnFgDark

/**
 * Resolves a [ChipTone] to a (fg, bg, border) triple appropriate for the
 * active scheme. Use for tinted banners, status callouts, and any non-chip
 * surface that needs to read as success/danger/warn/info/muted without
 * being washed out in dark mode.
 */
data class ToneColors(val fg: Color, val bg: Color, val border: Color)

@Composable
fun toneColors(tone: ChipTone): ToneColors {
    val dark = LocalIsDark.current
    return when (tone) {
        ChipTone.Success -> if (dark) ToneColors(SuccessFgDark, SuccessBgDark, SuccessBorderDark)
                            else      ToneColors(SuccessFg, SuccessBg, SuccessBorder)
        ChipTone.Danger  -> if (dark) ToneColors(DangerFgDark, DangerBgDark, DangerBorderDark)
                            else      ToneColors(DangerFg, DangerBg, DangerBorder)
        ChipTone.Warn    -> if (dark) ToneColors(WarnFgDark, WarnBgDark, WarnBorderDark)
                            else      ToneColors(WarnFg, WarnBg, WarnBorder)
        ChipTone.Info    -> if (dark) ToneColors(InfoFgDark, InfoBgDark, InfoBorderDark)
                            else      ToneColors(InfoFg, InfoBg, InfoBorder)
        ChipTone.Muted   -> if (dark) ToneColors(MutedFgDark, MutedBgDark, MutedBorderDark)
                            else      ToneColors(MutedFg, MutedBg, MutedBorder)
    }
}
