package com.leo.stock.module.email;

import com.leo.stock.BuildConfig;

/**
 * Created by Leo on 2019/12/21.
 */
public class Config {

    public static final String SMTP_HOST = "smtp.qq.com";
    public static final String SEND_ADDRESS = BuildConfig.SEND_ADDRESS;
    public static final String RECIEVE_ADDRESS = SEND_ADDRESS;
    public static final String AUTH_CODE = BuildConfig.AUTH_CODE;
    public static final String STOCK_ID_URL = BuildConfig.STOCK_ID_URL;
}
