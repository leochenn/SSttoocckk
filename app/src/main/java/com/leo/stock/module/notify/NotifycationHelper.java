package com.leo.stock.module.notify;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Build;
import android.support.v4.app.NotificationCompat;

import com.leo.stock.R;
import com.leo.stock.module.service.BgService;
import com.leo.stock.ui.MainActivity;

import java.util.Calendar;

/**
 * Created by Leo on 2019/12/25.
 */
public class NotifycationHelper {

    static final int CODE_LAUCH = 123;
    static final int CODE_EMAIL = 124;
    static final int CODE_TIP = 125;

    public static void lauch(Context context) {
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            NotificationChannel notificationChannel = new NotificationChannel("2", "name",
                    NotificationManager.IMPORTANCE_HIGH);
            manager.createNotificationChannel(notificationChannel);
        }

        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT);

        Intent deleteIntent = new Intent(context, NotificationBroadcastReceiver.class);
        deleteIntent.setAction("com.leo.stock.cancel");
        PendingIntent deletePendingIntent = PendingIntent.getBroadcast(context, 1, deleteIntent,
                PendingIntent.FLAG_CANCEL_CURRENT);

        Calendar cal = Calendar.getInstance();
        int hour = cal.get(Calendar.HOUR_OF_DAY);
        int minute = cal.get(Calendar.MINUTE);
        String title = hour + ":" + minute + "_服务状态:" + BgService.isRunning();

        Notification notification = new NotificationCompat.Builder(context, "2")
                .setContentTitle("StockApp")
                .setContentText(title)
                .setWhen(System.currentTimeMillis())
                .setSmallIcon(R.drawable.ic_launcher)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(),
                        R.drawable.ic_launcher))
                .setAutoCancel(false)
                .setOngoing(false)
                .setContentIntent(pendingIntent)
                .setDeleteIntent(deletePendingIntent)
                .build();
        manager.notify(CODE_LAUCH, notification);
    }

    public static void sendEmail(Context context, String title, String content) {
        sendMsg(context, title, content, CODE_EMAIL);
    }

    public static void sendTip(Context context, String title, String content) {
        sendMsg(context, title, content, CODE_TIP);
    }

    public static void sendMsg(Context context, String title, String content, int code) {
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            //只在Android O之上需要渠道，这里的第一个参数要和下面的channelId一样
            NotificationChannel notificationChannel = new NotificationChannel("1", "name",
                    NotificationManager.IMPORTANCE_HIGH);
            //如果这里用IMPORTANCE_NOENE就需要在系统的设置里面开启渠道，通知才能正常弹出
            manager.createNotificationChannel(notificationChannel);
        }

        //这里的第二个参数要和上面的第一个参数一样

        Calendar cal = Calendar.getInstance();
        int hour = cal.get(Calendar.HOUR_OF_DAY);
        int minute = cal.get(Calendar.MINUTE);
        title = hour + ":" + minute + "_" + title;

        Notification notification = new NotificationCompat.Builder(context, "1")
                .setContentTitle(title)
                .setContentText(content)
                .setWhen(System.currentTimeMillis())
                .setSmallIcon(R.drawable.ic_launcher)
                .setLights(Color.GREEN, 1000, 1000)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(),
                        R.drawable.ic_launcher))
                .setDefaults(Notification.DEFAULT_VIBRATE | Notification.DEFAULT_ALL | Notification.DEFAULT_SOUND)
                .build();
        manager.notify(code, notification);
    }

    public static void cancel(Context context) {
        NotificationManager notificationManager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
//        notificationManager.cancelAll();
        notificationManager.cancel(CODE_LAUCH);
    }
}
