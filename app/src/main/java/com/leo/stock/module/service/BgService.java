package com.leo.stock.module.service;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.support.annotation.Nullable;

import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.notify.NotifycationHelper;

/**
 * Created by Leo on 2020/3/24.
 */
public class BgService extends Service {

    private static final String TAG = "BgService";

    private static boolean isRunning;

    @Override
    public void onCreate() {
        super.onCreate();
        LogUtil.d(TAG, "onCreate");
        isRunning = true;
        NotifycationHelper.send(this);
    }

    @Override
    public void onDestroy() {
        LogUtil.d(TAG, "onDestroy");
        isRunning = false;
        NotifycationHelper.cancel(this);
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        LogUtil.d(TAG, "onBind");
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        LogUtil.d(TAG, "onStartCommand");
        return super.onStartCommand(intent, flags, startId);
    }

    public static boolean isRunning() {
        return isRunning;
    }
}
