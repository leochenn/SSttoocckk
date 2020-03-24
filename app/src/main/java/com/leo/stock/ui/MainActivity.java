package com.leo.stock.ui;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;

import com.leo.stock.R;
import com.leo.stock.module.service.BgService;

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

        if (BgService.isRunning()) {
            btnService.setText("停止服务");
        } else {
            btnService.setText("启动服务");
        }

        btnService.setOnClickListener(this);
    }

    @Override
    public void onClick(View v) {
        if (v == btnCalculate) {
            Intent intent = new Intent(this, CalculateActivity.class);
            startActivity(intent);
        }

        if (v == btnService) {
            Intent intent = new Intent(this, BgService.class);
            if (BgService.isRunning()) {
                stopService(intent);
                btnService.setText("启动服务");
            } else {
                startService(intent);
                btnService.setText("停止服务");
            }
        }
    }
}
