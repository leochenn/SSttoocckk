package com.leo.stock.ui;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;

import com.leo.stock.R;
import com.leo.stock.module.ftp.FtpMgr;
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
                    if (BgService.isRunning()) {
                        btnService.setText("停止服务");
                    } else {
                        btnService.setText("启动服务");
                    }
                }
            }, 3000);
        }
    }

    public void goToNew(View view) {
    }

    public void goToOld(View view) {
        startActivity(new Intent(this, StockMainActivity.class));
    }

    public void goToSet(View view) {
        startActivity(new Intent(this, SettingActivity.class));
    }

    public void test(View view) {
//        FtpMgr.downloadFile("");
        FtpMgr.updateLoadFile("/data/data/com.chsdk.demo/files/CaoHuaSDK/Html/error.html");
    }
}
