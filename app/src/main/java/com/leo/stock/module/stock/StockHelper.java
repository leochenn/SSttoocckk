package com.leo.stock.module.stock;

import android.text.TextUtils;

import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.api.SinaService;
import com.leo.stock.library.base.IRequestListener;
import com.leo.stock.library.retrofit.RetrofitHelper;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.service.MonitorBean;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Created by Leo on 2019/12/21.
 */
public class StockHelper {

    // https://blog.csdn.net/simon803/article/details/7784682

//    查看日K线图： http://image.sinajs.cn/newchart/daily/n/sh601006.gif
//    分时线的查询： http://image.sinajs.cn/newchart/min/n/sh000001.gif
//    日K线查询： http://image.sinajs.cn/newchart/daily/n/sh000001.gif
//    周K线查询： http://image.sinajs.cn/newchart/weekly/n/sh000001.gif
//    月K线查询： http://image.sinajs.cn/newchart/monthly/n/sh000001.gif

    public static void getSimpleStockList(final List<MonitorBean> monitorBeanList, final IRequestListener<List<MonitorBean>> listener) {
        StringBuilder stringBuilder = new StringBuilder();

        for (MonitorBean params : monitorBeanList) {
            if (stringBuilder.length() == 0) {
                stringBuilder.append("list=");
            } else {
                stringBuilder.append(",");
            }
            if (Float.compare(0, params.todayOpenPrice) != 0 || Float.compare(0, params.yestodayPrice) != 0 ) {
                stringBuilder.append("s_" + params.getCode());
            } else {
                stringBuilder.append(params.getCode());
            }
        }

        SinaService sinaService = RetrofitHelper.create(SinaService.class);
        Call<String> call = sinaService.getStockList(stringBuilder.toString());
        call.enqueue(new Callback<String>() {
            @Override
            public void onResponse(Call<String> call, Response<String> response) {
                String sinaStockBean = response.body();
                List<SinaStockBean> list = StockBeanParser.parse(sinaStockBean);

                for (int index = 0; index < monitorBeanList.size(); index++) {
                    MonitorBean monitorBean = monitorBeanList.get(index);
                    monitorBean.setStockBean(list.get(index));
                }
                listener.success(monitorBeanList);
            }

            @Override
            public void onFailure(Call<String> call, Throwable t) {
                LogUtil.e(t, "getStock onFailure");
                listener.failed(0, t.getMessage());
            }
        });
    }

    public static void getStock(List<SinaRequestParam> sinaRequestParams, final IRequestListener<List<SinaStockBean>> listener) {
        StringBuilder stringBuilder = new StringBuilder();

        for (SinaRequestParam params : sinaRequestParams) {
            if (stringBuilder.length() == 0) {
                stringBuilder.append("list=");
            } else {
                stringBuilder.append(",");
            }
            stringBuilder.append(params.toString());
        }

        SinaService sinaService = RetrofitHelper.create(SinaService.class);
        Call<String> call = sinaService.getStockList(stringBuilder.toString());
        call.enqueue(new Callback<String>() {
            @Override
            public void onResponse(Call<String> call, Response<String> response) {
                String sinaStockBean = response.body();
                List<SinaStockBean>  list = StockBeanParser.parse(sinaStockBean);
                listener.success(list);
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

    public static void getSimple(String code, final IRequestListener<SinaStockBean> listener) {
        String param = "list=" + code;

        SinaService sinaService = RetrofitHelper.create(SinaService.class);
        Call<String> call = sinaService.getStockList(param);
        call.enqueue(new Callback<String>() {
            @Override
            public void onResponse(Call<String> call, Response<String> response) {
                String sinaStockBean = response.body();
//                LogUtil.d("getStock onResponse", sinaStockBean);
                SinaStockBean list = StockBeanParser.parse2(sinaStockBean);
                listener.success(list);
            }

            @Override
            public void onFailure(Call<String> call, Throwable t) {
                LogUtil.e("getStock onFailure", call);
                listener.failed(0, t.getMessage());
            }
        });
    }
}
