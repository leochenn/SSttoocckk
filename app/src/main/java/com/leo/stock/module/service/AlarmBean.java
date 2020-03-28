package com.leo.stock.module.service;

import android.text.TextUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Created by Leo on 2020/3/28.
 */
public class AlarmBean {

    List<MonitorBean> highBean, lowBean;
    MonitorBean szIndex;

    public String emailPersonal;
    public String emailSubject;
    public String emailContent;

    public String highString;
    public String lowString;

    public AlarmBean() {

    }

    public void addSzIndexBean(MonitorBean bean) {
        szIndex = bean;
    }

    public void addBean(boolean high, MonitorBean bean) {
        if (high) {
            if (highBean == null) {
                highBean = new ArrayList<>();
            }
            highBean.add(bean);
        } else {
            if (lowBean == null) {
                lowBean = new ArrayList<>();
            }
            lowBean.add(bean);
        }
    }

    private void setEmailContent(MonitorBean bean) {
        if (TextUtils.isEmpty(emailContent)) {
            emailContent = "";
        } else {
            emailContent += "\n";
        }
        emailContent += bean.name + ", " + bean.getHLSpace() + " , " + bean.currentPrice + " ,昨:" + bean.yestodayPrice + ",开:" + bean.todayOpenPrice;
        emailContent = emailContent.replaceAll("转债", "");
    }

    public boolean handle() {
        int highCount = 0, lowCount = 0;
        if (highBean != null) {
            highCount = highBean.size();
            Collections.sort(highBean);
            for (MonitorBean bean : highBean) {
                if (!TextUtils.isEmpty(highString)) {
                    highString += ",";
                } else {
                    highString = "";
                }
                highString += bean.name + "(" + bean.getHLSpace() + ")";
                highString = highString.replaceAll("转债", "");
                setEmailContent(bean);
            }
        }
        if (lowBean != null) {
            lowCount = lowBean.size();
            Collections.sort(lowBean);
            if (!TextUtils.isEmpty(emailContent)) {
                emailContent += "\n";
            }
            for (MonitorBean bean : lowBean) {
                if (!TextUtils.isEmpty(lowString)) {
                    lowString += ",";
                } else {
                    lowString = "";
                }
                lowString += bean.name + "(" + bean.getHLSpace() + ")";
                lowString = lowString.replaceAll("转债", "");
                setEmailContent(bean);
            }
        }

        boolean alarm = !TextUtils.isEmpty(highString) || !TextUtils.isEmpty(lowString);
        if (alarm) {
            if (TextUtils.isEmpty(highString)) {
                // 只有低价提醒
                emailSubject = lowString;
            } else if (TextUtils.isEmpty(lowString)) {
                // 只有高价提醒
                emailSubject = highString;
            } else if (highString.length() > lowString.length()) {
                // 高价提醒长度 > 低价提醒长度
                emailSubject = lowString;
                emailContent = highString + "!!!\n\n" + emailContent;
            } else {
                // 低价提醒长度 > 高价提醒长度
                emailSubject = highString;
                emailContent = lowString + "!!!\n\n" + emailContent;
            }

            emailPersonal = "上证" + szIndex.currentPrice + "," + szIndex.getHLSpace();
            if (lowCount > 0) {
                emailPersonal += "跌" + lowCount;
            }
            if (highCount > 0) {
                emailPersonal += "涨" + highCount;
            }
        }
        return alarm;
    }

    public String getEmailPersonal() {
        return emailPersonal;
    }

    @Override
    public String toString() {
        return "emailPersonal:\n" + getEmailPersonal() + ",\nemailSubject:\n" + emailSubject +
                ",\nemailContent:\n" + emailContent;
    }
}
