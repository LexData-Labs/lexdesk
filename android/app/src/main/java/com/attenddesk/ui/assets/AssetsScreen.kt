package com.attenddesk.ui.assets

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.attenddesk.AppContainer
import com.attenddesk.data.api.AssetCreateRequest
import com.attenddesk.data.api.AssetRequestDto
import com.attenddesk.ui.components.EmptyState
import com.attenddesk.ui.components.GradientHeader
import com.attenddesk.ui.components.LoadingDots
import com.attenddesk.ui.components.SegmentedTabs
import com.attenddesk.ui.requests.DateField
import com.attenddesk.ui.requests.REQ_ISO_DAY
import com.attenddesk.ui.requests.RequestRowCard
import kotlinx.coroutines.launch
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssetsScreen(container: AppContainer, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<AssetRequestDto>?>(null) }
    var tab by remember { mutableIntStateOf(0) } // 0 Requested(pending), 1 Assigned(approved)
    var showForm by remember { mutableStateOf(false) }

    suspend fun load() {
        runCatching { container.api.listMyAssets().requests }.onSuccess { items = it }.onFailure { if (items == null) items = emptyList() }
    }
    LaunchedEffect(Unit) { load() }

    val filtered = remember(items, tab) {
        val all = items ?: emptyList()
        if (tab == 0) all.filter { it.status == "pending" } else all.filter { it.status == "approved" }
    }

    Scaffold(
        topBar = { GradientHeader(title = "Assets", onBack = onBack) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showForm = true }, containerColor = MaterialTheme.colorScheme.primary) {
                Icon(Icons.Outlined.Add, contentDescription = "New requisition", tint = MaterialTheme.colorScheme.onPrimary)
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            SegmentedTabs(tabs = listOf("Requested", "Assigned"), selected = tab, onSelect = { tab = it })
            when {
                items == null -> Box(Modifier.fillMaxSize(), Alignment.Center) { LoadingDots() }
                filtered.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    EmptyState(icon = Icons.Outlined.Inventory2, title = "No data to show", description = if (tab == 0) "Your pending requisitions appear here." else "Approved assets appear here.")
                }
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(filtered, key = { it.id }) { a ->
                        val approval = if (a.requiresLead) "Admin: ${a.adminStatus} · Lead: ${a.leadStatus}" else "Admin: ${a.adminStatus}"
                        RequestRowCard(
                            title = a.assetName,
                            lines = listOf(a.assetType, "${a.fromDay} → ${a.toDay}", approval),
                            status = a.status,
                        )
                    }
                }
            }
        }
    }

    if (showForm) {
        AssetForm(onDismiss = { showForm = false }, onSubmit = { req ->
            scope.launch {
                val ok = runCatching { container.api.createAsset(req) }.isSuccess
                if (ok) { showForm = false; load() }
            }
        })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AssetForm(onDismiss: () -> Unit, onSubmit: (AssetCreateRequest) -> Unit) {
    var assetName by remember { mutableStateOf("") }
    var assetType by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var fromDay by remember { mutableStateOf(LocalDate.now()) }
    var toDay by remember { mutableStateOf(LocalDate.now()) }
    val rangeOk = !fromDay.isAfter(toDay)
    val canSubmit = assetName.trim().isNotEmpty() && rangeOk

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(enabled = canSubmit, onClick = {
                onSubmit(AssetCreateRequest(
                    assetName = assetName.trim(),
                    assetType = assetType.trim(),
                    description = description.trim(),
                    fromDay = fromDay.format(REQ_ISO_DAY),
                    toDay = toDay.format(REQ_ISO_DAY),
                ))
            }) { Text("Submit") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        title = { Text("New requisition") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(value = assetName, onValueChange = { if (it.length <= 120) assetName = it }, label = { Text("Asset name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = assetType, onValueChange = { if (it.length <= 60) assetType = it }, label = { Text("Type (e.g. Laptop)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    DateField("From", fromDay, { fromDay = it; if (toDay.isBefore(it)) toDay = it }, Modifier.weight(1f))
                    DateField("To", toDay, { toDay = it }, Modifier.weight(1f))
                }
                OutlinedTextField(value = description, onValueChange = { if (it.length <= 500) description = it }, label = { Text("Why you need it (optional)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
            }
        },
    )
}
