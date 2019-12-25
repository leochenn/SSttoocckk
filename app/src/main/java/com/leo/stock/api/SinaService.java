package com.leo.stock.api;

import com.leo.stock.Bean.SinaStockBean;

import retrofit2.Call;
import retrofit2.http.Field;
import retrofit2.http.FormUrlEncoded;
import retrofit2.http.GET;
import retrofit2.http.Path;
import retrofit2.http.Query;
import retrofit2.http.Url;

/**
 * Created by Leo on 2019/12/21.
 */
public interface SinaService {

    @GET
    Call<SinaStockBean> getList(@Url String list);

    @GET
    Call<String> getStockList(@Url String param);
}
