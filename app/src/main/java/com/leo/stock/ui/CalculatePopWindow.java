package com.leo.stock.ui;

import android.app.Dialog;
import android.content.Context;
import android.support.annotation.NonNull;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.view.MotionEvent;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import com.leo.stock.R;
import com.leo.stock.library.util.FloatUtil;
import com.leo.stock.library.util.LogUtil;

/**
 * Created by Leo on 2020/3/24.
 */
public class CalculatePopWindow extends Dialog implements View.OnTouchListener {

    Button btnAdd, btnCut;
    TextView tvOld, tvNew;
    EditText editText;
    float oldPrice;
    boolean onClick;

    public CalculatePopWindow(@NonNull Context context, final float oldPrice) {
        super(context);

        this.oldPrice = oldPrice;

        setContentView(R.layout.layout_calculate_pop);

        btnAdd = findViewById(R.id.btn_add);
        btnCut = findViewById(R.id.btn_cut);
        btnAdd.setOnTouchListener(this);
        btnCut.setOnTouchListener(this);

        tvOld = findViewById(R.id.tv_oldPrice);
        editText = findViewById(R.id.tv_space);
        editText.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {

            }

            @Override
            public void afterTextChanged(Editable s) {
                float fSpace = getEditFloat();
                try {
                    String f = FloatUtil.handleFloatString(oldPrice + oldPrice * fSpace / 100) + "";
                    tvNew.setText(f);
                } catch (Exception e) {
                    tvNew.setText("" + oldPrice);
                    editText.setText("0");
                }

            }
        });
        tvNew = findViewById(R.id.tv_newPrice);

        tvOld.setText("" + oldPrice);
        tvNew.setText("" + oldPrice);
    }

    @Override
    public boolean onTouch(View v, MotionEvent event) {
        if (event.getAction() == MotionEvent.ACTION_DOWN) {
            onClick = true;
            btnAdd.postDelayed(new Action(v == btnAdd), 20);
        }

        if (event.getAction() == MotionEvent.ACTION_UP) {
            onClick = false;
        }
        return false;
    }

    private float getEditFloat() {
        String value = editText.getText().toString().trim();
        if (TextUtils.isEmpty(value)) {
            value = "0";
        }

        return FloatUtil.handleFloatString(FloatUtil.handleFloatString(value), "0.00");
    }

    class Action implements Runnable {
        boolean add;

        public Action(boolean add) {
            this.add = add;
        }

        @Override
        public void run() {
            if (onClick) {
                float fSpace = getEditFloat();
                if (add) {
                    fSpace = fSpace + 0.01f;
                } else {
                    fSpace = fSpace - 0.01f;
                }

                String s = FloatUtil.handleFloatString(fSpace, "0.00") + "";
                editText.setText(s);
                btnAdd.postDelayed(this, 20);
            }
        }
    }
}
