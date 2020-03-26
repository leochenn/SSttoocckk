package com.leo.stock.Bean;

/**
 * Created by Leo on 2019/12/21.
 */
public class SinaSimpleStockBean {
    // 已经使用SinaStockBean做了兼容,不需要使用该类
    // var hq_str_s_sh110045="海澜转债,103.230,0.470,0.46,1436,1482";
    // 名称， 价格， 涨跌数， 涨跌幅度， 成交量， 成交额

    public String id;

    // 股票名称
    public String stockName;

    public float price;

    // 涨跌数
    public float priceChange;

    // 涨跌幅度
    public float priceChangePercent;

    // 成交量
    public float amount;

    // 成交额
    public double turnover;

}
