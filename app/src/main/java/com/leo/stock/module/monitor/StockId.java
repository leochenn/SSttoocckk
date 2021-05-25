package com.leo.stock.module.monitor;

import com.leo.stock.library.util.LogUtil;

/**
 * Created by Leo on 2021/4/24.
 * 对应excel的字段
 */
public class StockId {
    // 计算当前盈亏   昨日收盘价*持仓数量* 涨跌幅度

    // 证券代码
    public String stockCode;
    // 证券名称
    public String stockName;
    // 证券持仓数量
    public int stockCount;
    // 持仓成本 三位小数点
    public double stockCostPrice;

    public void setValue(int cell, String value) {
        if (cell == 0) {
            stockCode = value;
        } else if (cell == 1) {
            stockName = value;
        } else if (cell == 2) {
            try {
                Float f = Float.parseFloat(value);
                stockCount = f.intValue();
            } catch (Exception e) {
                LogUtil.e(e, "StockId");
            }
        } else if (cell == 4) {
            try {
                stockCostPrice = Double.parseDouble(value);
            } catch (Exception e) {
                LogUtil.e(e, "StockId");
            }
        }
    }

    @Override
    public String toString() {
        return stockCode + "," + stockName + "," + stockCount + "," + stockCostPrice;
    }
}
