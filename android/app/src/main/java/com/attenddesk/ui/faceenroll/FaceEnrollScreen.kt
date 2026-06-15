package com.attenddesk.ui.faceenroll

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
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
import com.attenddesk.data.api.EnrollFaceRequest
import com.attenddesk.ui.components.AppTopBar
import com.attenddesk.ui.theme.Brand400
import com.attenddesk.ui.theme.DangerFg
import com.attenddesk.ui.theme.Slate300
import com.attenddesk.ui.theme.SuccessFg
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import java.util.concurrent.Executors
import kotlinx.coroutines.launch

private const val TARGET_FRAMES = 5
private const val MIN_EYE_OPEN = 0.6f

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FaceEnrollScreen(container: AppContainer, onDone: () -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val embedder = remember { FaceEmbedder(context) }
    val embeddings = remember { mutableStateListOf<FloatArray>() }
    var status by remember {
        mutableStateOf(
            if (embedder.isReady()) "Look at the camera. We'll capture $TARGET_FRAMES frames."
            else "Face model missing (assets/face_embedder.tflite). See README."
        )
    }
    var faceDetected by remember { mutableStateOf(false) }
    var isError by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

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

    LaunchedEffect(embeddings.size) {
        if (embeddings.size >= TARGET_FRAMES && !saving) {
            saving = true
            status = "Uploading enrollment…"
            isError = false
            scope.launch {
                try {
                    container.api.enrollFace(
                        EnrollFaceRequest(embeddings.map { FaceEmbedder.encodeBase64(it) }),
                    )
                    status = "Face enrolled."
                    onDone()
                } catch (e: Throwable) {
                    status = "Upload failed: ${e.message ?: "unknown error"}"
                    isError = true
                    saving = false
                }
            }
        }
    }

    Scaffold(
        topBar = { AppTopBar(title = "Enroll face", onBack = onDone) },
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
                                            ResolutionStrategy(Size(640, 480), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER),
                                        )
                                        .build(),
                                )
                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                .build()
                            analyzer.setAnalyzer(Executors.newSingleThreadExecutor()) { proxy ->
                                process(proxy, faceDetector, embedder, embeddings,
                                    onStatus = { msg, err ->
                                        status = msg
                                        isError = err
                                    },
                                    onFaceState = { detected -> faceDetected = detected },
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

                // Subtle vignette so the camera feed reads as a guided shoot
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.12f)),
                )

                // Face guide reticle
                FaceReticle(detected = faceDetected, modifier = Modifier.fillMaxSize())
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

            // Bottom overlay card
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                CaptureDots(captured = embeddings.size, total = TARGET_FRAMES)
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
                            isError -> Icon(
                                Icons.Outlined.ErrorOutline,
                                contentDescription = null,
                                tint = DangerFg,
                                modifier = Modifier.size(18.dp),
                            )
                            saving || embeddings.size >= TARGET_FRAMES -> Icon(
                                Icons.Outlined.CheckCircle,
                                contentDescription = null,
                                tint = SuccessFg,
                                modifier = Modifier.size(18.dp),
                            )
                            else -> Box(
                                Modifier
                                    .size(8.dp)
                                    .background(if (faceDetected) SuccessFg else Slate300, CircleShape),
                            )
                        }
                        Text(
                            text = status,
                            color = Color.White,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
                Text(
                    text = "Tip: look straight ahead and move slightly between captures.",
                    color = Color.White.copy(alpha = 0.75f),
                    style = MaterialTheme.typography.bodySmall,
                )
                OutlinedButton(
                    onClick = onDone,
                    shape = MaterialTheme.shapes.small,
                ) { Text("Cancel", color = Color.White) }
            }
        }
    }
}

@Composable
private fun CaptureDots(captured: Int, total: Int) {
    val pulse = rememberInfiniteTransition(label = "pulse")
    val alpha by pulse.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "alpha",
    )
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        for (i in 0 until total) {
            val filled = i < captured
            val nextSlot = i == captured && captured < total
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .background(
                        when {
                            filled -> SuccessFg
                            nextSlot -> Brand400.copy(alpha = alpha)
                            else -> Color.White.copy(alpha = 0.30f)
                        },
                        CircleShape,
                    ),
            )
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
        drawCircle(
            color = color,
            radius = radius,
            center = Offset(cx, cy),
            style = Stroke(width = 2f),
        )
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
    embeddings: MutableList<FloatArray>,
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
                if (embeddings.size >= TARGET_FRAMES) return@addOnSuccessListener
                // ML Kit returns face.boundingBox in the *rotated* (upright) image's
                // coordinate system. CameraX's proxy.toBitmap() returns the bitmap in
                // the sensor's native (un-rotated) orientation. We must rotate the
                // bitmap before cropping so the coordinate spaces match.
                val rawBitmap = proxy.toBitmap()
                val rotated = rotateBitmap(rawBitmap, proxy.imageInfo.rotationDegrees)
                val crop = cropToFace(rotated, face.boundingBox)
                val emb = embedder.embed(crop)
                synchronized(embeddings) {
                    if (embeddings.size < TARGET_FRAMES) embeddings.add(emb)
                }
                onStatus("Captured ${embeddings.size} of $TARGET_FRAMES.", false)
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
