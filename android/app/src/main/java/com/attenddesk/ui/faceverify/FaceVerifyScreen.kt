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
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size as GeomSize
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.attenddesk.AppContainer
import com.attenddesk.checks.FaceEmbedder
import com.attenddesk.ui.components.AppTopBar
import com.attenddesk.ui.theme.Brand400
import com.attenddesk.ui.theme.ChipPurpleFg
import com.attenddesk.ui.theme.DangerFg
import com.attenddesk.ui.theme.Slate300
import com.attenddesk.ui.theme.SuccessFg
import com.attenddesk.ui.theme.SuccessFgDark
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import kotlinx.coroutines.delay
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.sqrt

private const val MIN_EYE_OPEN = 0.6f

// Verification captures a short burst rather than a single frame: we accept up
// to VERIFY_FRAMES good frames, spaced ≥ MIN_INTERVAL_MS apart so the scan spans
// ~1.3–1.5s and the averaged frames are diverse. Averaging steadies the
// embedding (fewer false rejects) and gives the user a visible scan.
private const val VERIFY_FRAMES = 6
private const val MIN_INTERVAL_MS = 220L
private const val SUCCESS_HOLD_MS = 420L

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FaceVerifyScreen(container: AppContainer, onDone: () -> Unit, onCancel: () -> Unit = onDone) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val embedder = remember { FaceEmbedder(context) }
    var captured by remember { mutableStateOf(false) }
    var captureCount by remember { mutableIntStateOf(0) }
    var status by remember {
        mutableStateOf(
            if (embedder.isReady()) "Look at the camera to verify."
            else "Face model missing (assets/face_embedder.tflite)."
        )
    }
    var faceDetected by remember { mutableStateOf(false) }
    var isError by remember { mutableStateOf(false) }

    // Accumulated frame embeddings + a throttle clock. Both live across the single
    // factory pass; the ML Kit success callbacks run on the main thread.
    val embeddings = remember { mutableListOf<FloatArray>() }
    val lastAccept = remember { AtomicLong(0L) }

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

    // Hold the success state briefly so the green check animation is seen.
    LaunchedEffect(captured) {
        if (captured) {
            delay(SUCCESS_HOLD_MS)
            onDone()
        }
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
                                    onEmbedding = { emb ->
                                        val now = System.currentTimeMillis()
                                        if (!captured && now - lastAccept.get() >= MIN_INTERVAL_MS) {
                                            lastAccept.set(now)
                                            embeddings.add(emb)
                                            captureCount = embeddings.size
                                            status = "Hold still — verifying…"
                                            isError = false
                                            if (embeddings.size >= VERIFY_FRAMES) {
                                                val avg = FaceEmbedder.average(embeddings)
                                                container.setFaceEmbedding(FaceEmbedder.encodeBase64(avg))
                                                captured = true
                                                status = "Verified"
                                            }
                                        }
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
                ScanReticle(
                    progress = captureCount.toFloat() / VERIFY_FRAMES,
                    faceDetected = faceDetected || captured,
                    captured = captured,
                    modifier = Modifier.fillMaxSize(),
                )
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
private fun ScanReticle(
    progress: Float,
    faceDetected: Boolean,
    captured: Boolean,
    modifier: Modifier,
) {
    val infinite = rememberInfiniteTransition(label = "scan")
    val sweepRot by infinite.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(1400, easing = LinearEasing)),
        label = "sweep",
    )
    val scanT by infinite.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1100, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "scanline",
    )
    val pulse by infinite.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(700, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "pulse",
    )
    val animProgress by animateFloatAsState(progress, tween(220), label = "progress")
    val checkScale by animateFloatAsState(
        if (captured) 1f else 0f,
        spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow),
        label = "check",
    )

    val purple = ChipPurpleFg
    val blue = Brand400
    val green = SuccessFgDark
    val idle = Slate300.copy(alpha = 0.5f)
    val scanning = faceDetected && !captured
    val accent = if (captured) green else if (faceDetected) blue else idle

    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val cx = w / 2f
        val cy = h * 0.42f
        val r = minOf(w, h) * 0.34f
        val center = Offset(cx, cy)
        val topLeft = Offset(cx - r, cy - r)
        val arcSize = GeomSize(r * 2, r * 2)

        // Faint base ring.
        drawCircle(idle.copy(alpha = 0.25f), radius = r, center = center, style = Stroke(width = 3f))

        // Rotating gradient sweep — the "scanning" motion (only while a face is up).
        if (scanning) {
            rotate(sweepRot, pivot = center) {
                drawArc(
                    brush = Brush.sweepGradient(
                        0.0f to Color.Transparent,
                        0.16f to purple.copy(alpha = 0.85f),
                        0.28f to blue,
                        0.42f to Color.Transparent,
                        1.0f to Color.Transparent,
                        center = center,
                    ),
                    startAngle = 0f,
                    sweepAngle = 360f,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = 8f, cap = StrokeCap.Round),
                )
            }
        }

        // Progress ring fills as frames accumulate (full + green on success).
        if (animProgress > 0f || captured) {
            drawArc(
                color = if (captured) green else blue,
                startAngle = -90f,
                sweepAngle = 360f * (if (captured) 1f else animProgress.coerceIn(0f, 1f)),
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = 7f, cap = StrokeCap.Round),
            )
        }

        // Scan line sweeping vertically, clipped to the circle's width at that y.
        if (scanning) {
            val y = (cy - r) + 2f * r * scanT
            val dy = y - cy
            val hw = sqrt((r * r - dy * dy).coerceAtLeast(0f))
            drawLine(blue.copy(alpha = 0.25f), Offset(cx - hw, y), Offset(cx + hw, y), strokeWidth = 11f, cap = StrokeCap.Round)
            drawLine(blue, Offset(cx - hw, y), Offset(cx + hw, y), strokeWidth = 2.5f, cap = StrokeCap.Round)
        }

        // Corner ticks — pulse while scanning, solid on success.
        val tick = r * 0.20f
        val tickAlpha = if (captured) 1f else if (scanning) pulse else 0.6f
        val tc = (if (captured) green else accent).copy(alpha = tickAlpha)
        drawLine(tc, Offset(cx - tick, cy - r), Offset(cx + tick, cy - r), strokeWidth = 5f, cap = StrokeCap.Round)
        drawLine(tc, Offset(cx - tick, cy + r), Offset(cx + tick, cy + r), strokeWidth = 5f, cap = StrokeCap.Round)
        drawLine(tc, Offset(cx - r, cy - tick), Offset(cx - r, cy + tick), strokeWidth = 5f, cap = StrokeCap.Round)
        drawLine(tc, Offset(cx + r, cy - tick), Offset(cx + r, cy + tick), strokeWidth = 5f, cap = StrokeCap.Round)

        // Success check-mark pops in.
        if (checkScale > 0f) {
            val s = r * 0.5f * checkScale
            val p0 = Offset(cx - s * 0.55f, cy)
            val p1 = Offset(cx - s * 0.1f, cy + s * 0.45f)
            val p2 = Offset(cx + s * 0.6f, cy - s * 0.5f)
            drawLine(green, p0, p1, strokeWidth = 8f, cap = StrokeCap.Round)
            drawLine(green, p1, p2, strokeWidth = 8f, cap = StrokeCap.Round)
        }
    }
}

private fun process(
    proxy: ImageProxy,
    detector: com.google.mlkit.vision.face.FaceDetector,
    embedder: FaceEmbedder,
    onEmbedding: (FloatArray) -> Unit,
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
                onEmbedding(emb)
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
