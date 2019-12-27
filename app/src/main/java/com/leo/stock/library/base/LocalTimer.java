package com.leo.stock.library.base;

import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.monitor.Monitor;

import java.util.Timer;
import java.util.TimerTask;

/**
 * Created by Leo on 2019/12/25.
 */
public class LocalTimer extends TimerTask {

    static final String TAG = "LocalTimer";

    Timer timer;
    Monitor monitor;
    boolean isRunning;

    public LocalTimer(Monitor monitor) {
        this.monitor = monitor;
    }

    public void start(long delay, long period) {
        LogUtil.d(TAG, "start");
        isRunning = true;
        timer = new Timer();
        timer.schedule(this, delay, period);
    }

    public void stop() {
        LogUtil.d(TAG, "stop");
        isRunning = false;
        timer.cancel();
        timer = null;
    }

    public boolean isRunning() {
        return isRunning;
    }

    @Override
    public void run() {
        if (!isRunning) {
            LogUtil.e(TAG, "已中断运行");
            return;
        }

        if (!monitor.isCurrentTimeValid()) {
            LogUtil.e(TAG, "时间不合法");
            return;
        }

        LogUtil.d(TAG, "正在执行...");

        UIHandler.post(new Runnable() {
            @Override
            public void run() {
                monitor.doScheduleWork();
            }
        });
    }
}
