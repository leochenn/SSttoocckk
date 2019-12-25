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
        Notification notification = new NotificationCompat.Builder(context, "1")
                .setContentTitle(title)
                .setContentText(content)
                .setWhen(System.currentTimeMillis())
                .setSmallIcon(R.mipmap.ic_launcher)
                .setLights(Color.GREEN, 1000, 1000)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(),
                        R.mipmap.ic_launcher))
                .setDefaults(Notification.DEFAULT_VIBRATE | Notification.DEFAULT_ALL | Notification.DEFAULT_SOUND)
                .build();
        manager.notify(CODE2, notification);
    }

    public static void cancel(Context context) {
        NotificationManager notificationManager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancelAll();
    }
}
