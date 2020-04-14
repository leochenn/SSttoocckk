package com.leo.stock.module.monitor;

import android.content.Context;

import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.notify.NotifycationHelper;

/**
 * Created by Leo on 2020/4/8.
 */
public class MonitorHandler {

    private static final String TAG = "MonitorHandler";

    Context context;
    AlarmBean alarmBean;

    public MonitorHandler(Context context, AlarmBean alarmBean) {
        this.context = context;
        this.alarmBean = alarmBean;
    }

    public void check(MonitorBean bean) {
        if (bean.currentPrice <= 0) {
//            LogUtil.e(TAG, "checkMonitorBean 股价异常:" + bean.code + bean.name + bean.currentPrice);
            return;
        }

        if (Float.compare(bean.lastAlarmPrice, 0) == 0) {
            bean.lastAlarmPrice = bean.yestodayPrice;
        }

        float highPercent = Settings.getPriceHighAlarmInterval(context) / 100;
        if (bean.highPricePercent > 0) {
            highPercent = bean.highPricePercent / 100;
        }
        float highPercentPrice = bean.lastAlarmPrice * (1 + highPercent);

        if (bean.currentPrice > highPercentPrice && (bean.highPrice > 0 && bean.currentPrice > bean.highPrice)) {
            alarmBean.addBean(true, bean);
            bean.highPrice = 0;
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmState = highPercentPrice > bean.highPrice ? 1 : 2;
            bean.lastAlarmTime = System.currentTimeMillis();
        } else if (bean.currentPrice > highPercentPrice) {
            alarmBean.addBean(true, bean);
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmState = 1;
            bean.lastAlarmTime = System.currentTimeMillis();
        } else if (bean.highPrice > 0 && bean.currentPrice > bean.highPrice) {
            alarmBean.addBean(true, bean);
            bean.highPrice = 0;
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmState = 2;
            bean.lastAlarmTime = System.currentTimeMillis();
        }

        float lowPercent = Settings.getPriceLowAlarmInterval(context) / 100;
        if (bean.lowPricePercent > 0) {
            lowPercent = bean.lowPricePercent / 100;
        }
        float lowPercentPrice = bean.lastAlarmPrice * (1 - lowPercent);
        if (bean.currentPrice < lowPercentPrice && bean.currentPrice < bean.lowPrice) {
            alarmBean.addBean(false, bean);
            bean.lowPrice = 0;
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmState = lowPercentPrice < bean.lowPrice ? -1 : -2;
            bean.lastAlarmTime = System.currentTimeMillis();
        } else if (bean.currentPrice < lowPercentPrice) {
            alarmBean.addBean(false, bean);
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmState = -1;
            bean.lastAlarmTime = System.currentTimeMillis();
        } else if (bean.currentPrice < bean.lowPrice) {
            alarmBean.addBean(false, bean);
            bean.lowPrice = 0;
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmState = -2;
            bean.lastAlarmTime = System.currentTimeMillis();
        }
    }

    private void szIndex(MonitorBean bean) {
        alarmBean.addSzIndexBean(bean);

        String content = bean.currentPrice + ",   " + bean.getHLSpace() + ",  " + bean.getHL();
        NotifycationHelper.lauch(context, content);

        // 上涨幅度
        float highPercent = 0.005f;
        if (Float.compare(bean.highPricePercent, 0) != 0) {
            highPercent = bean.highPricePercent / 100;
        }
        float highPercentPrice = bean.lastAlarmPrice * (1 +highPercent);

        // 当前价格同时大于涨幅和价位
        if (bean.currentPrice > highPercentPrice && (bean.highPrice > 0 && bean.currentPrice > bean.highPrice)) {
            bean.highPrice = 0;
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmTime = System.currentTimeMillis();
            if (highPercentPrice > bean.highPrice) {
                bean.lastAlarmState = 1;
                NotifycationHelper.sendMsg(context, "上证上涨幅度警报", bean.getHLSpace());
            } else {
                bean.lastAlarmState = 1;
                NotifycationHelper.sendMsg(context, "上证上涨价位警报", bean.currentPrice + "," + bean.getHLSpace());
            }
        } else if (bean.currentPrice > highPercentPrice) {
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmState = 1;
            bean.lastAlarmTime = System.currentTimeMillis();
            NotifycationHelper.sendMsg(context, "上证上涨幅度警报", bean.getHLSpace());
        } else if (bean.highPrice > 0 && bean.currentPrice > bean.highPrice) {
            bean.highPrice = 0;
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmState = 1;
            bean.lastAlarmTime = System.currentTimeMillis();
            NotifycationHelper.sendMsg(context, "上证上涨价位警报", bean.currentPrice + "," + bean.getHLSpace());
        }

        // 下跌幅度
        float lowPercent = 0.005f;
        if (Float.compare(bean.lowPricePercent, 0) != 0) {
            lowPercent = bean.lowPricePercent / 100;
        }
        float lowPercentPrice = bean.lastAlarmPrice * (1 - lowPercent);

        if (bean.currentPrice < lowPercentPrice && bean.currentPrice < bean.lowPrice) {
            bean.lowPrice = 0;
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmTime = System.currentTimeMillis();
            if (lowPercentPrice < bean.lowPrice) {
                bean.lastAlarmState = 2;
                NotifycationHelper.sendMsg(context, "上证下跌幅度警报", bean.getHLSpace());
            } else {
                bean.lastAlarmState = 2;
                NotifycationHelper.sendMsg(context, "上证下跌价位警报", bean.currentPrice + "," + bean.getHLSpace());
            }
        } else if (bean.currentPrice < lowPercentPrice) {
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmState = 2;
            bean.lastAlarmTime = System.currentTimeMillis();
            NotifycationHelper.sendMsg(context, "上证下跌幅度警报", bean.getHLSpace());
        } else if (bean.currentPrice < bean.lowPrice) {
            bean.lowPrice = 0;
            bean.lastAlarmPrice = bean.currentPrice;
            bean.lastAlarmState = 2;
            bean.lastAlarmTime = System.currentTimeMillis();
            NotifycationHelper.sendMsg(context, "上证下跌价位警报", bean.currentPrice + "," + bean.getHLSpace());
        }
    }
}
