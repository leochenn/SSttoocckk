package com.leo.stock.library.base;

import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.monitor.Monitor;

import java.util.Calendar;
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

        if (!isTimeValid()) {
            LogUtil.e(TAG, "非合法时间段");
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

    private boolean isTimeValid() {
        Calendar cal = Calendar.getInstance();
        int hour = cal.get(Calendar.HOUR_OF_DAY);
        int minute = cal.get(Calendar.MINUTE);
        int minuteOfDay = hour * 60 + minute;
        final int start = 9 * 60 + 24;
        final int end = 11 * 60 + 31;

        final int start2 = 12 * 60 + 59;
        final int end2 = 15 * 60 + 1;

        if (minuteOfDay >= start && minuteOfDay <= end) {
            return true;
        }
        if (minuteOfDay >= start2 && minuteOfDay <= end2) {
            return true;
        }

        if (minuteOfDay > end && minuteOfDay < start2) {
            monitor.timerPaused();
            return false;
        }
        monitor.invalidTime();
        return false;
    }
}
