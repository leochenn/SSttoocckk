package com.leo.stock;

import android.app.Application;
import android.content.Context;

import com.leo.stock.Bean.LocalBean;
import com.leo.stock.biz.OnStockInfoUpdate;

/**
 * Created by Leo on 2019/12/23.
 */
public class App extends Application {

    private static App instance;

    private OnStockInfoUpdate notifyAction;

    @Override
    public void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        instance = this;
    }

    @Override
    public void onCreate() {
        super.onCreate();
    }

    public void register(OnStockInfoUpdate action) {
        this.notifyAction = action;
    }

    public void onStockUpdate(int operator, LocalBean code) {
        if (notifyAction != null) {
            notifyAction.update(operator, code);
            notifyAction = null;
        }
    }

    public void removeRegister() {
        notifyAction = null;
    }

    public static App getInstance() {
        return instance;
    }
}
