package com.leo.stock.biz;

import android.text.TextUtils;

import com.leo.stock.App;
import com.leo.stock.Bean.LocalBean;
import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.library.io.FileIO;
import com.leo.stock.library.util.FloatUtil;
import com.leo.stock.ui.StockDetailActivity;

/**
 * Created by Leo on 2019/12/23.
 */
public class StockDetailBiz {

    private static final String TAG = "StockDetailBiz";

    StockDetailActivity stockDetailActivity;
    String originCode, successCode;
    LocalBean localBean;

    public StockDetailBiz(StockDetailActivity stockDetailActivity, String originCode) {
        this.stockDetailActivity = stockDetailActivity;
        this.originCode = originCode;
    }

    public void load() {
        if (!isAddNew()) {
            localBean =  FileIO.read(stockDetailActivity, originCode);
            stockDetailActivity.loadFinshed(localBean);
        }
    }

    public boolean isAddNew() {
        return TextUtils.isEmpty(originCode);
    }

    public void saveOrUpdate(LocalBean localBean) {
        FileIO.save(stockDetailActivity, localBean);
        successCode = localBean.id;
        int operator = isAddNew() ? OnStockInfoUpdate.ADD : OnStockInfoUpdate.UPDATE;
        App.getInstance().onStockUpdate(operator, localBean);
        stockDetailActivity.finish();
    }

    public void removeRegister() {
        App.getInstance().removeRegister();
    }

    public void delete() {
        FileIO.delete(stockDetailActivity, originCode);
        App.getInstance().onStockUpdate(OnStockInfoUpdate.DELETE, localBean);
        stockDetailActivity.finish();
    }

    public String getString(SinaStockBean data) {
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append(data.stockName + ":" + data.todayCurrentPrice);

        stringBuilder.append("\n");
        stringBuilder.append("最低:" + data.lowestPrice + ",  最高:" + data.highestPrice + ", 昨收:" + data.lastClosePrice);

        float a = FloatUtil.handleFloatString(data.todayCurrentPrice * 1.0025f); // 涨0.25% 0.0025
        float b = FloatUtil.handleFloatString(data.todayCurrentPrice * 1.005f);  // 涨0.5% 0.005
        float c = FloatUtil.handleFloatString(data.todayCurrentPrice * 1.0075f); // 涨0.75% 0.0075
        float d = FloatUtil.handleFloatString(data.todayCurrentPrice * 1.01f);  // 涨1% 0.01

        stringBuilder.append("\n涨\n");
        stringBuilder.append("0.25%: " + a + ",   0.5%: " + b);
        stringBuilder.append("\n");
        stringBuilder.append("0.75%: " + c + ",     1%: " + d);

        float a1 = FloatUtil.handleFloatString(data.todayCurrentPrice * 0.9975f); // 跌0.25% 0.0025
        float b1 = FloatUtil.handleFloatString(data.todayCurrentPrice * 0.995f);  // 跌0.5% 0.005
        float c1 = FloatUtil.handleFloatString(data.todayCurrentPrice * 0.9925f); // 跌0.75% 0.0075
        float d1 = FloatUtil.handleFloatString(data.todayCurrentPrice * 0.99f);  // 跌1% 0.01

        stringBuilder.append("\n跌\n");
        stringBuilder.append("0.25%: " + a1 + ",   0.5%: " + b1);
        stringBuilder.append("\n");
        stringBuilder.append("0.75%: " + c1 + ",     1%: " + d1);

        return stringBuilder.toString();
    }
}
