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

    static final int CODE_LAUCH = 1;
    static final int CODE_EMAIL = 2;
    static int CODE_MSG = 3;

    private static NotificationManager getNM(Context context, String channelId) {
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            //只在Android O之上需要渠道，这里的第一个参数要和下面的channelId一样
            NotificationChannel notificationChannel = new NotificationChannel(channelId, "name",
                    NotificationManager.IMPORTANCE_HIGH);
            //如果这里用IMPORTANCE_NOENE就需要在系统的设置里面开启渠道，通知才能正常弹出
            manager.createNotificationChannel(notificationChannel);
        }
        return manager;
    }

    private static String getTime() {
        Calendar cal = Calendar.getInstance();
        return cal.get(Calendar.HOUR_OF_DAY) + ":" + cal.get(Calendar.MINUTE) + ":" + cal.get(Calendar.SECOND);
    }

    private static Notification createLauchNotification(Context context, String channelId,
                                                        String title, String content) {
        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT);

        Intent deleteIntent = new Intent(context, NotificationBroadcastReceiver.class);
        deleteIntent.setAction("com.leo.stock.cancel");
        PendingIntent deletePendingIntent = PendingIntent.getBroadcast(context, 1, deleteIntent,
                PendingIntent.FLAG_CANCEL_CURRENT);

        Notification notification = new NotificationCompat.Builder(context, channelId)
                .setContentTitle(title)
                .setContentText(content)
                .setWhen(System.currentTimeMillis())
                .setSmallIcon(R.drawable.ic_launcher)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(),
                        R.drawable.ic_launcher))
                .setAutoCancel(false)
                .setOngoing(false)
                .setContentIntent(pendingIntent)
                .setDeleteIntent(deletePendingIntent)
                .build();
        return notification;
    }

    public static void lauch(Context context, String content) {
        String channelId = "101";
        String title = "服务" + (BgService.isRunning() ? "开启" : "关闭");
        Notification notification = createLauchNotification(context, channelId, title, content);
        NotificationManager manager = getNM(context, channelId);
        manager.notify(CODE_LAUCH, notification);
    }

    private static Notification createNormalNotification(Context context, String channelId,
                                                         String title, String content) {
        return new NotificationCompat.Builder(context, channelId)
                .setContentTitle(title)
                .setContentText(content)
                .setWhen(System.currentTimeMillis())
                .setSmallIcon(R.drawable.ic_launcher)
                .setLights(Color.GREEN, 1000, 1000)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(),
                        R.drawable.ic_launcher))
                .setDefaults(Notification.DEFAULT_VIBRATE | Notification.DEFAULT_ALL | Notification.DEFAULT_SOUND)
                .build();
    }

    public static void sendMsg(Context context, String title, String content) {
        String channelId = "103";
        NotificationManager manager = getNM(context, channelId);
        Notification notification = createNormalNotification(context, channelId, title, content);
        manager.notify(CODE_MSG++, notification);
    }

    public static void sendEmail(Context context, String title, String content) {
        String channelId = "102";
        NotificationManager manager = getNM(context, channelId);
        Notification notification = createNormalNotification(context, channelId, title, content);
        manager.notify(CODE_EMAIL, notification);
    }

    public static void cancel(Context context) {
        NotificationManager notificationManager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
//        notificationManager.cancelAll();
        notificationManager.cancel(CODE_LAUCH);
    }
}
