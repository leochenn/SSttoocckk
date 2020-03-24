package com.leo.stock.module.notify;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import com.leo.stock.module.service.BgService;

/**
 * Created by Leo on 2019/12/25.
 */
public class NotificationBroadcastReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action.equals("com.leo.stock.cancel")) {
            NotifycationHelper.send(context);
            start(context);
        }
    }

    private void start(Context context) {
        if (!BgService.isRunning()) {
            Intent intent = new Intent(context, BgService.class);
            context.startService(intent);
        }
    }
}
