package com.leo.stock.module.monitor;

import android.text.TextUtils;

import com.leo.stock.Bean.EmailBeans;
import com.leo.stock.Bean.LocalBean;
import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.biz.StockMainBiz;
import com.leo.stock.library.base.ExeOperator;
import com.leo.stock.library.base.LocalTimer;
import com.leo.stock.library.base.UIHandler;
import com.leo.stock.library.io.FileIO;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.email.MailHelper;
import com.leo.stock.module.notify.NotifycationHelper;
import com.leo.stock.ui.StockMainActivity;

import java.util.Calendar;
import java.util.List;

/**
 * Created by Leo on 2019/12/23.
 */
public class Monitor {

    static final String TAG = "Monitor";

    StockMainBiz stockMainBiz;
    StockMainActivity stockMainActivity;

    LocalTimer localTimer;
    EmailBeans emailBeans;
    long frequesy;

    public Monitor(StockMainActivity stockMainActivity, StockMainBiz stockMainBiz) {
        this.stockMainActivity = stockMainActivity;
        this.stockMainBiz = stockMainBiz;
    }

    public void start(long delay, long frequency) {
        this.frequesy = frequency * 1000;
        localTimer = new LocalTimer(this);
        localTimer.start(delay, frequesy);
    }

    public boolean isRunning() {
        if (localTimer != null) {
            return localTimer.isRunning();
        }
        return false;
    }

    public void stop() {
        if (localTimer != null) {
            localTimer.stop();
        }
        localTimer = null;
    }

    public void doScheduleWork() {
        stockMainBiz.loadSinalStockBeans();
    }

    public boolean isCurrentTimeValid() {
        Calendar cal = Calendar.getInstance();
        int hour = cal.get(Calendar.HOUR_OF_DAY);
        int minute = cal.get(Calendar.MINUTE);
        int minuteOfDay = hour * 60 + minute;

        final int start = 9 * 60;
        final int end = 11 * 60 + 31;

        final int start2 = 12 * 60 + 59;
        final int end2 = 15 * 60 + 1;

        if (minuteOfDay >= start && minuteOfDay <= end) {
            return true;
        }

        if (minuteOfDay >= start2 && minuteOfDay <= end2) {
            return true;
        }

        stop();

        if (minuteOfDay > end && minuteOfDay < start2) {
            LogUtil.d(TAG, "中午时间推迟执行");
            long reStart = (start2 - minuteOfDay) * 60 * 1000;
            start(reStart, frequesy);
        } else {
            LogUtil.d(TAG, "非法时间段");
            stockMainActivity.invalidTime();
        }
        return false;
    }

    public void checkNotify() {
        emailBeans = null;

        final List<SinaStockBean> sinaStockBeans = stockMainBiz.getSinaStockBeans();
        final List<LocalBean> localBeans = stockMainBiz.getLocalBeans();
        if (localBeans == null || sinaStockBeans == null) {
            LogUtil.e(TAG, "当前无数据,不需要检查预警", "data null");
            return;
        }

        for (LocalBean bean : localBeans) {
            if (!bean.monitorEnable) {
                LogUtil.e(TAG, "预警未开启", bean.id);
                continue;
            }

            for (SinaStockBean sinaStockBean : sinaStockBeans) {
                if (!bean.id.equals(sinaStockBean.stockId)) {
                    continue;
                }

                if (bean.low != 0 && bean.low >= sinaStockBean.todayCurrentPrice) {
                    LogUtil.e(TAG, "低价预警", sinaStockBean.stockName);
                    changeBeanMonitor(bean);
                    addEmailBean(EmailBeans.LOW, bean, sinaStockBean);
                } else if (bean.high != 0 && bean.high <= sinaStockBean.todayCurrentPrice) {
                    LogUtil.e(TAG, "高价预警", sinaStockBean.stockName);
                    changeBeanMonitor(bean);
                    addEmailBean(EmailBeans.HIGH, bean, sinaStockBean);
                } else {
                    LogUtil.d(TAG, "股价正常范围", sinaStockBean.stockName);
                }
            }
        }

        if (emailBeans != null) {
            emailBeans.handle();
            sendEmail();
        }
    }

    private void changeBeanMonitor(LocalBean bean) {
        bean.monitorEnable = false;
        FileIO.save(stockMainActivity, bean);
    }

    private void sendEmail() {
        LogUtil.d("铃声开启状态:" + stockMainActivity.canRing() + ", 邮件开启状态:" + stockMainActivity.canEmail() + ",设置的邮箱为:" + emailBeans.email);

        if (stockMainActivity.canRing()) {
            UIHandler.post(new Runnable() {
                @Override
                public void run() {
                    stockMainActivity.startByMonitor();
                }
            });
        }

        if (stockMainActivity.canEmail() && !TextUtils.isEmpty(emailBeans.email)) {
            ExeOperator.runOnThread(new Runnable() {
                @Override
                public void run() {
                    final boolean state = MailHelper.getInstance().sendEmail(emailBeans.email,
                            emailBeans.personal, emailBeans.subject, emailBeans.content);
                    NotifycationHelper.send2(stockMainActivity, (state ? "邮件发送成功" : "邮件发送失败"),
                            emailBeans.subject);
                }
            });
        }
    }

    private void addEmailBean(int state, LocalBean localBean, SinaStockBean sinaStockBean) {
        if (emailBeans == null) {
            emailBeans = new EmailBeans();
        }
        emailBeans.add(state, localBean, sinaStockBean);
    }
}
