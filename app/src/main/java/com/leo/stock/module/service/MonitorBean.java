package com.leo.stock.module.service;

import android.text.TextUtils;

import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.library.util.LogUtil;

/**
 * Created by Leo on 2020/3/25.
 */
public class MonitorBean {

    public String code;

    public String name;

    // 上一次警报状态 1 上涨 2下跌
    public int lastAlarmState;

    // 上一次警报时间
    public long lastAlarmTime;

    // 上一次警报的股价
    public float lastAlarmPrice;

    public float currentPrice;

    public float yestodayPrice;

    public float todayOpenPrice;

    public String getCode() {
        if (TextUtils.isEmpty(code)) {
            return null;
        }
        if (code.startsWith("110") || code.startsWith("113") || code.startsWith("6") || code.startsWith("5")) {
            return "sh" + code;
        }

        if (code.startsWith("123") || code.startsWith("127") || code.startsWith("128") || code.startsWith("0")) {
            return "sz" + code;
        }

        return code;
    }

    public void setStockBean(SinaStockBean sinaStockBean) {
        name = sinaStockBean.stockName;

        if (Float.compare(0, sinaStockBean.lastClosePrice) != 0) {
            yestodayPrice = sinaStockBean.lastClosePrice;
        }
        if (Float.compare(0, sinaStockBean.todayOpenPrice) != 0) {
            todayOpenPrice = sinaStockBean.todayOpenPrice;
        }

        if (Float.compare(0, sinaStockBean.todayCurrentPrice) != 0) {
            currentPrice = sinaStockBean.todayCurrentPrice;
        } else {
            LogUtil.e("Error sinaStockBean currentPrice null!!!");
        }
    }
}
