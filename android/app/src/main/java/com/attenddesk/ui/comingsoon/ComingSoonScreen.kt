package com.attenddesk.ui.comingsoon

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Construction
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.attenddesk.ui.components.EmptyState
import com.attenddesk.ui.components.GradientHeader

/**
 * Branded placeholder for modules shown in the new design whose backend isn't
 * built yet (Break Time, Claim, Notice Board, Reconciliation, etc.). Keeps the
 * IA complete without faking functionality.
 */
@Composable
fun ComingSoonScreen(title: String, onBack: () -> Unit) {
    Scaffold(
        topBar = { GradientHeader(title = title, onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(modifier = Modifier.padding(padding)) {
                EmptyState(
                    title = "Coming soon",
                    description = "$title isn't available yet. It's on the roadmap and will light up in a future update.",
                    icon = Icons.Outlined.Construction,
                )
            }
        }
    }
}
