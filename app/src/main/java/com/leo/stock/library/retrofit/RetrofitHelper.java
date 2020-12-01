package com.leo.stock.library.retrofit;

import okhttp3.internal.platform.OkHttpManager;

import retrofit2.Retrofit;

/**
 * Created by Leo on 2019/7/26.
 */
public class RetrofitHelper {

    public static final String BASE_URL = "http://hq.sinajs.cn/";

    /**
     * http://qt.gtimg.cn/q=sz000858
     * v_sz000858="51~五 粮 液~000858~27.78~27.60~27.70~417909~190109~227800~27.78~492~27.77~332~27.76~202~27.75~334~27.74~291~27.79~305~27.80~570~27.81~269~27.82~448~27.83~127~15:00:13/27.78/4365/S/12124331/24602|14:56:55/27.80/14/S/38932/24395|14:56:52/27.81/116/B/322585/24392|14:56:49/27.80/131/S/364220/24385|14:56:46/27.81/5/B/13905/24381|14:56:43/27.80/31/B/86199/24375~20121221150355~0.18~0.65~28.11~27.55~27.80/413544/1151265041~417909~116339~1.10~10.14~~28.11~27.55~2.03~1054.39~1054.52~3.64~30.36~24.84~";
     * 0: 未知
     *  1: 名字
     *  2: 代码
     *  3: 当前价格
     *  4: 昨收
     *  5: 今开
     *  6: 成交量（手）
     *  7: 外盘
     *  8: 内盘
     *  9: 买一
     * 10: 买一量（手）
     * 11-18: 买二 买五
     * 19: 卖一
     * 20: 卖一量
     * 21-28: 卖二 卖五
     * 29: 最近逐笔成交
     * 30: 时间
     * 31: 涨跌
     * 32: 涨跌%
     * 33: 最高
     * 34: 最低
     * 35: 价格/成交量（手）/成交额
     * 36: 成交量（手）
     * 37: 成交额（万）
     * 38: 换手率
     * 39: 市盈率
     * 40:
     * 41: 最高
     * 42: 最低
     * 43: 振幅
     * 44: 流通市值
     * 45: 总市值
     * 46: 市净率
     * 47: 涨停价
     * 48: 跌停价
     *
     * http://qt.gtimg.cn/q=s_sz000858
     * v_s_sz000858="51~五 粮 液~000858~27.78~0.18~0.65~417909~116339~~1054.52";
     *  0: 未知
     *  1: 名字
     *  2: 代码
     *  3: 当前价格
     *  4: 涨跌
     *  5: 涨跌%
     *  6: 成交量（手）
     *  7: 成交额（万）
     *  8:
     *  9: 总市值
     */
    public static final String BASE_URL2 = "http://qt.gtimg.cn/";


    private static Retrofit instance, instance2;

    private static Retrofit getRetrofit() {
        if (instance == null) {
            Retrofit.Builder builder = new Retrofit.Builder();
            builder.client(OkHttpManager.getIntance());
            builder.addConverterFactory(new StringConverterFactory2());
            builder.baseUrl(BASE_URL);

            instance = builder.build();
        }
        return instance;
    }

    private static Retrofit getRetrofit2() {
        if (instance == null) {
            Retrofit.Builder builder = new Retrofit.Builder();
            builder.client(OkHttpManager.getIntance());
            builder.addConverterFactory(new StringConverterFactory2());
            builder.baseUrl(BASE_URL2);

            instance = builder.build();
        }
        return instance;
    }

    public static <T> T create(final Class<T> service) {
        return getRetrofit().create(service);
    }

    public static <T> T create2(final Class<T> service) {
        return getRetrofit2().create(service);
    }
}
