package com.leo.stock.module.monitor;

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
    }

    public void clear() {
        monitorBeanHashMap.clear();
    }

    public void add(List<String> list) {
        for (String stock : list) {
            add(stock);
        }
    }

    public void addStockId(List<StockId> list) {
        for (StockId stock : list) {
            add(new MonitorBean(stock));
        }
    }

    public void add(MonitorBean monitorBean) {
        if (!monitorBeanHashMap.containsKey(monitorBean.code)) {
            monitorBeanHashMap.put(monitorBean.code, monitorBean);
        } else {
//            monitorBeanHashMap.put(monitorBean.code, monitorBean);
        }
    }

    public void add(String stock) {
        add(new MonitorBean(stock));
    }

    public Collection<MonitorBean> getCollection() {
        return monitorBeanHashMap.values();
    }

    public MonitorBean getMonitorBean(String code) {
        return monitorBeanHashMap.get(getNumber(code));
    }

    public void deleteBean(String code) {
        if (monitorBeanHashMap.containsKey(code)) {
            monitorBeanHashMap.remove(code);
        }
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
