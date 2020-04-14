package com.leo.stock.module.monitor;

import android.content.Context;

import com.leo.stock.library.base.IRequestListener;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.notify.NotifycationHelper;
import com.leo.stock.module.stock.StockHelper;

import java.util.Calendar;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;

/**
 * Created by Leo on 2020/3/26.
 */
public class MonitorTimer {

    private static final String TAG = "MonitorTimer";

    Context context;
    Timer timer;

    // 获取失败次数
    int failedCount;

    public MonitorTimer(Context context) {
        this.context = context;
    }

    public void start() {
        checkTimeValid();
    }

    public void checkTimeValid() {
        Calendar cal = Calendar.getInstance();
        int hour = cal.get(Calendar.HOUR_OF_DAY);
        int minute = cal.get(Calendar.MINUTE);
        int second = cal.get(Calendar.SECOND);

        int minuteOfDay = hour * 60 * 60 + minute * 60 + second;

        final int start = 9 * 60 * 60 + 23 * 60;
        final int end = 11 * 60 * 60 + 32 * 60;

        final int start2 = 12 * 60 * 60 + 58 * 60;

        int endTime = Settings.getEndTime(context);
        final int end2 = endTime * 60 * 60 + 60;

        if (minuteOfDay >= start && minuteOfDay <= end) {
            loadPrice();
            return;
        }

        if (minuteOfDay >= start2 && minuteOfDay <= end2) {
            loadPrice();
            return;
        }

        if (minuteOfDay > end2) {
            handleFail("已收盘");
            return;
        }

        long reStart = 0;
        if (minuteOfDay < start) {
            NotifycationHelper.sendMsg(context, "提示", "未到开盘时间");
            LogUtil.d(TAG, "未到开盘时间");
            reStart = (start - minuteOfDay) * 1000;
        } else {
            LogUtil.d(TAG, "中午休息时间");
            NotifycationHelper.sendMsg(context, "提示", "中午休息时间");
            reStart = (start2 - minuteOfDay) * 1000;
        }

        pauseTime(reStart);
    }

    private void pauseTime(long delay) {
        if (timer == null) {
            timer = new Timer();
        }

        timer.schedule(new TimerTask() {
            @Override
            public void run() {
                LogUtil.d(TAG, "延期执行恢复");
                checkTimeValid();
            }
        }, delay);
    }

    public void stop() {
        if (timer != null) {
            timer.cancel();
        }
    }

    public void startTimer() {
        if (timer == null) {
            timer = new Timer();
        }

        timer.schedule(new TimerTask() {
            @Override
            public void run() {
                checkTimeValid();
            }
        }, Settings.getRefreshInterval(context) * 1000);
    }

    private void loadPrice() {
        if (failedCount > 4) {
            handleFail("获取实时价格失败三次");
            return;
        }

        StockHelper.getSimpleStockList(new IRequestListener<List<MonitorBean>>() {
            @Override
            public void success(List<MonitorBean> data) {
                failedCount = 0;
                StockMonitorMgr.getInstance().checkMonitorBean();
            }

            @Override
            public void failed(int code, String error) {
                failedCount++;
                startTimer();
            }
        });
    }

    private void handleFail(String msg) {
        LogUtil.e(TAG, msg);
        NotifycationHelper.sendMsg(context, "提示", msg);
        BgService.stopService(context);
    }
}
