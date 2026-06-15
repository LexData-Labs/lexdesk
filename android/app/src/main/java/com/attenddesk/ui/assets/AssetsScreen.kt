package com.attenddesk.ui.assets

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.attenddesk.ui.components.EmptyState
import com.attenddesk.ui.components.GradientHeader
import com.attenddesk.ui.components.SegmentedTabs

/**
 * Assets screen mirrors the reference layout (Assigned / Requested / Requisition
 * tabs). LexDesk has an assetRequests collection but no mobile endpoint yet, so
 * each tab shows an honest empty state until `/api/v1/me/assets` lands (Phase 2).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssetsScreen(onBack: () -> Unit) {
    var tab by remember { mutableIntStateOf(0) }
    Scaffold(
        topBar = { GradientHeader(title = "Assets", onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            SegmentedTabs(
                tabs = listOf("Assigned", "Requested", "Requisition"),
                selected = tab,
                onSelect = { tab = it },
            )
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                EmptyState(
                    icon = Icons.Outlined.Inventory2,
                    title = "No data to show",
                    description = "Asset records will appear here once asset management is connected.",
                )
            }
        }
    }
}
