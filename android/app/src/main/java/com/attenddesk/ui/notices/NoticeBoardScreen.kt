package com.attenddesk.ui.notices

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Campaign
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
import com.attenddesk.data.api.NoticeDto
import com.attenddesk.ui.components.ChipTone
import com.attenddesk.ui.components.EmptyState
import com.attenddesk.ui.components.GradientHeader
import com.attenddesk.ui.components.LoadingDots
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.components.StatusChip
import com.attenddesk.ui.util.parseToDhaka
import kotlinx.coroutines.launch
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoticeBoardScreen(container: AppContainer, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var notices by remember { mutableStateOf<List<NoticeDto>?>(null) }
    LaunchedEffect(Unit) {
        scope.launch { runCatching { notices = container.api.notices().notices }.onFailure { notices = emptyList() } }
    }
    Scaffold(
        topBar = { GradientHeader(title = "Notice Board", onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            when {
                notices == null -> Box(Modifier.fillMaxSize(), Alignment.Center) { LoadingDots() }
                notices!!.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    EmptyState(icon = Icons.Outlined.Campaign, title = "No notices", description = "Announcements from your organization will appear here.")
                }
                else -> LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) { items(notices!!, key = { it.id }) { n -> NoticeCard(n) } }
            }
        }
    }
}

private val DT = DateTimeFormatter.ofPattern("d MMM yyyy, h:mm a", Locale.ENGLISH)

@Composable
private fun NoticeCard(n: NoticeDto) {
    SectionCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (n.pinned) StatusChip(text = "Pinned", tone = ChipTone.Info, showDot = false)
            Text(n.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
        }
        if (n.body.isNotBlank()) {
            Spacer(Modifier.height(6.dp))
            Text(n.body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
        }
        Spacer(Modifier.height(8.dp))
        val ts = parseToDhaka(n.createdAt)?.format(DT) ?: ""
        Text(ts, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
