package com.leo.stock.module.service;

import android.content.Context;

/**
 * Created by Leo on 2020/3/25.
 */
public class Settings {

    public static String getFtpHost(Context context) {
        return SpUtil.getString(context, "edit_ftp_host", "172.16.163.5");
    }

    public static String getFtpUser(Context context) {
        return SpUtil.getString(context, "edit_ftp_user", "LeoFtp");
    }

    public static String getFtpPwd(Context context) {
        return SpUtil.getString(context, "edit_ftp_pwd", "654321");
    }

    public static int getAlarmInterval(Context context) {
        return SpUtil.getInt(context, "edit_alarm_interval", 30);
    }
    // 刷新间隔
    public static int getRefreshInterval(Context context) {
        return SpUtil.getInt(context, "edit_refresh", 10);
    }

    public static boolean isEmailAlarmEnable(Context context) {
        return SpUtil.getBoolean(context, "cb_email", true);
    }

    public static boolean isNotifyAlarmEnable(Context context) {
        return SpUtil.getBoolean(context, "cb_notify", true);
    }

    public static boolean isSoundAlarmEnable(Context context) {
        return SpUtil.getBoolean(context, "cb_sound", true);
    }

    public static int soundAlarmCount(Context context) {
        return SpUtil.getInt(context, "edit_soundcount", 3);
    }

    public static float getPriceHighAlarmInterval(Context context) {
        return SpUtil.getFloat(context, "edit_high", 3);
    }

    public static float getPriceLowAlarmInterval(Context context) {
        return SpUtil.getFloat(context, "edit_low", 3);
    }
}
