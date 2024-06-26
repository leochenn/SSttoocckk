package com.leo.stock.module.stock;

import android.text.TextUtils;

import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.api.SinaService;
import com.leo.stock.library.base.IRequestListener;
import com.leo.stock.library.retrofit.RetrofitHelper;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.monitor.MonitorBean;
import com.leo.stock.module.monitor.MonitorBeans;
import com.leo.stock.module.monitor.StockMonitorMgr;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Created by Leo on 2019/12/21.
 * 执行业务网络请求类
 */
public class StockHelper {

    // https://blog.csdn.net/simon803/article/details/7784682

//    查看日K线图： http://image.sinajs.cn/newchart/daily/n/sh601006.gif
//    分时线的查询： http://image.sinajs.cn/newchart/min/n/sh000001.gif
//    日K线查询： http://image.sinajs.cn/newchart/daily/n/sh000001.gif
//    周K线查询： http://image.sinajs.cn/newchart/weekly/n/sh000001.gif
//    月K线查询： http://image.sinajs.cn/newchart/monthly/n/sh000001.gif

    public static void getTXSimpleStockList(final IRequestListener<List<MonitorBean>> listener) {
        StringBuilder stringBuilder = new StringBuilder();

        final MonitorBeans monitorBeans = StockMonitorMgr.getInstance().getMonitorBeans();

        for (MonitorBean params : monitorBeans.getCollection()) {
            if (stringBuilder.length() == 0) {
                stringBuilder.append("list=");
            } else {
                stringBuilder.append(",");
            }
            if (Float.compare(0, params.todayOpenPrice) != 0 || Float.compare(0, params.yestodayPrice) != 0 ) {
                stringBuilder.append("s_" + params.getHSCode());
            } else {
                stringBuilder.append(params.getHSCode());
            }
        }

        SinaService sinaService = RetrofitHelper.create(SinaService.class);
        Call<String> call = sinaService.getStockList(stringBuilder.toString());
        call.enqueue(new Callback<String>() {
            @Override
            public void onResponse(Call<String> call, Response<String> response) {
                String sinaStockBean = response.body();
                List<SinaStockBean> list = StockBeanParser.parse(sinaStockBean);

                if (list == null || list.isEmpty()) {
                    LogUtil.e("获取实时价格解析失败");
                    LogUtil.d("onResponse\n" + sinaStockBean + "\n");
                    listener.failed(0, "获取实时价格解析失败");
                    return;
                }

                if (list.size() != monitorBeans.getSize()) {
                    LogUtil.e("获取实时价格个数不等于代码个数");
                    LogUtil.d("onResponse\n" + sinaStockBean + "\n");
                    listener.failed(0, "获取实时价格个数异常");
                    return;
                }

                for (SinaStockBean bean : list) {
                    MonitorBean monitorBean = monitorBeans.getMonitorBean(bean.stockId);
                    monitorBean.setStockBean(bean);
                }
                listener.success(null);
            }

            @Override
            public void onFailure(Call<String> call, Throwable t) {
                LogUtil.e(t, "getStock onFailure");
                listener.failed(0, t.getMessage());
            }
        });
    }

    public static void getSimpleStockList(final IRequestListener<List<MonitorBean>> listener) {
        StringBuilder stringBuilder = new StringBuilder();

        final MonitorBeans monitorBeans = StockMonitorMgr.getInstance().getMonitorBeans();

        for (MonitorBean params : monitorBeans.getCollection()) {
            if (stringBuilder.length() == 0) {
                stringBuilder.append("list=");
            } else {
                stringBuilder.append(",");
            }
            if (Float.compare(0, params.todayOpenPrice) != 0 || Float.compare(0, params.yestodayPrice) != 0 ) {
                stringBuilder.append("s_" + params.getHSCode());
            } else {
                stringBuilder.append(params.getHSCode());
            }
        }

        SinaService sinaService = RetrofitHelper.create(SinaService.class);
        Call<String> call = sinaService.getStockList(stringBuilder.toString());
        call.enqueue(new Callback<String>() {
            @Override
            public void onResponse(Call<String> call, Response<String> response) {
                String sinaStockBean = response.body();
                List<SinaStockBean> list = StockBeanParser.parse(sinaStockBean);

                if (list.isEmpty()) {
                    LogUtil.e("获取实时价格解析失败");
                    LogUtil.d("onResponse\n" + sinaStockBean + "\n");
                    listener.failed(0, "获取实时价格解析失败");
                    return;
                }

                if (list.size() != monitorBeans.getSize()) {
                    LogUtil.e("获取实时价格个数不等于代码个数");
                    LogUtil.d("onResponse\n" + sinaStockBean + "\n");
                    listener.failed(0, "获取实时价格个数异常");
                    return;
                }

                for (SinaStockBean bean : list) {
                    MonitorBean monitorBean = monitorBeans.getMonitorBean(bean.stockId);
                    if (monitorBean != null) {
                        monitorBean.setStockBean(bean);
                    }
                }
                listener.success(null);
            }

            @Override
            public void onFailure(Call<String> call, Throwable t) {
                LogUtil.e(t, "getStock onFailure");
                listener.failed(0, t.getMessage());
            }
        });
    }

    public static void getSimple2(String code, final IRequestListener<SinaStockBean> listener) {
        String param = "list=sh" + code + ",sz" + code;

        SinaService sinaService = RetrofitHelper.create(SinaService.class);
        Call<String> call = sinaService.getStockList(param);
        call.enqueue(new Callback<String>() {
            @Override
            public void onResponse(Call<String> call, Response<String> response) {
                String sinaStockBean = response.body();
                SinaStockBean sinaStockBean1 = null;
                List<SinaStockBean> list = StockBeanParser.parse(sinaStockBean);
                for (SinaStockBean bean : list) {
                    if (!TextUtils.isEmpty(bean.stockName)) {
                        sinaStockBean1 = bean;
                        break;
                    }
                }
                listener.success(sinaStockBean1);
            }

            @Override
            public void onFailure(Call<String> call, Throwable t) {
                LogUtil.e("getStock onFailure", call);
                listener.failed(0, t.getMessage());
            }
        });
    }
}
