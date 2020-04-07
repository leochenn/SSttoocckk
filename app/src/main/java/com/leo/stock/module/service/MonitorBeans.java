package com.leo.stock.module.service;

import java.util.Collection;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Created by Leo on 2020/4/3.
 */
public class MonitorBeans {

    private ConcurrentHashMap<String, MonitorBean> monitorBeanHashMap;

    public MonitorBeans() {
        monitorBeanHashMap = new ConcurrentHashMap<>();
        add("000001");
    }

    public void add(List<String> list) {
        for (String stock : list) {
            add(stock);
        }
    }

    public void add(MonitorBean monitorBean) {
        if (!monitorBeanHashMap.containsKey(monitorBean.code)) {
            monitorBeanHashMap.put(monitorBean.code, monitorBean);
        } else {
            monitorBeanHashMap.put(monitorBean.code, monitorBean);
        }
    }

    public void add(String stock) {
        if (!monitorBeanHashMap.containsKey(stock)) {
            monitorBeanHashMap.put(stock, new MonitorBean(stock));
        }
    }

    public Collection<MonitorBean> getCollection() {
        return monitorBeanHashMap.values();
    }

    public MonitorBean getMonitorBean(String code) {
        return monitorBeanHashMap.get(getNumber(code));
    }

    public int getSize() {
        return monitorBeanHashMap.size();
    }

    public static String getNumber(String value) {
        String str2 = "";
        for (int i = 0; i < value.length(); i++) {
            if (value.charAt(i) >= 48 && value.charAt(i) <= 57) {
                str2 += value.charAt(i);
            }
        }
        return str2;
    }
}
