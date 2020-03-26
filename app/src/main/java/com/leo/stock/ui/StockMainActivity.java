package com.leo.stock.ui;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.DialogInterface;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.R;
import com.leo.stock.biz.StockMainBiz;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.monitor.Monitor;
import com.leo.stock.module.music.Player;
import com.leo.stock.module.notify.NotifycationHelper;
import com.leo.stock.ui.adpter.ListViewAdapter;
import com.leo.stock.ui.widget.CustomHScrollView;

import java.util.List;

public class StockMainActivity extends Activity {
    private static final String TAG = "StockMainActivity";

    private RelativeLayout mHead;//标题头
    private ListView mListView;
    private ListViewAdapter mAdapter;
    private CustomHScrollView mScrollView;

    private TextView tvCurrentTime, tvLastTime;
    private CheckBox checkBoxRing, checkBoxEmail;

    private EditText editFrequecy;
    private Button btnStartMonitor;
    ProgressDialog progressBar;

    private StockMainBiz stockMainBiz;
    private Monitor monitor;

    private Player player;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_stock);
        initView();
        startLoad();
        NotifycationHelper.lauch(this.getApplicationContext());
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (monitor != null) {
            monitor.stop();
        }
    }

    private void initView() {
        checkBoxRing = findViewById(R.id.checkbox_ring);
        checkBoxEmail = findViewById(R.id.checkbox_email);
        mListView = findViewById(R.id.list_view);
        mScrollView = findViewById(R.id.h_scrollView);
        mHead = findViewById(R.id.head_layout);
        mHead.setBackgroundResource(R.color.colorAccent);
        mHead.setFocusable(true);
        mHead.setClickable(true);
        mHead.setOnTouchListener(new MyTouchLinstener());
        mListView.setOnTouchListener(new MyTouchLinstener());

        btnStartMonitor = findViewById(R.id.btn_monitor);
        tvCurrentTime = findViewById(R.id.tv_currentTime);
        tvLastTime = findViewById(R.id.tv_lastTime);

        editFrequecy = findViewById(R.id.edit_frequency);
        editFrequecy.clearFocus();
        btnStartMonitor.requestFocus();
    }

    public void onItemClick(int position) {
        stockMainBiz.updateStock(position);
    }


    public void refresh(View view) {
        stockMainBiz.loadSinalStockBeans();
    }

    public void addStock(View view) {
        stockMainBiz.addNewStock();
    }

    public void startMonitor(View view) {
        if (monitor == null) {
            monitor = new Monitor(this, stockMainBiz);
        }

        if (monitor.isRunning()) {
            btnStartMonitor.setText("启动监听");
            editFrequecy.setEnabled(true);
            monitor.stop();
        } else {
            long frequency = Long.parseLong(editFrequecy.getText().toString().trim());
            if (frequency < 1) {
                frequency = 60L;
                editFrequecy.setText(60 + "");
            }

            if (stockMainBiz.canStartMonitor()) {
                monitor.start(0, frequency);
                btnStartMonitor.setText("停止监听");
                editFrequecy.setEnabled(false);
                return;
            } else {
                btnStartMonitor.setText("启动监听");
                editFrequecy.setEnabled(true);
            }
        }
    }

    public void showProgress() {
        if (isFinishing()) {
            LogUtil.e(TAG, "Activity finished");
            return;
        }

        if (progressBar == null) {
            progressBar = new ProgressDialog(this);
        }
        try {
            progressBar.show();
        } catch (Exception e) {
            LogUtil.e(e, TAG, "showProgress");
            progressBar = null;
        }
    }

    public void dismissProgress() {
        if (progressBar != null && progressBar.isShowing()) {
            progressBar.dismiss();
            progressBar = null;
        }
    }

    public void startLoad() {
        LogUtil.d(TAG, "startLoad");
        if (stockMainBiz == null) {
            stockMainBiz = new StockMainBiz(this);
        }
        stockMainBiz.loadLocalBeans();
    }

    public void onSinaStockBeanLoaded(List<SinaStockBean> sinaStockBeans) {
        LogUtil.d(TAG, "onSinaStockBeanLoaded", sinaStockBeans);
        tvLastTime.setText(tvCurrentTime.getText());
        if (mAdapter == null) {
            mAdapter = new ListViewAdapter(this, sinaStockBeans, mHead);
            mListView.setAdapter(mAdapter);
        } else {
            mAdapter.updateData(sinaStockBeans);
        }

        checkMonitor();
    }

    private void checkMonitor() {
        if (monitor != null && monitor.isRunning()) {
            monitor.checkNotify();
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            new AlertDialog.Builder(this).setMessage("确认退出吗").setPositiveButton("确认", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    NotifycationHelper.cancel(StockMainActivity.this.getApplicationContext());
                    finish();
                }
            }).setNegativeButton("取消", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {

                }
            }).create().show();
        }
        return false;
    }

    public void invalidTime() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(StockMainActivity.this, "非法时间段", Toast.LENGTH_SHORT).show();
                btnStartMonitor.setText("启动监听");
                editFrequecy.setEnabled(true);
            }
        });
    }

    public void playRing(View view) {
        if (player == null) {
            player = new Player(this);
        }
        if (player.isPlaying()) {
            player.stop();
        } else {
            player.play();
        }
    }

    public void startByMonitor() {
        if (player == null) {
            player = new Player(this);
        }
        player.play();
    }

    public boolean canRing() {
        return checkBoxRing.isChecked();
    }

    public boolean canEmail() {
        return checkBoxEmail.isChecked();
    }

    class MyTouchLinstener implements View.OnTouchListener {

        @Override
        public boolean onTouch(View arg0, MotionEvent arg1) {
            //当在表头和listView控件上touch时，将事件分发给 ScrollView
            mScrollView.onTouchEvent(arg1);
            return false;
        }
    }
}
