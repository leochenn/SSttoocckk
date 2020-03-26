package com.leo.stock.Bean;

/**
 * Created by Leo on 2019/12/21.
 */
public class SinaStockBean {

    // https://www.jianshu.com/p/108b8110a98c

    public boolean simple;

    // 0 股票代码
    public String stockId;

    // 1 股票名称
    public String stockName;

    // 2 今日开盘
    public float todayOpenPrice;

    // 3 昨日收盘
    public float lastClosePrice;

    // 4 现价
    public float todayCurrentPrice;

    // 5 最高价
    public float highestPrice;

    // 6 最低价
    public float lowestPrice;

    // 7 竞买价 = 买一价格
    public float competitionBuyPrice;

    // 8 竞卖价 = 卖一价格
    public float competitionSellPrice;

    // 9 成交量,由于股票交易以一百股为基本单位，所以在使用时，通常把该值除以一百
    public long amount;

    // 10 成交额,单位为“元”，为了一目了然，通常以“万元”为成交金额的单位，所以通常把该值除以一万
    public double turnover;

    // 11 买一数量,申请4695股，即47手
    public long buyCount1;

    // 12 买一报价
    public float buyPrice1;

    // 13 买二
    public long buyCount2;

    // 14
    public float buyPrice2;

    // 15
    public long buyCount3;

    // 16
    public float buyPrice3;

    // 17
    public long buyCount4;

    // 18
    public float buyPrice4;

    // 19
    public long buyCount5;

    // 20
    public float buyPrice5;

    // 21 卖一数量，申报3100股，即31手
    public long sellCount1;

    // 22 卖一报价
    public float sellPrice1;

    // 23
    public long sellCount2;

    // 24
    public float sellPrice2;

    // 25
    public long sellCount3;

    // 26
    public float sellPrice3;

    // 27
    public long sellCount4;

    // 28
    public float sellPrice4;

    // 29
    public long sellCount5;

    // 30
    public float sellPrice5;

    // 31 日期
    public String date;

    // 32 时间
    public String time;

    // 涨跌数
    public float priceChange;

    // 涨跌幅度
    public float priceChangePercent;

    @Override
    public String toString() {
        return "代码:" + stockId + ",名称:" + stockName + ",现价:" + todayCurrentPrice
                + ",涨跌额:" + priceChange + ",涨跌幅度:" + priceChangePercent + "%,成交量:"
                + amount + ",成交额:" + turnover + ",开盘价:" + todayOpenPrice + ",昨收:" + lastClosePrice
                + ",时间:" + time;
    }
}
