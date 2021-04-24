package com.leo.stock.module.monitor;

import android.content.Context;

import com.leo.stock.App;
import com.leo.stock.library.base.ExeOperator;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.email.Config;
import com.leo.stock.module.email.MailHelper;
import com.leo.stock.module.notify.NotifycationHelper;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by Leo on 2020/3/25.
 */
public class StockMonitorMgr {

    private static final String TAG = "StockMonitorMgr";

    private static StockMonitorMgr instance;

    private Context context;

    private MonitorTimer monitorTimer;

    private long lastAlarmTime;

    private List<Runnable> updateListener;

    private MonitorBeans monitorBeans = new MonitorBeans();

    private StockMonitorMgr() {
        context = App.getInstance().getApplicationContext();
    }

    public void start() {
        monitorBeans.clear();
        StockIdLoader loader = new StockIdLoader(monitorBeans);
        loader.startLoad();
    }

    public void addSZIndex() {
        if (monitorBeans.getMonitorBean("000001") == null) {
            MonitorBean monitorBean = new MonitorBean("000001");
            monitorBean.highPricePercent = 0.5f;
            monitorBean.lowPricePercent = 0.5f;
            monitorBeans.add(monitorBean);
            LogUtil.d(TAG, "添加上证指数");
        }
    }

    public void resetLastAlarm(int type) {
        for (MonitorBean bean : monitorBeans.getCollection()) {
            if (bean.lastAlarmTime != 0 && Float.compare(bean.lastAlarmPrice, 0) != 0) {
                if (type == 1 || !MonitorTimer.isSameDay(bean.lastAlarmTime)) {
                    LogUtil.d(TAG, "上次警报时间重置", bean);
                    bean.lastAlarmTime = 0;
                    bean.lastAlarmPrice = 0f;
                }
            }
        }
    }

    public void loadStockIdSuccess() {
        monitorTimer = new MonitorTimer(context);
        monitorTimer.start();
    }

    public MonitorBeans getMonitorBeans() {
        return monitorBeans;
    }

    public void checkMonitorBean() {
        AlarmBean alarmBean = new AlarmBean();
        MonitorHandler monitorHandler = new MonitorHandler(context, alarmBean);

        for (MonitorBean bean : monitorBeans.getCollection()) {
            if (bean.code.contains("000001")) {
                alarmBean.addSzIndexBean(bean);
                String content = bean.currentPrice + ",   " + bean.getHLSpace() + ",  " + bean.getHL();
                NotifycationHelper.lauch(context, content);
            }

            monitorHandler.check(bean);
        }

        if (alarmBean.handle()) {
            alarm(alarmBean);
        }

        checkUpdateListener();

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
//        LogUtil.d(TAG, "警报" + alarmBean);

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
            NotifycationHelper.sendMsg(context, alarmBean.emailSubject, alarmBean.notifyContent);
        }
    }

    public void gather() {
        if (monitorBeans != null && monitorBeans.getCollection().size() > 0) {
            LogUtil.d(TAG, "开始统计");
            resetLastAlarm(1);
            loadStockIdSuccess();
        }
    }

    private void checkUpdateListener() {
        if (updateListener != null) {
            for (Runnable event : updateListener) {
                event.run();
            }
        }
    }

    public void registerUpdate(Runnable event) {
        if (updateListener == null) {
            updateListener = new ArrayList<>();
        }
        updateListener.add(event);
    }

    public void unregisterUpdate(Runnable event) {
        if (updateListener != null) {
            updateListener.remove(event);
        }
    }

    public static StockMonitorMgr getInstance() {
        if (instance == null) {
            instance = new StockMonitorMgr();
        }
        return instance;
    }

    public static void destroy() {
        IO.saveToLocal(IO.getLocalFilePath(App.getInstance().getApplicationContext()), getInstance().getMonitorBeans());
        if (instance != null && instance.monitorTimer != null) {
            instance.monitorTimer.stop();
            instance.monitorTimer = null;
        }
    }
}
