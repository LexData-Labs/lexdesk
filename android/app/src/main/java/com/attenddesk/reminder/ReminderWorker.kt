package com.attenddesk.reminder

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.attenddesk.MainActivity
import com.attenddesk.R
import com.attenddesk.location.LocationNotifications
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Daily local "time to check in" reminder. Client-only — posts a notification;
 * no backend. Scheduled as 1-day periodic work with an initial delay to the
 * next chosen HH:mm (WorkManager persists across reboots).
 */
class ReminderWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val ctx = applicationContext
        LocationNotifications.ensureChannels(ctx)
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return Result.success() // can't post without permission; honor next tick
        }
        val intent = Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pi = PendingIntent.getActivity(
            ctx, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notif = NotificationCompat.Builder(ctx, LocationNotifications.CHANNEL_REMINDER)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Time to check in")
            .setContentText("Don't forget to mark your attendance for today.")
            .setAutoCancel(true)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        runCatching { NotificationManagerCompat.from(ctx).notify(LocationNotifications.NOTIF_ID_REMINDER, notif) }
        return Result.success()
    }

    companion object {
        const val WORK_NAME = "attenddesk_attendance_reminder"

        fun schedule(context: Context, hour: Int, minute: Int) {
            val request = PeriodicWorkRequestBuilder<ReminderWorker>(1, TimeUnit.DAYS)
                .setInitialDelay(delayToNextMillis(hour, minute), TimeUnit.MILLISECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request,
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }

        private fun delayToNextMillis(hour: Int, minute: Int): Long {
            val now = Calendar.getInstance()
            val next = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            if (!next.after(now)) next.add(Calendar.DAY_OF_YEAR, 1)
            return next.timeInMillis - now.timeInMillis
        }
    }
}
