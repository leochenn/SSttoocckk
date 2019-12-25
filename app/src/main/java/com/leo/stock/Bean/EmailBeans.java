package com.leo.stock.Bean;

import android.text.TextUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by Leo on 2019/12/24.
 */
public class EmailBeans {

    public static final int HIGH = 1;
    public static final int LOW = -1;

    List<EmailBean> list;

    public String personal, subject, content, email;

    public void add(int state, LocalBean localBean, SinaStockBean sinaStockBean) {
        if (list == null) {
            list = new ArrayList<>();
        }

        EmailBean emailBean = new EmailBean();
        emailBean.state = state;
        emailBean.localBean = localBean;
        emailBean.sinaStockBean = sinaStockBean;
        list.add(emailBean);
    }

    public void handle() {
        for (EmailBean bean : list) {
            LocalBean localBean = bean.localBean;
            SinaStockBean sinaStockBean = bean.sinaStockBean;

            email = localBean.email1;

            if (!TextUtils.isEmpty(personal)) {
                personal += ">";
            } else {
                personal = bean.getState1();
            }

            if (!TextUtils.isEmpty(subject)) {
                subject += ",";
            } else {
                subject = "LLeo";
            }
            subject += sinaStockBean.stockName + ":" + sinaStockBean.todayCurrentPrice + " " + bean.getState2();

            if (TextUtils.isEmpty(content)) {
                content = "";
            } else {
                content += "/n";
            }
            content += sinaStockBean.stockName + " 开盘:" + sinaStockBean.todayOpenPrice + ",昨收:" + sinaStockBean.lastClosePrice + "  " + bean.getState2();
        }
    }
}
