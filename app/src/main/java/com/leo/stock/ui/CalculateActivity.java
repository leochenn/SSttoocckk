package com.leo.stock.ui;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.R;
import com.leo.stock.library.base.IRequestListener;
import com.leo.stock.library.util.FloatUtil;
import com.leo.stock.module.stock.StockHelper;

/**
 * Created by Leo on 2020/3/24.
 */
public class CalculateActivity extends Activity {

    EditText editText1, editText2, editTextCode;
    TextView tv1L1, tv1L3, tv1L5, tv1L7, tv1L10, tv1H1, tv1H3, tv1H5, tv1H7, tv1H10;
    TextView tv2L1, tv2L3, tv2L5, tv2L7, tv2L10, tv2H1, tv2H3, tv2H5, tv2H7, tv2H10;
    TextView tv12, tv21;

    Button btnGet, btnClear, btnClear2, btnSet;

    private void getCodePrice() {
        String code = editTextCode.getText().toString().trim();
        if (TextUtils.isEmpty(code)) {
            return;
        }

        final ProgressDialog dialog = new ProgressDialog(this);
        dialog.show();
        StockHelper.getSimple2(code, new IRequestListener<SinaStockBean>() {
            @Override
            public void success(SinaStockBean data) {
                dialog.dismiss();
                if (data == null) {
                    Toast.makeText(getApplicationContext(), "编码不合法", Toast.LENGTH_SHORT).show();
                    return;
                }

                editText1.setText("" + data.todayCurrentPrice);
            }

            @Override
            public void failed(int code, String error) {
                dialog.dismiss();
                Toast.makeText(getApplicationContext(), error, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showPop(float value) {
        CalculatePopWindow popWindow = new CalculatePopWindow(this, value);
        popWindow.show();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_calculate);

        String code = null;
        String price = null;
        String price2 = null;

        if (getIntent() != null) {
            code = getIntent().getStringExtra("code");
            price = getIntent().getStringExtra("price");
            price2 = getIntent().getStringExtra("price2");
        }

        btnSet = findViewById(R.id.btn_set);
        btnSet.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String edit1 = editText1.getText().toString().trim();
                if (!TextUtils.isEmpty(edit1)) {
                    float value = FloatUtil.handleFloat(edit1);
                    showPop(value);
                }
            }
        });

        editTextCode = findViewById(R.id.edit_code);
        editTextCode.setText(code);

        btnGet = findViewById(R.id.btn_get);
        btnGet.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                getCodePrice();
            }
        });
        btnClear = findViewById(R.id.btn_clear);
        btnClear.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                editTextCode.setText("");
            }
        });
        btnClear2 = findViewById(R.id.btn_clear2);
        btnClear2.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                editText1.setText("");
                editText2.setText("");
            }
        });

        tv12 = findViewById(R.id.tv_diff1);
        tv21 = findViewById(R.id.tv_diff2);

        tv1L1 = findViewById(R.id.tv1_l1);
        tv1L3 = findViewById(R.id.tv1_l3);
        tv1L5 = findViewById(R.id.tv1_l5);
        tv1L7 = findViewById(R.id.tv1_l7);
        tv1L10 = findViewById(R.id.tv1_l10);
        tv1H1 = findViewById(R.id.tv1_h1);
        tv1H3 = findViewById(R.id.tv1_h3);
        tv1H5 = findViewById(R.id.tv1_h5);
        tv1H7 = findViewById(R.id.tv1_h7);
        tv1H10 = findViewById(R.id.tv1_h10);

        tv2L1 = findViewById(R.id.tv2_l1);
        tv2L3 = findViewById(R.id.tv2_l3);
        tv2L5 = findViewById(R.id.tv2_l5);
        tv2L7 = findViewById(R.id.tv2_l7);
        tv2L10 = findViewById(R.id.tv2_l10);
        tv2H1 = findViewById(R.id.tv2_h1);
        tv2H3 = findViewById(R.id.tv2_h3);
        tv2H5 = findViewById(R.id.tv2_h5);
        tv2H7 = findViewById(R.id.tv2_h7);
        tv2H10 = findViewById(R.id.tv2_h10);

        editText1 = findViewById(R.id.edt1);
        editText1.setText(price);
        editText1.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {

            }

            @Override
            public void afterTextChanged(Editable s) {
                edit1();
                edit12();
            }
        });

        editText2 = findViewById(R.id.edt2);
        editText2.setText(price2);
        editText2.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {

            }

            @Override
            public void afterTextChanged(Editable s) {
                edit2();
                edit12();
            }
        });
    }

    private void edit1() {
        String edit1 = editText1.getText().toString().trim();
        if (TextUtils.isEmpty(edit1)) {
            edit1 = "0";
        }

        float value = FloatUtil.handleFloat(edit1);

        tv1L1.setText("" + FloatUtil.handleFloat(value * 0.99f));
        tv1L3.setText("" + FloatUtil.handleFloat(value * 0.97f));
        tv1L5.setText("" + FloatUtil.handleFloat(value * 0.95f));
        tv1L7.setText("" + FloatUtil.handleFloat(value * 0.93f));
        tv1L10.setText("" + FloatUtil.handleFloat(value * 0.9f));
        tv1H1.setText("" + FloatUtil.handleFloat(value * 1.01f));
        tv1H3.setText("" + FloatUtil.handleFloat(value * 1.03f));
        tv1H5.setText("" + FloatUtil.handleFloat(value * 1.05f));
        tv1H7.setText("" + FloatUtil.handleFloat(value * 1.07f));
        tv1H10.setText("" + FloatUtil.handleFloat(value * 1.1f));
    }

    private void edit2() {
        String edit1 = editText2.getText().toString().trim();
        if (TextUtils.isEmpty(edit1)) {
            edit1 = "0";
        }

        float value = FloatUtil.handleFloat(edit1);

        tv2L1.setText("" + FloatUtil.handleFloat(value * 0.99f));
        tv2L3.setText("" + FloatUtil.handleFloat(value * 0.97f));
        tv2L5.setText("" + FloatUtil.handleFloat(value * 0.95f));
        tv2L7.setText("" + FloatUtil.handleFloat(value * 0.93f));
        tv2L10.setText("" + FloatUtil.handleFloat(value * 0.9f));
        tv2H1.setText("" + FloatUtil.handleFloat(value * 1.01f));
        tv2H3.setText("" + FloatUtil.handleFloat(value * 1.03f));
        tv2H5.setText("" + FloatUtil.handleFloat(value * 1.05f));
        tv2H7.setText("" + FloatUtil.handleFloat(value * 1.07f));
        tv2H10.setText("" + FloatUtil.handleFloat(value * 1.1f));
    }

    private void edit12() {
        String edit1 = editText1.getText().toString().trim();
        if (TextUtils.isEmpty(edit1)) {
            return;
        }

        String edit2 = editText2.getText().toString().trim();
        if (TextUtils.isEmpty(edit2)) {
            return;
        }

        float value1 = FloatUtil.handleFloat(edit1);
        float value2 = FloatUtil.handleFloat(edit2);

        tv12.setText("(价格2-价格1)/价格1:   " + FloatUtil.handleFloat(100f * (value2 - value1) / value1) + "%");
        tv21.setText("(价格1-价格2)/价格2:   " + FloatUtil.handleFloat(100f * (value1 - value2) / value2) + "%");
    }

    public static void lauchByCode(Context context, String code) {
        Intent intent = new Intent(context, CalculateActivity.class);
        intent.putExtra("code", code);
        context.startActivity(intent);
    }

    public static void lauchByPrice(Context context, String price) {
        lauchByPrice(context, price, null);
    }

    public static void lauchByPrice(Context context, String price, String price2) {
        Intent intent = new Intent(context, CalculateActivity.class);
        intent.putExtra("price", price);
        if (!TextUtils.isEmpty(price2)) {
            intent.putExtra("price2", price2);
        }
        context.startActivity(intent);
    }
}
