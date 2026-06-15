package com.attenddesk.ui.faceverify

import android.graphics.Bitmap
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.attenddesk.AppContainer
import com.attenddesk.checks.FaceEmbedder
import com.attenddesk.ui.components.AppTopBar
import com.attenddesk.ui.theme.DangerFg
import com.attenddesk.ui.theme.Slate300
import com.attenddesk.ui.theme.SuccessFg
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import java.util.concurrent.Executors

private const val MIN_EYE_OPEN = 0.6f

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FaceVerifyScreen(container: AppContainer, onDone: () -> Unit, onCancel: () -> Unit = onDone) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val embedder = remember { FaceEmbedder(context) }
    var captured by remember { mutableStateOf(false) }
    var status by remember {
        mutableStateOf(
            if (embedder.isReady()) "Look at the camera — we'll capture a single frame."
            else "Face model missing (assets/face_embedder.tflite)."
        )
    }
    var faceDetected by remember { mutableStateOf(false) }
    var isError by remember { mutableStateOf(false) }

    val faceDetector = remember {
        FaceDetection.getClient(
            FaceDetectorOptions.Builder()
                .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
                .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
                .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
                .setMinFaceSize(0.35f)
                .build(),
        )
    }

    LaunchedEffect(captured) {
        if (captured) onDone()
    }

    Scaffold(
        topBar = { AppTopBar(title = "Verify face", onBack = onCancel) },
        containerColor = Color.Black,
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (embedder.isReady()) {
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
                                            ResolutionStrategy(
                                                Size(640, 480),
                                                ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER,
                                            ),
                                        )
                                        .build(),
                                )
                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                .build()
                            analyzer.setAnalyzer(Executors.newSingleThreadExecutor()) { proxy ->
                                if (captured) { proxy.close(); return@setAnalyzer }
                                process(
                                    proxy,
                                    faceDetector,
                                    embedder,
                                    onCapture = { b64 ->
                                        container.setFaceEmbedding(b64)
                                        captured = true
                                        status = "Face captured."
                                        isError = false
                                    },
                                    onStatus = { msg, err ->
                                        if (!captured) {
                                            status = msg
                                            isError = err
                                        }
                                    },
                                    onFaceState = { detected ->
                                        if (!captured) faceDetected = detected
                                    },
                                )
                            }
                            try {
                                provider.unbindAll()
                                provider.bindToLifecycle(
                                    lifecycleOwner,
                                    CameraSelector.DEFAULT_FRONT_CAMERA,
                                    preview,
                                    analyzer,
                                )
                            } catch (t: Throwable) {
                                status = "Camera error: ${t.message}"
                                isError = true
                            }
                        }, ContextCompat.getMainExecutor(ctx))
                        previewView
                    },
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.12f)),
                )
                FaceReticle(detected = faceDetected || captured, modifier = Modifier.fillMaxSize())
            } else {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        status,
                        color = Color.White,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(32.dp),
                    )
                }
            }

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
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        when {
                            captured -> Icon(
                                Icons.Outlined.CheckCircle,
                                contentDescription = null,
                                tint = SuccessFg,
                                modifier = Modifier.size(18.dp),
                            )
                            isError -> Icon(
                                Icons.Outlined.ErrorOutline,
                                contentDescription = null,
                                tint = DangerFg,
                                modifier = Modifier.size(18.dp),
                            )
                            else -> Box(
                                Modifier
                                    .size(8.dp)
                                    .background(if (faceDetected) SuccessFg else Slate300, CircleShape),
                            )
                        }
                        Text(text = status, color = Color.White, style = MaterialTheme.typography.bodySmall)
                    }
                }
                Spacer(modifier = Modifier.size(2.dp))
                OutlinedButton(onClick = onCancel, shape = MaterialTheme.shapes.small) {
                    Text("Cancel", color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun FaceReticle(detected: Boolean, modifier: Modifier) {
    val color = if (detected) SuccessFg else Color.White.copy(alpha = 0.55f)
    Canvas(modifier = modifier.alpha(0.85f)) {
        val w = size.width
        val h = size.height
        val cx = w / 2
        val cy = h * 0.45f
        val radius = minOf(w, h) * 0.32f
        drawCircle(color = color, radius = radius, center = Offset(cx, cy), style = Stroke(width = 2f))
        val tick = radius * 0.18f
        drawLine(color, Offset(cx - tick, cy - radius), Offset(cx + tick, cy - radius), strokeWidth = 5f, cap = StrokeCap.Round)
        drawLine(color, Offset(cx - tick, cy + radius), Offset(cx + tick, cy + radius), strokeWidth = 5f, cap = StrokeCap.Round)
        drawLine(color, Offset(cx - radius, cy - tick), Offset(cx - radius, cy + tick), strokeWidth = 5f, cap = StrokeCap.Round)
        drawLine(color, Offset(cx + radius, cy - tick), Offset(cx + radius, cy + tick), strokeWidth = 5f, cap = StrokeCap.Round)
    }
}

private fun process(
    proxy: ImageProxy,
    detector: com.google.mlkit.vision.face.FaceDetector,
    embedder: FaceEmbedder,
    onCapture: (String) -> Unit,
    onStatus: (String, Boolean) -> Unit,
    onFaceState: (Boolean) -> Unit,
) {
    val media = proxy.image
    if (media == null) { proxy.close(); return }
    val input = InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees)
    detector.process(input)
        .addOnSuccessListener { faces ->
            try {
                val face = faces.firstOrNull()
                if (face == null) {
                    onFaceState(false)
                    onStatus("Position your face in the frame.", false)
                    return@addOnSuccessListener
                }
                onFaceState(true)
                val eyeOk = (face.leftEyeOpenProbability ?: 0f) >= MIN_EYE_OPEN &&
                    (face.rightEyeOpenProbability ?: 0f) >= MIN_EYE_OPEN
                if (!eyeOk) {
                    onStatus("Open your eyes.", false)
                    return@addOnSuccessListener
                }
                // ML Kit's face.boundingBox is in the *rotated* image's coordinate
                // system; proxy.toBitmap() returns the un-rotated sensor bitmap.
                // Rotate first so the crop region matches the face.
                val rawBitmap = proxy.toBitmap()
                val rotated = rotateBitmap(rawBitmap, proxy.imageInfo.rotationDegrees)
                val crop = cropToFace(rotated, face.boundingBox)
                val emb = embedder.embed(crop)
                onCapture(FaceEmbedder.encodeBase64(emb))
            } catch (t: Throwable) {
                onStatus("Embedding error: ${t.message}", true)
            }
        }
        .addOnCompleteListener { proxy.close() }
}

private fun cropToFace(src: Bitmap, box: android.graphics.Rect): Bitmap {
    val left = box.left.coerceIn(0, src.width - 1)
    val top = box.top.coerceIn(0, src.height - 1)
    val right = box.right.coerceIn(left + 1, src.width)
    val bottom = box.bottom.coerceIn(top + 1, src.height)
    return Bitmap.createBitmap(src, left, top, right - left, bottom - top)
}

private fun rotateBitmap(src: Bitmap, degrees: Int): Bitmap {
    if (degrees == 0) return src
    val matrix = android.graphics.Matrix().apply { postRotate(degrees.toFloat()) }
    return Bitmap.createBitmap(src, 0, 0, src.width, src.height, matrix, true)
}
