package com.leo.stock.module.service;

import android.content.Context;

import com.leo.stock.App;
import com.leo.stock.library.base.ExeOperator;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.email.Config;
import com.leo.stock.module.email.MailHelper;
import com.leo.stock.module.notify.NotifycationHelper;

import org.jetbrains.annotations.NotNull;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.HttpUrl;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.internal.platform.OkHttpManager;

/**
 * Created by Leo on 2020/3/25.
 */
public class StockMonitorMgr {

    private static final String TAG = "StockMonitorMgr";

    private static StockMonitorMgr instance;

    private Context context;

    MonitorTimer monitorTimer;

    MonitorStrategy monitorStrategy;

    private StockMonitorMgr() {
        context = App.getInstance().getApplicationContext();
    }

    public void start() {
        HttpUrl url = HttpUrl.get("https://leochenandroid.gitee.io/stock/stockids.txt");
        Request request = new Request.Builder().get().url(url).build();
        OkHttpManager.getIntance().newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NotNull Call call, @NotNull IOException e) {
                handleFail("获取代码列表失败" + e.getMessage());
            }

            @Override
            public void onResponse(@NotNull Call call, @NotNull Response response) throws IOException {
                LogUtil.d(TAG, "获取代码列表成功");

                List<MonitorBean> beanList = new ArrayList<>();

                try {
                    BufferedReader reader =
                            new BufferedReader(new InputStreamReader(response.body().byteStream()));
                    String line = null;
                    while ((line = reader.readLine()) != null) {
                        MonitorBean bean = new MonitorBean();
                        bean.code = line;
                        beanList.add(bean);
                    }
                } catch (Exception e) {
                    LogUtil.e(e, "onResponse");
                }

                if (beanList.isEmpty()) {
                    handleFail("获取代码列表为空");
                } else {
                    monitorTimer = new MonitorTimer(context, beanList);
                    monitorTimer.start();
                }
            }
        });
    }

    public void checkMonitorBean(List<MonitorBean> monitorBeanList) {
        if (monitorStrategy == null) {
            monitorStrategy = new MonitorStrategy();
        }

        AlarmBean alarmBean = new AlarmBean();

        for (MonitorBean bean : monitorBeanList) {
            if (Float.compare(bean.lastAlarmPrice, 0) == 0) {
                bean.lastAlarmPrice = bean.yestodayPrice;
            }

            float high = bean.lastAlarmPrice * (1 + Settings.getPriceHighAlarmInterval(context) / 100);
            float low = bean.lastAlarmPrice * (1 - Settings.getPriceLowAlarmInterval(context) / 100);

            if (Float.compare(bean.currentPrice, 0) > 0) {
                if (Float.compare(bean.currentPrice, high) > 0) {
                    alarmBean.set(true, bean);
                    bean.lastAlarmPrice = bean.currentPrice;
                    bean.lastAlarmState = 1;
                    bean.lastAlarmTime = System.currentTimeMillis();
                }

                if (Float.compare(bean.currentPrice, low) < 0) {
                    alarmBean.set(false, bean);
                    bean.lastAlarmPrice = bean.currentPrice;
                    bean.lastAlarmState = 2;
                    bean.lastAlarmTime = System.currentTimeMillis();
                }
            }
        }

        if (alarmBean.available()) {
            needAlarm(alarmBean);
        } else {
            LogUtil.d(TAG, "alarm not");
        }

        if (monitorTimer != null) {
            monitorTimer.startTimer();
        }
    }

    long lastAlarmTime;
    private void needAlarm(final AlarmBean alarmBean) {
        long currentTime = System.currentTimeMillis();

        long interval = Settings.getAlarmInterval(context) * 1000;
        if (lastAlarmTime != 0 && currentTime - lastAlarmTime < interval) {
            LogUtil.e(TAG, "alarm in 60s");
            return;
        }
        lastAlarmTime = currentTime;

        LogUtil.e(TAG, "alarm!!!");
        LogUtil.d(TAG, alarmBean);

        if (Settings.isEmailAlarmEnable(context)) {
            ExeOperator.runOnThread(new Runnable() {
                @Override
                public void run() {
                    boolean state = true;
                    state = MailHelper.getInstance().sendEmail(Config.RECIEVE_ADDRESS,
                            alarmBean.getEmailPersonal(), alarmBean.emailSubject, alarmBean.emailContent);
                    NotifycationHelper.sendEmail(context, (state ? "邮件发送成功" : "邮件发送失败"),
                            alarmBean.emailSubject);
                }
            });
        }

        if (Settings.isSoundAlarmEnable(context)) {

        }

        if (Settings.isNotifyAlarmEnable(context)) {

        }
    }

    private void handleFail(String msg) {
        LogUtil.e(TAG, msg);
        NotifycationHelper.sendTip(context, "Tip", msg);
        BgService.stopService(context);
    }

    public static StockMonitorMgr getInstance() {
        if (instance == null) {
            instance = new StockMonitorMgr();
        }
        return instance;
    }

    public static void destroy() {
        if (instance != null && instance.monitorTimer != null) {
            instance.monitorTimer.stop();
        }
        instance = null;
    }
}
