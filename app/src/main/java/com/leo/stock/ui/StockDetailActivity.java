package com.leo.stock.ui;

import android.app.Activity;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import com.leo.stock.R;
import com.leo.stock.library.util.FloatUtil;
import com.leo.stock.module.monitor.IO;
import com.leo.stock.module.monitor.MonitorBean;
import com.leo.stock.module.monitor.MonitorBeans;
import com.leo.stock.module.monitor.StockMonitorMgr;

public class StockDetailActivity extends Activity {

    private Button btnDelete;
    private EditText editCode, editLow, editHigh, editLowP, editHighP, editName;

    boolean isAddMode;
    MonitorBean monitorBean;
    MonitorBeans monitorBeans;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_stock_detail_new);

        btnDelete = findViewById(R.id.btn_delete);

        editCode = findViewById(R.id.edit_code);
        editName = findViewById(R.id.edit_name);
        editLow = findViewById(R.id.edit_low);
        editHigh = findViewById(R.id.edit_high);
        editLowP = findViewById(R.id.edit_low_p);
        editHighP = findViewById(R.id.edit_high_p);

        String originCode = getIntent().getStringExtra("code");
        isAddMode = TextUtils.isEmpty(originCode);
        String name = getIntent().getStringExtra("name");

        monitorBeans = StockMonitorMgr.getInstance().getMonitorBeans();

        if (isAddMode) {
            btnDelete.setEnabled(false);
        } else {
            editCode.setText(originCode);
            editName.setText(name);
            editCode.setEnabled(false);
            editName.setEnabled(false);
            btnDelete.setEnabled(true);

            monitorBean = monitorBeans.getMonitorBean(originCode);

            if (Float.compare(monitorBean.lowPrice, 0) != 0) {
                editLow.setText(FloatUtil.handleFloatString(monitorBean.lowPrice) + "");
            }
            if (Float.compare(monitorBean.highPrice, 0) != 0) {
                editHigh.setText(FloatUtil.handleFloatString(monitorBean.highPrice) + "");
            }
            if (Float.compare(monitorBean.lowPricePercent, 0) != 0) {
                editLowP.setText(FloatUtil.handleFloatString(monitorBean.lowPricePercent) + "");
            }
            if (Float.compare(monitorBean.highPricePercent, 0) != 0) {
                editHighP.setText(FloatUtil.handleFloatString(monitorBean.highPricePercent) + "");
            }
        }
    }

    public void delete(View view) {
        monitorBeans.deleteBean(monitorBean.code);
        IO.saveToLocal(IO.getLocalFilePath(this), monitorBeans);
        finish();
    }

    public void save(View view) {
        String code = editCode.getText().toString().trim();
        if (TextUtils.isEmpty(code)) {
            Toast.makeText(this, "请填写代码", Toast.LENGTH_SHORT).show();
            return;
        }

        String low = editLow.getText().toString().trim();
        String high = editHigh.getText().toString().trim();

        String lowP = editLowP.getText().toString().trim();
        String highP = editHighP.getText().toString().trim();

        float lowF = 0;
        if (!TextUtils.isEmpty(low)) {
            try {
                lowF = FloatUtil.handleFloatString(low);
            } catch (Exception e) {
                Toast.makeText(this, "请填写正确的数值", Toast.LENGTH_SHORT).show();
                return;
            }
        }

        float highF = 0;
        if (!TextUtils.isEmpty(high)) {
            try {
                highF = FloatUtil.handleFloatString(high);
            } catch (Exception e) {
                Toast.makeText(this, "请填写正确的数值", Toast.LENGTH_SHORT).show();
                return;
            }
        }

        float lowFP = 0;
        if (!TextUtils.isEmpty(lowP)) {
            try {
                lowFP = FloatUtil.handleFloatString(lowP);
            } catch (Exception e) {
                Toast.makeText(this, "请填写正确的数值", Toast.LENGTH_SHORT).show();
                return;
            }
        }

        float highFP = 0;
        if (!TextUtils.isEmpty(highP)) {
            try {
                highFP = FloatUtil.handleFloatString(highP);
            } catch (Exception e) {
                Toast.makeText(this, "请填写正确的数值", Toast.LENGTH_SHORT).show();
                return;
            }
        }

        if (isAddMode) {
            MonitorBean bean = new MonitorBean(code);
            bean.highPrice = highF;
            bean.highPricePercent = highFP;
            bean.lowPrice = lowF;
            bean.lowPricePercent = lowFP;
            monitorBeans.add(bean);
            IO.saveToLocal(IO.getLocalFilePath(this), monitorBeans);
        } else {
            monitorBean.highPrice = highF;
            monitorBean.highPricePercent = highFP;
            monitorBean.lowPrice = lowF;
            monitorBean.lowPricePercent = lowFP;
        }
        finish();
    }
}
