package com.leo.stock.module.service;

import android.support.annotation.Nullable;
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
        }
    }

    public String getCode() {
        if (TextUtils.isEmpty(code)) {
            return null;
        }
        // 上海发债7，可转债 110,113， 基金51
        if (code.startsWith("000001") || code.startsWith("110") || code.startsWith("113") || code.startsWith("6") || code.startsWith("5") || code.startsWith("7")) {
            return "sh" + code;
        }

        // 深圳发债3，可转债123,127,128
        if (code.startsWith("123") || code.startsWith("127") || code.startsWith("128") || code.startsWith("3")) {
            return "sz" + code;
        }

        LogUtil.e("获取沪深编码异常:" + code);
        return "sh" + code;
    }

    public boolean equals(@Nullable MonitorBean obj) {
        if (code.equals(obj.code)) {
            return true;
        }
        return super.equals(obj);
    }
}
