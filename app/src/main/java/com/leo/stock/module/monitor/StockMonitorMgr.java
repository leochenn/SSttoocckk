package com.leo.stock.module.monitor;

import android.content.Context;

import com.leo.stock.App;
import com.leo.stock.library.base.ExeOperator;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.email.Config;
import com.leo.stock.module.email.MailHelper;
import com.leo.stock.module.notify.NotifycationHelper;

/**
 * Created by Leo on 2020/3/25.
 */
public class StockMonitorMgr {

    private static final String TAG = "StockMonitorMgr";

    private static StockMonitorMgr instance;

    private Context context;

    MonitorTimer monitorTimer;

    long lastAlarmTime;

    private MonitorBeans monitorBeans;

    private StockMonitorMgr() {
        context = App.getInstance().getApplicationContext();
    }

    public void start() {
        monitorBeans = new MonitorBeans();
        StockIdLoader loader = new StockIdLoader(monitorBeans);
        loader.startLoad();
    }

    public void loadStockIdSuccess() {
        if (monitorBeans.getMonitorBean("000001") == null) {
            MonitorBean monitorBean = new MonitorBean("000001");
            monitorBean.highPricePercent = 3;
            monitorBean.lowPricePercent = 3;
            monitorBeans.add(monitorBean);
        }

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
            monitorHandler.check(bean);
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

    public static StockMonitorMgr getInstance() {
        if (instance == null) {
            instance = new StockMonitorMgr();
        }
        return instance;
    }

    public static void destroy() {
        IO.saveToLocal(IO.getLocalFilePath(App.getInstance().getApplicationContext()), StockMonitorMgr.getInstance().getMonitorBeans());
        if (instance != null && instance.monitorTimer != null) {
            instance.monitorTimer.stop();
        }
        instance = null;
    }
}
