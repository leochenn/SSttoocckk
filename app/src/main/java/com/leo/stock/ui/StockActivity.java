package com.leo.stock.ui;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;
import android.widget.ListView;
import android.widget.RelativeLayout;
import android.widget.TextView;

import com.leo.stock.R;
import com.leo.stock.module.monitor.MonitorBean;
import com.leo.stock.module.monitor.MonitorBeans;
import com.leo.stock.module.monitor.StockMonitorMgr;
import com.leo.stock.ui.widget.CustomHScrollView;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;

public class StockActivity extends Activity {
    private static final String TAG = "StockActivity";

    private RelativeLayout mHead;
    private ListView mListView;
    private StockIdAdapter mAdapter;
    private CustomHScrollView mScrollView;

    private TextView tvPrice, tvPercent;
    private int sortType;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_stock_new);
        initView();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }

    private void initView() {
        mListView = findViewById(R.id.list_view);
        mScrollView = findViewById(R.id.h_scrollView);
        mHead = findViewById(R.id.head_layout);
        mHead.setBackgroundResource(R.color.colorAccent);
        mHead.setFocusable(true);
        mHead.setClickable(true);
        mHead.setOnTouchListener(new MyTouchLinstener2());
        mListView.setOnTouchListener(new MyTouchLinstener());

        tvPrice = mHead.findViewById(R.id.tv_currentPrice);
        tvPrice.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                tvPercent.setText("涨跌幅");
                tvPercent.setTag(0);

                sortType = 1;
                int tag = (int) tvPrice.getTag();
                // 点击顺序 0 1 -1 0 1 -1 ↑↓
                if (tag == 0) {
                    tvPrice.setText("现价-降");
                    tvPrice.setTag(-1);
                } else if (tag == -1) {
                    tvPrice.setText("现价-升");
                    tvPrice.setTag(1);
                } else if (tag == 1) {
                    tvPrice.setText("现价");
                    tvPrice.setTag(0);
                }
                runnable.run();
            }
        });

        tvPrice.setText("现价-降");
        tvPrice.setTag(-1);
        sortType = 1;

        tvPercent = mHead.findViewById(R.id.tv_priceChangePercent);
        tvPercent.setTag(0);
        tvPercent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                tvPrice.setText("现价");
                tvPrice.setTag(0);

                int tag = (int) tvPercent.getTag();
                // 点击顺序 0 1 -1 0 1 -1 ↑↓
                sortType = 2;
                if (tag == 0) {
                    tvPercent.setText("涨跌幅-降");
                    tvPercent.setTag(-1);
                } else if (tag == -1) {
                    tvPercent.setText("涨跌幅-升");
                    tvPercent.setTag(1);
                } else if (tag == 1) {
                    tvPercent.setText("涨跌幅");
                    tvPercent.setTag(0);
                }
                runnable.run();
            }
        });
        mAdapter = new StockIdAdapter(this, mHead);
        mListView.setAdapter(mAdapter);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mAdapter.isDataEmpty()) {
            runnable.run();
        }
        StockMonitorMgr.getInstance().registerUpdate(runnable);
    }

    Runnable runnable = new Runnable() {
        @Override
        public void run() {
            ArrayList<MonitorBean> list = new ArrayList<>();
            MonitorBeans monitorBeans = StockMonitorMgr.getInstance().getMonitorBeans();
            if (monitorBeans != null) {
                list.addAll(monitorBeans.getCollection());
            }

            if (sortType != 0 && list.size() > 0) {
                final int priceTag = (int) tvPrice.getTag();
                final int percentTag = (int) tvPercent.getTag();
                if (sortType == 1 && priceTag != 0) {
                   //  股价排序
                    Collections.sort(list, new Comparator<MonitorBean>() {
                        @Override
                        public int compare(MonitorBean o1, MonitorBean o2) {
                            if (o1.currentPrice > o2.currentPrice) {
                                return priceTag > 0 ? 1 : -1;
                            } else if (o1.currentPrice < o2.currentPrice) {
                                return priceTag > 0 ? -1 : 1;
                            }
                            return 0;
                        }
                    });
                } else if (sortType == 2 && percentTag != 0) {
                    //  幅度排序
                    Collections.sort(list, new Comparator<MonitorBean>() {
                        @Override
                        public int compare(MonitorBean o1, MonitorBean o2) {
                            if (o1.getHLSpaceFloat() > o2.getHLSpaceFloat()) {
                                return percentTag > 0 ? 1 : -1;
                            } else if (o1.getHLSpaceFloat() < o2.getHLSpaceFloat()) {
                                return percentTag > 0 ? -1 : 1;
                            }
                            return 0;
                        }
                    });
                }
            }
            mAdapter.updateData(list);
            mAdapter.notifyDataSetChanged();
        }
    };

    @Override
    protected void onPause() {
        super.onPause();
        StockMonitorMgr.getInstance().unregisterUpdate(runnable);
    }

    public void addStock(View view) {
        Intent intent = new Intent(this, StockDetailActivity.class);
        this.startActivity(intent);
    }

    class MyTouchLinstener2 implements View.OnTouchListener {
        @Override
        public boolean onTouch(View arg0, MotionEvent event) {
            mScrollView.onTouchEvent(event);
            return false;
        }
    }

    class MyTouchLinstener implements View.OnTouchListener {

        @Override
        public boolean onTouch(View arg0, MotionEvent event) {
            mScrollView.onTouchEvent(event);
            return false;
        }
    }
}
