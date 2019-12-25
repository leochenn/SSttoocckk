package com.leo.stock.module.stock;

import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.api.SinaService;
import com.leo.stock.library.base.IRequestListener;
import com.leo.stock.library.retrofit.RetrofitHelper;
import com.leo.stock.library.util.LogUtil;

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
//                LogUtil.d("getStock onResponse", sinaStockBean);
                List<SinaStockBean>  list = StockBeanParser.parse(sinaStockBean);
                listener.success(list);
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
                SinaStockBean list = StockBeanParser.parseSimple(sinaStockBean);
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
