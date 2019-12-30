package com.leo.stock.ui;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import com.leo.stock.Bean.LocalBean;
import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.R;
import com.leo.stock.biz.StockDetailBiz;
import com.leo.stock.library.base.IRequestListener;
import com.leo.stock.library.util.FloatUtil;
import com.leo.stock.module.stock.StockConfig;
import com.leo.stock.module.stock.StockHelper;

public class StockDetailActivity extends Activity {

    private static final String TAG = "StockDetailActivity";

    private static final String KEY_CODE = "code";

    private Button btnDelete;
    private EditText editCode, editLow, editHigh, editEmail1, editEmail2, editBackup;
    private TextView tvCurrentPrice;
    private CheckBox checkBox;

    private StockDetailBiz stockDetailBiz;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_stock_detail);

        btnDelete = findViewById(R.id.btn_delete);
        tvCurrentPrice = findViewById(R.id.tv_currentPrice);

        editBackup = findViewById(R.id.edit_backup);
        editCode = findViewById(R.id.edit_code);
        editLow = findViewById(R.id.edit_low);
        editHigh = findViewById(R.id.edit_high);
        editEmail1 = findViewById(R.id.edit_email1);
        editEmail2 = findViewById(R.id.edit_email2);

        checkBox = findViewById(R.id.checkbox);

        String originCode = getIntent().getStringExtra(KEY_CODE);

        if (TextUtils.isEmpty(originCode)) {
            btnDelete.setEnabled(false);
        } else {
            editCode.setText(originCode);
            editCode.setEnabled(false);
            btnDelete.setEnabled(true);
        }

        stockDetailBiz = new StockDetailBiz(this, originCode);
        stockDetailBiz.load();
    }

    public void loadFinshed(LocalBean localBean) {
        if (localBean.low != 0) {
            editLow.setText("" + localBean.low);
        }
        if (localBean.high != 0) {
            editHigh.setText("" + localBean.high);
        }
        if (!TextUtils.isEmpty(localBean.email1)) {
            editEmail1.setText(localBean.email1);
        }
        if (!TextUtils.isEmpty(localBean.email2)) {
            editEmail2.setText(localBean.email2);
        }
        checkBox.setChecked(localBean.monitorEnable);

        if (!TextUtils.isEmpty(localBean.backup)) {
            editBackup.setText(localBean.backup);
        }
    }

    public void delete(View view) {
        stockDetailBiz.delete();
    }

    public void save(View view) {
        String code = editCode.getText().toString().trim();
        if (TextUtils.isEmpty(code)) {
            Toast.makeText(this, "请填写代码", Toast.LENGTH_SHORT).show();
            return;
        }

        String low = editLow.getText().toString().trim();
        String high = editHigh.getText().toString().trim();
        float lowF = 0;
        if (!TextUtils.isEmpty(low)) {
            try {
                lowF = FloatUtil.handleFloat(low);
            } catch (Exception e) {
                Toast.makeText(this, "请填写正确的数值", Toast.LENGTH_SHORT).show();
                return;
            }
        }

        float highF = 0;
        if (!TextUtils.isEmpty(high)) {
            try {
                highF = FloatUtil.handleFloat(high);
            } catch (Exception e) {
                Toast.makeText(this, "请填写正确的数值", Toast.LENGTH_SHORT).show();
                return;
            }
        }

        LocalBean localBean = new LocalBean();
        localBean.id = code;
        localBean.low = lowF;
        localBean.high = highF;
        localBean.monitorEnable = checkBox.isChecked();
        localBean.email1 = editEmail1.getText().toString().trim();
        localBean.email2 = editEmail2.getText().toString().trim();
        localBean.backup = editBackup.getText().toString().trim();

        stockDetailBiz.saveOrUpdate(localBean);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stockDetailBiz.removeRegister();
    }

    public static void startByAdd(Activity activity) {
        startByModify(activity, null);
    }

    public static void startByModify(Activity activity, String code) {
        Intent intent = new Intent(activity, StockDetailActivity.class);
        intent.putExtra(KEY_CODE, code);
        activity.startActivity(intent);
    }

    public void check(View view) {
        String code = editCode.getText().toString().trim();
        if (TextUtils.isEmpty(code)) {
            return;
        }
        
        final ProgressDialog dialog = new ProgressDialog(this);
        dialog.show();
        
        StockHelper.getSimple(code, new IRequestListener<SinaStockBean>() {
            @Override
            public void success(SinaStockBean data) {
                dialog.dismiss();
                if (data == null) {
                    Toast.makeText(StockDetailActivity.this, "编码不合法", Toast.LENGTH_SHORT).show();
                    return;
                }

                tvCurrentPrice.setTextIsSelectable(true);
                tvCurrentPrice.setText(stockDetailBiz.getString(data));
            }

            @Override
            public void failed(int code, String error) {
                dialog.dismiss();
                Toast.makeText(StockDetailActivity.this, error, Toast.LENGTH_SHORT).show();
            }
        });
    }

    public void choose(View view) {
        if (!stockDetailBiz.isAddNew()) {
            return;
        }

        final String[] codes = StockConfig.codes;
        new AlertDialog.Builder(this).setTitle("选择").
                setItems(codes, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        editCode.setText(codes[which]);
                    }
                }).show();
    }

    public void choose_email1(View view) {
        final String[] codes = StockConfig.emails;
        new AlertDialog.Builder(this).setTitle("选择").
                setItems(codes, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        editEmail1.setText(codes[which]);
                    }
                }).show();
    }

    public void choose_email2(View view) {
        final String[] codes = StockConfig.emails;
        new AlertDialog.Builder(this).setTitle("选择").
                setItems(codes, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        editEmail2.setText(codes[which]);
                    }
                }).show();
    }
}
