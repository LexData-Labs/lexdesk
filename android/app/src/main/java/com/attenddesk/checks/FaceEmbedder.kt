package com.attenddesk.checks

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.support.common.ops.NormalizeOp
import org.tensorflow.lite.support.image.ImageProcessor
import org.tensorflow.lite.support.image.TensorImage
import org.tensorflow.lite.support.image.ops.ResizeOp
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import kotlin.math.sqrt

/**
 * Face-specialized embedder backed by a FaceNet TFLite (128-D output).
 *
 * Model: 160x160 RGB float32 input, 128-D float32 output. Sourced from
 * https://github.com/shubham0204/FaceRecognition_With_FaceNet_Android (MIT).
 *
 * Asset path:
 *     android/app/src/main/assets/face_embedder.tflite
 *
 * Preprocessing matches the FaceNet sample app: pixels in [0, 255] are mapped
 * to [-1, 1] via (pixel - 127.5) / 128.
 */
class FaceEmbedder(context: Context) {
    private val interpreter: Interpreter?
    init {
        interpreter = try {
            Interpreter(loadModelFile(context, MODEL_ASSET))
        } catch (e: IOException) {
            Log.w(TAG, "Face model not found at assets/$MODEL_ASSET — face check will fail until added")
            null
        }
    }

    fun isReady(): Boolean = interpreter != null

    /**
     * Returns an L2-normalized 128-D embedding for a face crop.
     * Throws if the model isn't available; callers should check [isReady] first.
     */
    fun embed(faceBitmap: Bitmap): FloatArray {
        val itp = interpreter ?: error("Face model not loaded")
        val processed = imageProcessor.process(TensorImage.fromBitmap(faceBitmap))
        val input = processed.buffer
        val output = Array(1) { FloatArray(EMBEDDING_DIM) }
        itp.run(input, output)
        return l2Normalize(output[0])
    }

    private fun loadModelFile(ctx: Context, assetName: String): MappedByteBuffer {
        ctx.assets.openFd(assetName).use { fd ->
            val input = fd.createInputStream()
            input.channel.use { channel ->
                return channel.map(FileChannel.MapMode.READ_ONLY, fd.startOffset, fd.declaredLength)
            }
        }
    }

    companion object {
        private const val TAG = "FaceEmbedder"
        private const val MODEL_ASSET = "face_embedder.tflite"

        /** FaceNet input is 160x160 RGB. */
        const val INPUT_SIZE = 160

        /** FaceNet output is a 128-D feature vector. */
        const val EMBEDDING_DIM = 128

        private val imageProcessor: ImageProcessor by lazy {
            ImageProcessor.Builder()
                .add(ResizeOp(INPUT_SIZE, INPUT_SIZE, ResizeOp.ResizeMethod.BILINEAR))
                // FaceNet expects float32 inputs normalized to ~[-1, 1].
                // (pixel - 127.5) / 128 maps [0, 255] to [-0.996, 0.996].
                .add(NormalizeOp(127.5f, 128f))
                .build()
        }

        fun l2Normalize(v: FloatArray): FloatArray {
            var s = 0.0
            for (x in v) s += x * x
            val n = sqrt(s).toFloat()
            if (n == 0f) return v
            val out = FloatArray(v.size)
            for (i in v.indices) out[i] = v[i] / n
            return out
        }

        fun encodeBase64(v: FloatArray): String {
            val buf = ByteBuffer.allocate(v.size * 4).order(ByteOrder.LITTLE_ENDIAN)
            for (x in v) buf.putFloat(x)
            return android.util.Base64.encodeToString(buf.array(), android.util.Base64.NO_WRAP)
        }
    }
}
