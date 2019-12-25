package com.leo.stock.module.notify;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import com.leo.stock.R;
import com.leo.stock.ui.StockMainActivity;

/**
 * Created by Leo on 2019/12/25.
 */
public class NotifycationHelper {

    static final int CODE1 = 123;
    static final int CODE2 = 124;

    public static void send(Context context) {
        NotificationManager notificationManager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        Notification.Builder builder1 = new Notification.Builder(context);

//        builder1.setSound(Settings.System.DEFAULT_NOTIFICATION_URI);
        builder1.setSmallIcon(R.mipmap.ic_launcher);
        builder1.setTicker("StockApp");
        builder1.setContentTitle("StockApp");
        builder1.setContentText("正在运行中");
//        builder1.setDefaults(Notification.DEFAULT_ALL);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            builder1.setPriority(Notification.PRIORITY_MAX);
        }
        // 不能删除通知
        builder1.setOngoing(false);
        // 打开程序后图标消失
        builder1.setAutoCancel(false);

        Intent intent = new Intent(context, StockMainActivity.class);
//        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT);
        builder1.setContentIntent(pendingIntent);

        Intent clickIntent = new Intent(context, NotificationBroadcastReceiver.class);
        clickIntent.setAction("com.leo.stock.cancel");
        PendingIntent clickPI = PendingIntent.getBroadcast(context, 1, clickIntent,
                PendingIntent.FLAG_CANCEL_CURRENT);
        builder1.setDeleteIntent(clickPI);

        Notification notification1 = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            notification1 = builder1.build();
            notificationManager.notify(CODE1, notification1); // 通过通知管理器发送通知
        }
    }

    public static void send2(Context context, String title, String content) {
        NotificationManager notificationManager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        Notification.Builder builder1 = new Notification.Builder(context);

        builder1.setSound(Settings.System.DEFAULT_NOTIFICATION_URI);
        builder1.setSmallIcon(R.mipmap.ic_launcher);
        builder1.setTicker("StockApp");
        builder1.setContentTitle(title);
        builder1.setContentText(content);
        builder1.setDefaults(Notification.DEFAULT_ALL);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            builder1.setPriority(Notification.PRIORITY_MAX);
        }
        // 不能删除通知
        builder1.setOngoing(false);
        // 打开程序后图标消失
        builder1.setAutoCancel(false);

        Notification notification1 = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            notification1 = builder1.build();
            notificationManager.notify(CODE2, notification1); // 通过通知管理器发送通知
        }
    }

    public static void cancel(Context context) {
        NotificationManager notificationManager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancelAll();
    }
}
