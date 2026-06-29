package com.attenddesk.ui.attendance

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.attenddesk.AppContainer
import com.attenddesk.data.api.TeamMemberSummaryDto
import com.attenddesk.data.api.TeamSummaryResponse
import com.attenddesk.ui.components.EmptyState
import com.attenddesk.ui.components.GradientHeader
import com.attenddesk.ui.components.LoadingDots
import com.attenddesk.ui.components.SectionCard
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamScreen(container: AppContainer, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var data by remember { mutableStateOf<TeamSummaryResponse?>(null) }

    LaunchedEffect(Unit) {
        scope.launch { runCatching { container.api.viewAttendance() }.onSuccess { data = it }.onFailure { data = TeamSummaryResponse(false, emptyList()) } }
    }

    Scaffold(
        topBar = { GradientHeader(title = "View Attendance", onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        val d = data
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            when {
                d == null -> Box(Modifier.fillMaxSize(), Alignment.Center) { LoadingDots() }
                d.members.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    EmptyState(icon = Icons.Outlined.Groups, title = "No attendance", description = "No employee attendance to show yet.")
                }
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(d.members, key = { it.uid }) { m -> MemberCard(m) }
                }
            }
        }
    }
}

@Composable
private fun MemberCard(m: TeamMemberSummaryDto) {
    SectionCard {
        Text(m.name.ifBlank { m.email }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Text(
            "Today · in ${m.todayIn ?: "—"} · out ${m.todayOut ?: "—"}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
