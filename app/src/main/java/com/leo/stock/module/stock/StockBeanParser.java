package com.leo.stock.module.stock;

import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.library.util.FloatUtil;
import com.leo.stock.library.util.LogUtil;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by Leo on 2019/12/23.
 */
public class StockBeanParser {

    public static SinaStockBean parse2(String data) {
        SinaStockBean stockBean = parseOne(data);
        return stockBean;
    }

    public static List<SinaStockBean> parse(String data) {
        data = data.replaceAll("\n", "");
        String[] stocks = data.split(";");


        List<SinaStockBean> list = new ArrayList<>();

        for (String stock : stocks) {
            SinaStockBean stockBean = parseOne(stock);
            list.add(stockBean);
        }
        return list;
    }

    private static SinaStockBean parseOne(String value) {
        String[] leftRight = value.split("=");
        if (leftRight.length < 2) {
            return null;
        }

        String left = leftRight[0];
        if (left.isEmpty()) {
            return null;
        }

        SinaStockBean stockBean = new SinaStockBean();

        String[] var = left.split("_");
        if (var.length == 3) {
            stockBean.stockId = var[2].trim();
        } else if (var.length == 4) {
            stockBean.stockId = var[3].trim();
            stockBean.simple = true;
        }

        String right = leftRight[1].replaceAll("\"", "");
        if (!right.isEmpty()) {
            String[] values = right.split(",");
            parse(stockBean, values);
        }

        return stockBean;
    }

    private static void parse(SinaStockBean stockBean, String[] values) {
        if (values.length == 6) {
            stockBean.stockName = values[0];
            stockBean.todayCurrentPrice = FloatUtil.handleFloatString(values[1]);
            stockBean.priceChange = FloatUtil.handleFloatString(values[2]);
            stockBean.priceChangePercent = FloatUtil.handleFloatString(values[3]);
            stockBean.amount = Long.valueOf(values[4]) * 100;
            stockBean.turnover = Long.valueOf(values[5]) * 10000;
        } else if (values.length > 6) {
            stockBean.stockName = values[0];
            stockBean.todayOpenPrice = FloatUtil.handleFloatString(values[1]);
            stockBean.lastClosePrice = FloatUtil.handleFloatString(values[2]);
            stockBean.todayCurrentPrice = FloatUtil.handleFloatString(values[3]);
            stockBean.highestPrice = FloatUtil.handleFloatString(values[4]);
            stockBean.lowestPrice = FloatUtil.handleFloatString(values[5]);
            stockBean.competitionBuyPrice = FloatUtil.handleFloatString(values[6]);
            stockBean.competitionSellPrice = FloatUtil.handleFloatString(values[7]);
            stockBean.amount = Long.parseLong(values[8]);

            String strTurnOver = values[9].replace(".000", "");
            try {
                stockBean.turnover = Double.parseDouble(strTurnOver);
            } catch (Exception e) {
                LogUtil.e(e, "turnover", strTurnOver);
            }

            stockBean.buyCount1 = Long.parseLong(values[10]);
            stockBean.buyPrice1 = FloatUtil.handleFloatString(values[11]);
            stockBean.buyCount2 = Long.parseLong(values[12]);
            stockBean.buyPrice2 = FloatUtil.handleFloatString(values[13]);
            stockBean.buyCount3 = Long.parseLong(values[14]);
            stockBean.buyPrice3 = FloatUtil.handleFloatString(values[15]);
            stockBean.buyCount4 = Long.parseLong(values[16]);
            stockBean.buyPrice4 = FloatUtil.handleFloatString(values[17]);
            stockBean.buyCount5 = Long.parseLong(values[18]);
            stockBean.buyPrice5 = FloatUtil.handleFloatString(values[19]);
            stockBean.sellCount1 = Long.parseLong(values[20]);
            stockBean.sellPrice1 = FloatUtil.handleFloatString(values[21]);
            stockBean.sellCount2 = Long.parseLong(values[22]);
            stockBean.sellPrice2 = FloatUtil.handleFloatString(values[23]);
            stockBean.sellCount3 = Long.parseLong(values[24]);
            stockBean.sellPrice3 = FloatUtil.handleFloatString(values[25]);
            stockBean.sellCount4 = Long.parseLong(values[26]);
            stockBean.sellPrice4 = FloatUtil.handleFloatString(values[27]);
            stockBean.sellCount5 = Long.parseLong(values[28]);
            stockBean.sellPrice5 = FloatUtil.handleFloatString(values[29]);
            stockBean.date = values[30];
            stockBean.time = values[31];

            stockBean.priceChange =
                    FloatUtil.handleFloatString(stockBean.todayCurrentPrice - stockBean.lastClosePrice);
            stockBean.priceChangePercent =
                    FloatUtil.handleFloatString(100 * stockBean.priceChange / stockBean.lastClosePrice);
        }
    }
}
