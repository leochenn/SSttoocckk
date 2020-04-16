package com.leo.stock.ui;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;

import com.leo.stock.R;
import com.leo.stock.module.monitor.BgService;
import com.leo.stock.module.monitor.StockMonitorMgr;

/**
 * Created by Leo on 2020/3/24.
 */
public class MainActivity extends Activity implements View.OnClickListener {

    Button btnService, btnCalculate;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        btnCalculate = findViewById(R.id.btn_calculate);
        btnCalculate.setOnClickListener(this);

        btnService = findViewById(R.id.btn_start);
        btnService.setOnClickListener(this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        setBtnServiceState();
    }

    private void setBtnServiceState() {
        if (BgService.isRunning()) {
            btnService.setText("停止服务");
        } else {
            btnService.setText("启动服务");
        }
    }

    @Override
    public void onClick(View v) {
        if (v == btnCalculate) {
            Intent intent = new Intent(this, CalculateActivity.class);
            startActivity(intent);
        }

        if (v == btnService) {
            btnService.setEnabled(false);
            if (BgService.isRunning()) {
                BgService.stopService(this);
            } else {
                BgService.startService(this);
            }

            btnService.postDelayed(new Runnable() {
                @Override
                public void run() {
                    btnService.setEnabled(true);
                    setBtnServiceState();
                }
            }, 1500);
        }
    }

    public void goToNew(View view) {
        startActivity(new Intent(this, StockActivity.class));
    }

    public void goToSet(View view) {
        startActivity(new Intent(this, SettingActivity.class));
    }

    public void gather(View view) {
        StockMonitorMgr.getInstance().gather();
    }
}
