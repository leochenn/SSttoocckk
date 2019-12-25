package com.leo.stock.library.http;

import okhttp3.OkHttpClient;

/**
 * Created by Leo on 2019/7/26.
 */
public class OkHttpManager {

    public static OkHttpClient getOkHttpClient() {
        OkHttpClient okHttpClient = new OkHttpClient.Builder().build();
        return okHttpClient;
    }
}
