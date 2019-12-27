package com.leo.stock.module.monitor;

import android.text.TextUtils;
import android.widget.Toast;

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

    public void timerPaused() {
        LogUtil.d(TAG, "timerPaused");
        stop();

        long reStart = 90 * 60 * 1000;
        start(reStart, frequesy);
    }

    public void invalidTime() {
        LogUtil.d(TAG, "invalidTime");
        stop();
        stockMainActivity.invalidTime();
    }

    public void checkNotify() {
        emailBeans = null;

        final List<SinaStockBean> sinaStockBeans = stockMainBiz.getSinaStockBeans();
        final List<LocalBean> localBeans = stockMainBiz.getLocalBeans();
        if (localBeans == null || sinaStockBeans == null) {
            LogUtil.e(TAG, "checkNotify", "data null");
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

                if (bean.low >= sinaStockBean.todayCurrentPrice) {
                    LogUtil.e(TAG, "低价预警", sinaStockBean.stockName);
                    changeBeanMonitor(bean);
                    addEmailBean(EmailBeans.LOW, bean, sinaStockBean);
                } else if (bean.high <= sinaStockBean.todayCurrentPrice) {
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
                    final boolean state = MailHelper.getInstance().sendEmail(emailBeans.email, emailBeans.personal, emailBeans.subject, emailBeans.content);
                    NotifycationHelper.send2(stockMainActivity, (state ? "邮件发送成功" : "邮件发送失败"), emailBeans.subject);
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
