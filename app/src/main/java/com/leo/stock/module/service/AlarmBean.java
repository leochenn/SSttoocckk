package com.leo.stock.module.service;

import android.text.TextUtils;

import com.leo.stock.library.util.FloatUtil;

/**
 * Created by Leo on 2020/3/26.
 */
public class AlarmBean {

    // 微信邮件提示会显示在最首行，网页邮箱不显示
    // 显示 上证指数 点数 涨幅 + 高价数量 低价数量
    public String emailPersonal;
    // 邮件正文内容
    public String emailContent;
    // 网页邮件显示在标题
    public String emailSubject;

    public String notifyTitle;
    public String notifyContent;

    public int highCount, lowCount;

    public void set(boolean high, MonitorBean bean) {
        if (high) {
            highCount++;
        } else {
            lowCount++;
        }

        if (!TextUtils.isEmpty(emailSubject)) {
            emailSubject += ",";
        } else {
            emailSubject = "";
        }
        emailSubject += bean.name + bean.getHLSpace();
        emailSubject = emailSubject.replaceAll("转债", "");

        if (TextUtils.isEmpty(emailContent)) {
            emailContent = "";
        } else {
            emailContent += "\n";
        }

        emailContent += bean.name + bean.getHLSpace() + "_" + bean.currentPrice + ",昨:" + bean.yestodayPrice + ",开:" + bean.todayOpenPrice;
        emailContent = emailContent.replaceAll("转债", "");
    }

    public String getEmailPersonal() {
        if (highCount > 0) {
            emailPersonal ="高价:" + highCount;
        }
        if (lowCount > 0 ) {
            if (!TextUtils.isEmpty(emailPersonal)) {
                emailPersonal += ",低价:" + lowCount;
            } else {
                emailPersonal = "低价:" + lowCount;
            }
        }
        return emailPersonal;
    }

    public boolean available() {
        return !TextUtils.isEmpty(emailContent);
    }

    @Override
    public String toString() {
        return "emailPersonal:\n" + emailPersonal + ",\nemailSubject:\n" + emailSubject +
                ",\nemailContent:\n" + emailContent;
    }
}
