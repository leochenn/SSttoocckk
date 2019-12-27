package com.leo.stock.Bean;

/**
 * Created by Leo on 2019/12/24.
 */
public class EmailBean {
    int state;
    LocalBean localBean;
    SinaStockBean sinaStockBean;

    public String getState1() {
        return state == EmailBeans.HIGH ? "高价预警" : "低价预警";
    }

    public String getState2() {
        return state == EmailBeans.HIGH ? "H" : "L";
    }
}
