package com.leo.stock.module.service;

import android.app.Activity;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.Toast;

import com.leo.stock.Bean.LocalBean;
import com.leo.stock.R;
import com.leo.stock.library.util.FloatUtil;

public class StockDetailActivity extends Activity {

    private Button btnDelete;
    private EditText editCode, editLow, editHigh, editLowP, editHighP;

    boolean isAddMode;
    MonitorBean monitorBean;
    MonitorBeans monitorBeans;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_stock_detail_new);

        btnDelete = findViewById(R.id.btn_delete);

        editCode = findViewById(R.id.edit_code);
        editLow = findViewById(R.id.edit_low);
        editHigh = findViewById(R.id.edit_high);
        editLowP = findViewById(R.id.edit_low_p);
        editHighP = findViewById(R.id.edit_high_p);

        String originCode = getIntent().getStringExtra("code");
        isAddMode = TextUtils.isEmpty(originCode);

        monitorBeans = StockMonitorMgr.getInstance().getMonitorBeans();

        if (isAddMode) {
            btnDelete.setEnabled(false);
        } else {
            editCode.setText(originCode);
            editCode.setEnabled(false);
            btnDelete.setEnabled(true);

            monitorBean = monitorBeans.getMonitorBean(originCode);

            if (Float.compare(monitorBean.downPrice, 0) != 0) {
                editLow.setText(FloatUtil.handleFloatString(monitorBean.downPrice) + "");
            }
            if (Float.compare(monitorBean.upPrice, 0) != 0) {
                editHigh.setText(FloatUtil.handleFloatString(monitorBean.upPrice) + "");
            }
            if (Float.compare(monitorBean.downPricePercent, 0) != 0) {
                editLowP.setText(FloatUtil.handleFloatString(monitorBean.downPricePercent) + "");
            }
            if (Float.compare(monitorBean.upPricePercent, 0) != 0) {
                editHighP.setText(FloatUtil.handleFloatString(monitorBean.upPricePercent) + "");
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
            bean.upPrice = highF;
            bean.upPricePercent = highFP;
            bean.downPrice = lowF;
            bean.downPricePercent = lowFP;
            monitorBeans.add(bean);
            IO.saveToLocal(IO.getLocalFilePath(this), monitorBeans);
        } else {
            monitorBean.upPrice = highF;
            monitorBean.upPricePercent = highFP;
            monitorBean.downPrice = lowF;
            monitorBean.downPricePercent = lowFP;
        }
        finish();
    }
}
