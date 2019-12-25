package com.leo.stock.library.retrofit;

import com.leo.stock.library.http.OkHttpManager;

import retrofit2.Retrofit;

/**
 * Created by Leo on 2019/7/26.
 */
public class RetrofitHelper {

    public static final String BASE_URL = "http://hq.sinajs.cn/";

    private static Retrofit instance;

    private static Retrofit getRetrofit() {
        if (instance == null) {
            Retrofit.Builder builder = new Retrofit.Builder();
            builder.client(OkHttpManager.getOkHttpClient());
            builder.addConverterFactory(new StringConverterFactory2());
            builder.baseUrl(BASE_URL);

            instance = builder.build();
        }
        return instance;
    }

    public static <T> T create(final Class<T> service) {
        return getRetrofit().create(service);
    }
}
