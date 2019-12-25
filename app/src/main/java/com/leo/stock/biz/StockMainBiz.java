package com.leo.stock.biz;

import android.widget.Toast;

import com.leo.stock.App;
import com.leo.stock.Bean.LocalBean;
import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.library.base.ExeOperator;
import com.leo.stock.library.base.IRequestListener;
import com.leo.stock.library.base.UIHandler;
import com.leo.stock.library.io.FileIO;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.monitor.Monitor;
import com.leo.stock.module.stock.SinaRequestParam;
import com.leo.stock.module.stock.StockHelper;
import com.leo.stock.ui.StockDetailActivity;
import com.leo.stock.ui.StockMainActivity;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by Leo on 2019/12/23.
 */
public class StockMainBiz implements OnStockInfoUpdate {

    private static final String TAG = "StockMainBiz";

    StockMainActivity stockMainActivity;

    List<LocalBean> localBeans;
    List<SinaStockBean> sinaStockBeans;

    long lastLoadSinaTime;

    public StockMainBiz(StockMainActivity stockMainActivity) {
        this.stockMainActivity = stockMainActivity;
    }

    /**
     *  加载本地存储的信息
     */
    public void loadLocalBeans() {
        stockMainActivity.showProgress();

        ExeOperator.runOnThread(new Runnable() {
            @Override
            public void run() {
                localBeans = FileIO.getFileList(stockMainActivity);

                UIHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        stockMainActivity.dismissProgress();
                        loadLocalBeansFinished();
                    }
                });
            }
        });
    }

    private void loadLocalBeansFinished() {
        LogUtil.d(TAG, "loadLocalBeansFinished", localBeans);
        if (localBeans == null || localBeans.size() == 0) {
            Toast.makeText(stockMainActivity, "本地无数据", Toast.LENGTH_SHORT).show();
            stockMainActivity.onSinaStockBeanLoaded(null);
        } else {
            loadSinalStockBeans();
        }
    }

    /**
     *  加载股票数据
     */
    public void loadSinalStockBeans() {
        if (localBeans == null) {
            return;
        }

        long currentTime = System.currentTimeMillis();
        if (currentTime > lastLoadSinaTime && currentTime - lastLoadSinaTime < 5000) {
            LogUtil.e(TAG, "加载时间间隔");
            return;
        }

        stockMainActivity.showProgress();
        lastLoadSinaTime = currentTime;

        List<SinaRequestParam> list = new ArrayList<>();

        for (LocalBean localBean : localBeans) {
            SinaRequestParam param = new SinaRequestParam();
            param.stockId = localBean.id;
            list.add(param);
        }

        LogUtil.d(TAG, "loadSinalStockBeans");

        StockHelper.getStock(list, new IRequestListener<List<SinaStockBean>>() {

            @Override
            public void success(List<SinaStockBean> data) {
                LogUtil.d(TAG, "loadSinalStockBeans success");
                stockMainActivity.dismissProgress();
                loadSinalStockBeansSuccess(data);
            }

            @Override
            public void failed(int code, String error) {
                stockMainActivity.dismissProgress();
                Toast.makeText(stockMainActivity, "请求新浪数据接口错误!" + error,
                        Toast.LENGTH_SHORT).show();
                stockMainActivity.onSinaStockBeanLoaded(null);
            }
        });
    }

    private void loadSinalStockBeansSuccess(List<SinaStockBean> data) {
        sinaStockBeans = data;
        stockMainActivity.onSinaStockBeanLoaded(sinaStockBeans);
    }

    public List<LocalBean> getLocalBeans() {
        return localBeans;
    }

    public List<SinaStockBean> getSinaStockBeans() {
        return sinaStockBeans;
    }

    public boolean canStartMonitor() {
        return localBeans == null ? false : localBeans.size() > 0;
    }

    public void addNewStock() {
        App.getInstance().register(this);

        StockDetailActivity.startByAdd(stockMainActivity);
    }

    public void updateStock(int index) {
        App.getInstance().register(this);

        String stockId = localBeans.get(index).id;
        StockDetailActivity.startByModify(stockMainActivity, stockId);
    }

    @Override
    public void update(int operator, LocalBean localBean) {
        if (localBean == null) {
            LogUtil.d(TAG, "详情界面返回，不需要操作");
            return;
        }

        stockMainActivity.startLoad();
    }
}
