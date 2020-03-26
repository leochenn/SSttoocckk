package com.leo.stock.module.service;

/**
 * Created by Leo on 2020/3/25.
 */
public class Settings {

    // 刷新间隔
    public static int getRefreshInterval() {
        return 3 * 1000;
    }

    public static boolean isEmailAlarmEnable() {
        return true;
    }

    public static boolean isNotifyAlarmEnable() {
        return true;
    }

    public static boolean isSoundAlarmEnable() {
        return true;
    }

    public static int soundAlarmCount() {
        return 3;
    }

    public static float getPriceHighAlarmInterval() {
        return 3;
    }

    public static float getPriceLowAlarmInterval() {
        return 3;
    }
}
