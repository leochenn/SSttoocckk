package com.leo.stock.biz;

import com.leo.stock.Bean.LocalBean;

/**
 * Created by Leo on 2019/12/23.
 */
public interface OnStockInfoUpdate {

    int ADD = 0;
    int UPDATE = 1;
    int DELETE = 2;

    void update(int operator, LocalBean localBean);
}
