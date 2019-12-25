package com.leo.stock.module.stock;

/**
 * Created by Leo on 2019/12/23.
 */
public class SinaRequestParam {

    public String stockId;
    public boolean simple;

    @Override
    public String toString() {
        return simple ? "s_" + stockId : stockId;
    }
}
