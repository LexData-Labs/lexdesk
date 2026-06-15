package com.attenddesk

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.attenddesk.data.ThemeMode
import com.attenddesk.data.TimeFormat
import com.attenddesk.ui.AppNav
import com.attenddesk.ui.theme.AttendDeskTheme
import com.attenddesk.ui.util.LocalIs24Hour

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as App).container
        setContent {
            val themeMode by container.themePrefs.themeModeFlow.collectAsState(initial = ThemeMode.System)
            val timeFormat by container.themePrefs.timeFormatFlow.collectAsState(initial = TimeFormat.H12)
            AttendDeskTheme(themeMode = themeMode) {
                CompositionLocalProvider(LocalIs24Hour provides (timeFormat == TimeFormat.H24)) {
                    AppNav(container = container)
                }
            }
        }
    }
}
