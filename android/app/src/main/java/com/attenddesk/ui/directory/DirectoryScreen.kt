package com.attenddesk.ui.directory

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.attenddesk.AppContainer
import com.attenddesk.data.api.DirectoryPersonDto
import com.attenddesk.ui.components.EmptyState
import com.attenddesk.ui.components.GradientHeader
import com.attenddesk.ui.components.LoadingDots
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.theme.Brand500
import com.attenddesk.ui.theme.Brand700
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DirectoryScreen(container: AppContainer, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var people by remember { mutableStateOf<List<DirectoryPersonDto>?>(null) }
    var query by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        scope.launch { runCatching { people = container.api.directory().people } .onFailure { people = emptyList() } }
    }

    val filtered = remember(people, query) {
        val q = query.trim().lowercase()
        (people ?: emptyList()).filter {
            q.isEmpty() || it.name.lowercase().contains(q) || it.email.lowercase().contains(q) || (it.teamName ?: "").lowercase().contains(q)
        }
    }

    Scaffold(
        topBar = { GradientHeader(title = "Directory", onBack = onBack) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text("Search people") },
                leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(16.dp),
            )
            when {
                people == null -> Box(Modifier.fillMaxSize(), Alignment.Center) { LoadingDots() }
                filtered.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    EmptyState(title = "No people", description = "No colleagues match your search.")
                }
                else -> LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(filtered, key = { it.uid }) { p -> PersonRow(p) { openMail(context, p.email) } }
                }
            }
        }
    }
}

private fun openMail(context: android.content.Context, email: String) {
    if (email.isBlank()) return
    runCatching { context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$email"))) }
}

@Composable
private fun PersonRow(p: DirectoryPersonDto, onMail: () -> Unit) {
    SectionCard(padding = PaddingValues(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                modifier = Modifier.size(44.dp).clip(CircleShape).background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Brand500, Brand700))),
                contentAlignment = Alignment.Center,
            ) {
                if (!p.photoUrl.isNullOrBlank()) {
                    AsyncImage(model = p.photoUrl, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.size(44.dp).clip(CircleShape))
                } else {
                    Text(p.name.firstOrNull()?.uppercase() ?: "?", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(p.name.ifBlank { p.email }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    listOfNotNull(
                        p.role.lowercase().replaceFirstChar { it.titlecase() }.ifBlank { null },
                        p.teamName?.ifBlank { null },
                    ).joinToString(" · ").ifBlank { p.email },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            IconButton(onClick = onMail) {
                Icon(Icons.Outlined.Email, contentDescription = "Email", tint = MaterialTheme.colorScheme.primary)
            }
        }
    }
}
