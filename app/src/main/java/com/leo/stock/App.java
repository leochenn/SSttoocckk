package com.leo.stock;

import android.app.Application;
import android.content.Context;

/**
 * Created by Leo on 2019/12/23.
 */
public class App extends Application {

    private static App instance;

    @Override
    public void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        instance = this;
    }

    @Override
    public void onCreate() {
        super.onCreate();
    }

    public static App getInstance() {
        return instance;
    }
}
