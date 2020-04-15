package com.leo.stock.module.monitor;

import android.support.annotation.NonNull;
import android.text.TextUtils;

import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.library.util.FloatUtil;
import com.leo.stock.library.util.LogUtil;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * Created by Leo on 2020/3/25.
 */
public class MonitorBean implements Comparable<MonitorBean>, Serializable {

    public String code;

    public String name;

    // 价格高于
    public float highPrice;
    // 上涨幅度
    public float highPricePercent;

    // 价格低于
    public float lowPrice;
    // 下跌幅度
    public float lowPricePercent;

    // 上一次警报状态 1 涨幅 2上涨价格 -1跌幅 -2 下跌价格
    public transient int lastAlarmState;

    // 上一次警报时间
    public long lastAlarmTime;

    // 上一次警报的股价
    public float lastAlarmPrice;

    public transient float currentPrice;

    public transient float yestodayPrice;

    public transient float todayOpenPrice;

    // 10 成交额,单位为“元”，为了一目了然，通常以“万元”为成交金额的单位，所以通常把该值除以一万
    public transient BigDecimal turnover;

    public MonitorBean(String code) {
        this.code = code;
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
        }

        turnover = sinaStockBean.turnoverDecimal;
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
        if (code.startsWith("123") || code.startsWith("127") || code.startsWith("128") || code.startsWith("3") || code.startsWith("000")) {
            return "sz" + code;
        }

        LogUtil.e("获取沪深编码异常:" + code);
        return "sh" + code;
    }

    // 计算涨跌幅度 %
    public String getHLSpace() {
        float valuef = FloatUtil.handleFloatString(100f * (currentPrice - yestodayPrice) / yestodayPrice, "0.00");
        if (Float.compare(valuef, Float.NaN) == 0) {
            return "0%";
        }
        return valuef + "%";
    }

    public Float getHLSpaceFloat() {
        float value = FloatUtil.handleFloatString(100f * (currentPrice - yestodayPrice) / yestodayPrice, "0.00");
        if (Float.compare(value, Float.NaN) == 0) {
            return 0f;
        }
        return value;
    }

    /**
     * 现价涨跌数
     * @return
     */
    public Float getHL() {
        return FloatUtil.handleFloatString(currentPrice - yestodayPrice, "0.00");
    }

    public String getTurnover() {
        if (turnover == null) {
            return "0.0";
        }

        String result = null;
        long value = 0;
        if (new BigDecimal(turnover.intValue()).compareTo(turnover) == 0) {
            value = turnover.longValue() * 10000;
        } else {
            value = turnover.longValue();
        }

        if (value < 10000) {
            result = value + "";
        } else if (value < 10000 * 10000) {
            result = FloatUtil.handleFloatString(value / 10000f, "0.00") + "万";
        } else {
            result = FloatUtil.handleFloatString(value / (10000 * 10000f), "0.00") + "亿";
        }
        return result;
    }

    @Override
    public int compareTo(MonitorBean o) {
        float value = getHLSpaceFloat();
        if (Float.compare(value, 0) >= 0) {
            return Float.compare(o.getHLSpaceFloat(), getHLSpaceFloat());
        } else {
            return Float.compare(getHLSpaceFloat(), o.getHLSpaceFloat());
        }
    }

    @NonNull
    @Override
    public String toString() {
        return code + "," + name + "," + lastAlarmTime + "," + lastAlarmPrice;
    }
}
