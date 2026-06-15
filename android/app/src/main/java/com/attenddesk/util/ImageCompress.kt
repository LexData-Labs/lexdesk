package com.attenddesk.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import java.io.ByteArrayOutputStream

/**
 * Decodes the image at [uri], resizes so the longest side <= [maxDim], and
 * re-encodes as JPEG at [quality]. Returns the encoded bytes, suitable for
 * a single multipart upload.
 *
 * Typical output is 80–250 KB for a 1024-side JPEG @ 85, well under the
 * server-side 2 MB cap.
 *
 * Re-encoding is what strips EXIF, including any GPS coordinates that the
 * source camera might have written into the file.
 */
object ImageCompress {
    fun compressForUpload(
        context: Context,
        uri: Uri,
        maxDim: Int = 1024,
        quality: Int = 85,
    ): ByteArray {
        val bitmap = loadBitmap(context, uri) ?: error("decode_failed")
        val resized = try {
            scaleToMax(bitmap, maxDim)
        } finally {
            if (bitmap !== bitmap) bitmap.recycle()
        }
        val out = ByteArrayOutputStream()
        resized.compress(Bitmap.CompressFormat.JPEG, quality, out)
        if (resized !== bitmap) resized.recycle()
        return out.toByteArray()
    }

    private fun loadBitmap(context: Context, uri: Uri): Bitmap? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val src = ImageDecoder.createSource(context.contentResolver, uri)
            // Force a mutable software bitmap so we can re-encode reliably.
            ImageDecoder.decodeBitmap(src) { decoder, _, _ ->
                decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
                decoder.isMutableRequired = true
            }
        } else {
            context.contentResolver.openInputStream(uri)?.use { input ->
                BitmapFactory.decodeStream(input)
            }
        }
    }

    private fun scaleToMax(bitmap: Bitmap, maxDim: Int): Bitmap {
        val w = bitmap.width
        val h = bitmap.height
        val longest = maxOf(w, h)
        if (longest <= maxDim) return bitmap
        val scale = maxDim.toFloat() / longest
        val newW = (w * scale).toInt().coerceAtLeast(1)
        val newH = (h * scale).toInt().coerceAtLeast(1)
        return Bitmap.createScaledBitmap(bitmap, newW, newH, true)
    }
}
