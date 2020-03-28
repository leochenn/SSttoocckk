package com.leo.stock.module.service;

import android.content.Context;
import android.text.TextUtils;

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

    long lastAlarmTime;

    private StockMonitorMgr() {
        context = App.getInstance().getApplicationContext();
    }

    public void start() {
        String url = "https://leochenandroid.gitee.io/stock/stockids.txt";
        url = "http://172.16.162.17/stockid.txt";

        Request request = new Request.Builder().get().url(url).build();
        OkHttpManager.getIntance().newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NotNull Call call, @NotNull IOException e) {
                handleFail("获取代码列表失败" + e.getMessage());
            }

            @Override
            public void onResponse(@NotNull Call call, @NotNull Response response) throws IOException {
                List<MonitorBean> beanList = new ArrayList<>();

                try {
                    BufferedReader reader =
                            new BufferedReader(new InputStreamReader(response.body().byteStream()));
                    String line = null;
                    boolean hasSh = false;
                    while (!TextUtils.isEmpty(line = reader.readLine())) {
                        MonitorBean bean = new MonitorBean();
                        bean.code = line;
                        if (line.contains("000001")) {
                            hasSh = true;
                        }
                        beanList.add(bean);
                    }
                    if (!hasSh) {
                        MonitorBean bean = new MonitorBean();
                        bean.code = "000001";
                        beanList.add(bean);
                    }
                } catch (Exception e) {
                    LogUtil.e(e, "onResponse");
                }

                if (beanList.isEmpty()) {
                    handleFail("获取代码列表为空");
                } else {
                    LogUtil.d(TAG, "代码数量:" + beanList.size());
                    monitorTimer = new MonitorTimer(context, beanList);
                    monitorTimer.start();
                }
            }
        });
    }

    public void checkMonitorBean(List<MonitorBean> monitorBeanList) {
        AlarmBean alarmBean = new AlarmBean();

        for (MonitorBean bean : monitorBeanList) {
            if (Float.compare(bean.lastAlarmPrice, 0) == 0) {
                bean.lastAlarmPrice = bean.yestodayPrice;
            }

            float high = bean.lastAlarmPrice * (1 + Settings.getPriceHighAlarmInterval(context) / 100);
            float low = bean.lastAlarmPrice * (1 - Settings.getPriceLowAlarmInterval(context) / 100);

            if (Float.compare(bean.currentPrice, 0) > 0) {
                //  更新上证指数
                if (bean.code.contains("000001")) {
                    alarmBean.addSzIndexBean(bean);
                    String content = bean.currentPrice + ",   " + bean.getHLSpace() + ",  " + bean.getHL();
                    NotifycationHelper.lauch(context, content);

                    float high1 = bean.lastAlarmPrice * (1 + 0.005f);
                    float low1 = bean.lastAlarmPrice * (1 - 0.005f);

                    if (Float.compare(bean.currentPrice, high1) > 0) {
                        bean.lastAlarmPrice = bean.currentPrice;
                        bean.lastAlarmState = 1;
                        bean.lastAlarmTime = System.currentTimeMillis();
                        NotifycationHelper.sendMsg(context, "上证指数上涨警报", bean.getHLSpace());
                    }
                    if (Float.compare(bean.currentPrice, low1) < 0) {
                        bean.lastAlarmPrice = bean.currentPrice;
                        bean.lastAlarmState = 2;
                        bean.lastAlarmTime = System.currentTimeMillis();
                        NotifycationHelper.sendMsg(context, "上证指数下跌警报", bean.getHLSpace());
                    }
                }

                if (Float.compare(bean.currentPrice, high) > 0) {
                    alarmBean.addBean(true, bean);
                    bean.lastAlarmPrice = bean.currentPrice;
                    bean.lastAlarmState = 1;
                    bean.lastAlarmTime = System.currentTimeMillis();
                }

                if (Float.compare(bean.currentPrice, low) < 0) {
                    alarmBean.addBean(false, bean);
                    bean.lastAlarmPrice = bean.currentPrice;
                    bean.lastAlarmState = 2;
                    bean.lastAlarmTime = System.currentTimeMillis();
                }
            } else {
                LogUtil.e(TAG, "checkMonitorBean 股价异常:" + bean.code + bean.name + bean.currentPrice);
            }
        }

        if (alarmBean.handle()) {
            alarm(alarmBean);
        }

        if (monitorTimer != null) {
            monitorTimer.startTimer();
        }
    }

    private void alarm(final AlarmBean alarmBean) {
        long currentTime = System.currentTimeMillis();
        long interval = Settings.getAlarmInterval(context) * 1000;
        if (lastAlarmTime != 0 && currentTime - lastAlarmTime < interval) {
            LogUtil.e(TAG, "警报间隔" + Settings.getAlarmInterval(context));
            return;
        }
        lastAlarmTime = currentTime;
        LogUtil.d(TAG, "警报" + alarmBean);

        if (Settings.isEmailAlarmEnable(context)) {
            ExeOperator.runOnThread(new Runnable() {
                @Override
                public void run() {
                    String subject = alarmBean.emailSubject;
                    String personal = alarmBean.emailPersonal;
                    String content = alarmBean.emailContent;
                    boolean state = MailHelper.getInstance().sendEmail(Config.RECIEVE_ADDRESS,
                            personal, subject, content);
                    if (!state) {
                        NotifycationHelper.sendEmail(context, "邮件发送失败" + subject, content);
                    }
                }
            });
        }

        if (Settings.isSoundAlarmEnable(context)) {

        }

        if (Settings.isNotifyAlarmEnable(context)) {
            NotifycationHelper.sendMsg(context, alarmBean.emailSubject, alarmBean.emailContent);
        }
    }

    private void handleFail(String msg) {
        LogUtil.e(TAG, msg);
        NotifycationHelper.sendMsg(context, "错误", msg);
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
