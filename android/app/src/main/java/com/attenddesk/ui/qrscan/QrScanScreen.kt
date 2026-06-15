package com.attenddesk.ui.qrscan

import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.attenddesk.ui.components.AppTopBar
import com.attenddesk.ui.theme.Brand400
import com.attenddesk.ui.theme.Brand500
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QrScanScreen(onResult: (String) -> Unit, onCancel: () -> Unit = {}) {
    val lifecycleOwner = LocalLifecycleOwner.current
    var status by remember { mutableStateOf("Point camera at the office QR") }
    val handled = remember { mutableStateOf(false) }
    var manualOpen by remember { mutableStateOf(false) }
    var manualValue by remember { mutableStateOf("") }

    Scaffold(
        topBar = { AppTopBar(title = "Scan QR", onBack = onCancel) },
        containerColor = Color.Black,
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    val previewView = PreviewView(ctx)
                    val providerFuture = ProcessCameraProvider.getInstance(ctx)
                    providerFuture.addListener({
                        val provider = providerFuture.get()
                        val preview = Preview.Builder().build().also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }
                        val analyzer = ImageAnalysis.Builder()
                            .setResolutionSelector(
                                ResolutionSelector.Builder()
                                    .setResolutionStrategy(
                                        ResolutionStrategy(Size(1280, 720), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER),
                                    )
                                    .build(),
                            )
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()
                        val scanner = BarcodeScanning.getClient()
                        analyzer.setAnalyzer(Executors.newSingleThreadExecutor()) { imageProxy ->
                            val mediaImage = imageProxy.image
                            if (mediaImage == null) { imageProxy.close(); return@setAnalyzer }
                            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                            scanner.process(image)
                                .addOnSuccessListener { barcodes: List<Barcode> ->
                                    if (handled.value) return@addOnSuccessListener
                                    val token = barcodes.firstOrNull { it.format == Barcode.FORMAT_QR_CODE }?.rawValue
                                    if (!token.isNullOrBlank()) {
                                        handled.value = true
                                        status = "Scanned · processing…"
                                        ContextCompat.getMainExecutor(ctx).execute { onResult(token) }
                                    }
                                }
                                .addOnCompleteListener { imageProxy.close() }
                        }
                        try {
                            provider.unbindAll()
                            provider.bindToLifecycle(
                                lifecycleOwner,
                                CameraSelector.DEFAULT_BACK_CAMERA,
                                preview,
                                analyzer,
                            )
                        } catch (t: Throwable) {
                            status = "Camera bind error: ${t.message}"
                        }
                    }, ContextCompat.getMainExecutor(ctx))
                    previewView
                },
            )

            // Reticle
            ScanReticle(modifier = Modifier.fillMaxSize())

            // Bottom status + manual entry
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.Black.copy(alpha = 0.55f), MaterialTheme.shapes.medium)
                        .border(1.dp, Color.White.copy(alpha = 0.10f), MaterialTheme.shapes.medium)
                        .padding(14.dp),
                ) {
                    Text(
                        status,
                        color = Color.White,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                TextButton(onClick = { manualOpen = true }) {
                    Text("Enter code manually", color = Color.White)
                }
            }
        }

        if (manualOpen) {
            AlertDialog(
                onDismissRequest = { manualOpen = false },
                title = { Text("Enter code") },
                text = {
                    OutlinedTextField(
                        value = manualValue,
                        onValueChange = { manualValue = it.uppercase().take(10) },
                        singleLine = true,
                        label = { Text("10-character code") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                },
                confirmButton = {
                    TextButton(
                        onClick = {
                            val v = manualValue.trim()
                            if (v.length == 10) {
                                handled.value = true
                                manualOpen = false
                                onResult(v)
                            }
                        },
                        enabled = manualValue.length == 10,
                    ) { Text("Submit") }
                },
                dismissButton = {
                    TextButton(onClick = { manualOpen = false }) { Text("Cancel") }
                },
            )
        }
    }
}

@Composable
private fun ScanReticle(modifier: Modifier) {
    val transition = rememberInfiniteTransition(label = "reticle")
    val t by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "tween",
    )
    val color = androidx.compose.ui.graphics.lerp(Brand400, Brand500, t)

    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val side = minOf(w, h) * 0.62f
        val left = (w - side) / 2
        val top = (h - side) / 2
        val cornerLen = side * 0.15f
        val stroke = 6f

        // Corners only
        fun drawCorner(cx: Float, cy: Float, dirX: Int, dirY: Int) {
            drawLine(
                color, Offset(cx, cy), Offset(cx + dirX * cornerLen, cy),
                strokeWidth = stroke, cap = StrokeCap.Round,
            )
            drawLine(
                color, Offset(cx, cy), Offset(cx, cy + dirY * cornerLen),
                strokeWidth = stroke, cap = StrokeCap.Round,
            )
        }
        drawCorner(left, top, +1, +1)
        drawCorner(left + side, top, -1, +1)
        drawCorner(left, top + side, +1, -1)
        drawCorner(left + side, top + side, -1, -1)
    }
}
