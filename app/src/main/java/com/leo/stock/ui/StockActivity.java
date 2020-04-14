package com.leo.stock.ui;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;
import android.widget.ListView;
import android.widget.RelativeLayout;

import com.leo.stock.R;
import com.leo.stock.module.monitor.Settings;
import com.leo.stock.module.monitor.StockMonitorMgr;
import com.leo.stock.ui.widget.CustomHScrollView;

public class StockActivity extends Activity {
    private static final String TAG = "StockActivity";

    private RelativeLayout mHead;
    private ListView mListView;
    private StockIdAdapter mAdapter;
    private CustomHScrollView mScrollView;

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
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mAdapter == null) {
            mAdapter = new StockIdAdapter(this, mHead);
            mListView.setAdapter(mAdapter);
        } else {
            mAdapter.updateData();
            mAdapter.notifyDataSetChanged();
        }
        mListView.postDelayed(new Runnable() {
            @Override
            public void run() {
                StockMonitorMgr.getInstance().registerUpdate(runnable);
            }
        }, 500);
    }

    Runnable runnable = new Runnable() {
        @Override
        public void run() {
            mAdapter.updateData();
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
