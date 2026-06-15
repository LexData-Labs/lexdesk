package com.attenddesk.ui.setpw

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.attenddesk.AppContainer
import com.attenddesk.ui.components.AppTopBar
import com.attenddesk.ui.components.ChipTone
import com.attenddesk.ui.components.SectionCard
import com.attenddesk.ui.components.toneColors
import com.attenddesk.ui.theme.DangerFg
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SetPasswordScreen(container: AppContainer, onDone: () -> Unit) {
    var next by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val longEnough = next.length >= 8
    val hasDigit = next.any { it.isDigit() }
    val matches = next.isNotEmpty() && next == confirm

    Scaffold(
        topBar = { AppTopBar(title = "Set password") },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            Text("Choose a new password", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(4.dp))
            Text(
                "Your temporary password expires after this change.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))

            SectionCard {
                OutlinedTextField(
                    value = next,
                    onValueChange = { next = it },
                    label = { Text("New password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.small,
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = confirm,
                    onValueChange = { confirm = it },
                    label = { Text("Confirm new password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.small,
                )

                Spacer(Modifier.height(14.dp))
                RuleRow(ok = longEnough, label = "At least 8 characters")
                RuleRow(ok = hasDigit,   label = "Includes a number")
                RuleRow(ok = matches,    label = "Matches confirmation")

                if (error != null) {
                    Spacer(Modifier.height(10.dp))
                    Text(error!!, color = DangerFg, style = MaterialTheme.typography.bodySmall)
                }

                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = {
                        error = null
                        if (!longEnough) { error = "Password must be at least 8 characters."; return@Button }
                        if (!matches) { error = "Passwords don't match."; return@Button }
                        busy = true
                        scope.launch {
                            try {
                                container.authRepo.setPassword(next)
                                onDone()
                            } catch (e: Throwable) {
                                error = "Could not change password. Please try again."
                            } finally {
                                busy = false
                            }
                        }
                    },
                    enabled = !busy && longEnough && matches,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = MaterialTheme.shapes.small,
                ) {
                    if (busy) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = Color.White,
                        )
                    } else {
                        Text("Save and sign in again", style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
        }
    }
}

@Composable
private fun RuleRow(ok: Boolean, label: String) {
    val successFg = toneColors(ChipTone.Success).fg
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Box(
            modifier = Modifier
                .size(16.dp)
                .background(if (ok) successFg.copy(alpha = 0.12f) else Color.Transparent, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Outlined.Check,
                contentDescription = null,
                tint = if (ok) successFg else MaterialTheme.colorScheme.outline,
                modifier = Modifier.size(12.dp),
            )
        }
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = if (ok) successFg else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
