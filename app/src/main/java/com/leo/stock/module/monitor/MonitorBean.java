package com.leo.stock.module.monitor;

import android.support.annotation.NonNull;
import android.text.TextUtils;

import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.library.util.FloatUtil;
import com.leo.stock.library.util.StockUtil;

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

    // 现价
    public transient float currentPrice;

    // 昨日收盘价
    public transient float yestodayPrice;

    // 开盘价
    public transient float todayOpenPrice;

    // 10 成交额,单位为“元”，为了一目了然，通常以“万元”为成交金额的单位，所以通常把该值除以一万
    public transient BigDecimal turnover;

    public StockId stockId;

    public MonitorBean(String code) {
        StockId id = new StockId();
        id.stockCode = code;
        this.stockId = id;
        this.code = code;
    }

    public MonitorBean(StockId stockId) {
        this.stockId = stockId;
        code = stockId.stockCode;
    }

    public String getName() {
        if (TextUtils.isEmpty(name)) {
            if (stockId != null) {
                return stockId.stockName;
            }
        }
        return name;
    }

    public boolean isOwn() {
        if (stockId == null) {
            return false;
        }
        return stockId.stockCount > 0;
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

    public String getHSCode() {
        return StockUtil.getHSCode(code);
    }

    public String getEastMoneyUrl() {
        if (TextUtils.isEmpty(code)) {
            return "";
        }
        if (getHSCode().contains("sh")) {
            return "https://wap.eastmoney.com/quota/stock/index/" + code + "1";
        }
        return "https://wap.eastmoney.com/quota/stock/index/" + code + "2";
    }

    // 计算涨跌幅度 %
    public String getHLSpace() {
        if (currentPrice == 0) {
            return "0%";
        }
        float valuef = FloatUtil.handleFloatString(100f * (currentPrice - yestodayPrice) / yestodayPrice, "0.00");
        if (Float.compare(valuef, Float.NaN) == 0) {
            return "0%";
        }
        return valuef + "%";
    }

    public Float getHLSpaceFloat() {
        if (currentPrice == 0) {
            return 0f;
        }
        float value = FloatUtil.handleFloatString(100f * (currentPrice - yestodayPrice) / yestodayPrice, "0.00");
        if (Float.compare(value, Float.NaN) == 0) {
            return 0f;
        }
        return value;
    }

    /**
     * 计算盈亏
     * @return
     */
    public Float getProfitLoss() {
        Float hl = getHL();
        if (hl == 0) {
            return 0f;
        }

        if (stockId == null) {
            return 0f;
        }
        int count = stockId.stockCount;

        BigDecimal bigDecimal = new BigDecimal(StockUtil.getBondCount(code, count)).multiply(new BigDecimal(0.01)).multiply(new BigDecimal(getHLSpaceFloat())).multiply(new BigDecimal(yestodayPrice));
//        getHLSpaceFloat() * 0.01F * StockUtil.getBondCount(code, count) * yestodayPrice;
        return bigDecimal.setScale(2, BigDecimal.ROUND_HALF_UP).floatValue();
    }

    /**
     * 现价涨跌数
     * @return
     */
    public Float getHL() {
        if (currentPrice == 0) {
            return 0f;
        }
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
        value = turnover.longValue();

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
        return code + "," + getName() + "," + lastAlarmTime + "," + lastAlarmPrice;
    }
}
