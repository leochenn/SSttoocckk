package com.leo.stock.module.monitor;

import android.content.Context;
import android.text.TextUtils;

import com.leo.stock.App;
import com.leo.stock.biz.IGetData;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.email.Config;
import com.leo.stock.module.ftp.FtpMgr;
import com.leo.stock.module.notify.NotifycationHelper;

import org.jetbrains.annotations.NotNull;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.internal.platform.OkHttpManager;

/**
 * Created by Leo on 2020/4/3.
 */
public class StockIdLoader {

    private static final String TAG = "StockIdLoader";

    private Context context;

    private MonitorBeans monitorBeans;

    public StockIdLoader(MonitorBeans monitorBeans) {
        context = App.getInstance().getApplicationContext();
        this.monitorBeans = monitorBeans;
    }

    public void startLoad() {
        IO.loadFromLocal(IO.getLocalFilePath(context), monitorBeans);
        LogUtil.d(TAG, "loadFromLocal", monitorBeans.getSize());

        for (MonitorBean bean : monitorBeans.getCollection()) {
            if (bean.lastAlarmTime != 0 && Float.compare(bean.lastAlarmPrice, 0) != 0) {
                Calendar nowCalendar = Calendar.getInstance();
                nowCalendar.setTimeInMillis(bean.lastAlarmTime);
                int month = nowCalendar.get(Calendar.MONTH);
                int day = nowCalendar.get(Calendar.DAY_OF_MONTH);

                Calendar nowCalendar2 = Calendar.getInstance();
                nowCalendar2.setTimeInMillis(System.currentTimeMillis());
                int month2 = nowCalendar2.get(Calendar.MONTH);
                int day2 = nowCalendar2.get(Calendar.DAY_OF_MONTH);

                if (month != month2 || day != day2) {
                    LogUtil.d(TAG, "上次警报时间重置", bean);
                    bean.lastAlarmTime = 0;
                    bean.lastAlarmPrice = 0f;
                }
            }
        }

        loadFromRemote();
//        loadFromFtp();
    }

    public void loadFromFtp() {
        FtpMgr.downloadFile("/stock/ids.txt", new IGetData<ArrayList<String>>() {
            @Override
            public void getData(ArrayList<String> strings) {
                if (strings == null || strings.size() == 0) {
                    LogUtil.e(TAG, "Ftp获取失败");
                    NotifycationHelper.sendMsg(context, "错误", "Ftp获取失败");
                    loadFromRemote();
                } else {
                    LogUtil.d(TAG, "Ftp代码数量:" + strings.size());
                    loadSuccess(strings);
                }
            }
        });
    }

    public void loadFromRemote() {
        Request request = new Request.Builder().get().url(Config.STOCK_ID_URL).build();
        OkHttpManager.getIntance().newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NotNull Call call, @NotNull IOException e) {
                LogUtil.e(e, TAG, "loadFromRemote");
                NotifycationHelper.sendMsg(context, "错误", "远程获取失败");

                if (monitorBeans.getSize() > 0) {
                    StockMonitorMgr.getInstance().loadStockIdSuccess();
                } else {
                    BgService.stopService(context);
                }
            }

            @Override
            public void onResponse(@NotNull Call call, @NotNull Response response) {
                List<String> beanList = new ArrayList<>();

                try {
                    BufferedReader reader =
                            new BufferedReader(new InputStreamReader(response.body().byteStream()));
                    String line;
                    while (!TextUtils.isEmpty(line = reader.readLine())) {
                        beanList.add(line);
                    }
                    response.body().byteStream().close();
                } catch (Exception e) {
                    LogUtil.e(e, TAG, "loadFromRemote");
                }

                if (beanList.isEmpty()) {
                    LogUtil.e(TAG, "远程获取为空");
                    NotifycationHelper.sendMsg(context, "错误", "远程获取为空");
                    if (monitorBeans.getSize() > 0) {
                        StockMonitorMgr.getInstance().loadStockIdSuccess();
                    } else {
                        BgService.stopService(context);
                    }
                } else {
                    LogUtil.d(TAG, "代码数量:" + beanList.size());
                    loadSuccess(beanList);
                }
            }
        });
    }

    private void loadSuccess(List<String> strings) {
        monitorBeans.add(strings);
        StockMonitorMgr.getInstance().addSZIndex();
        IO.saveToLocal(IO.getLocalFilePath(context), monitorBeans);
        StockMonitorMgr.getInstance().loadStockIdSuccess();
    }
}
