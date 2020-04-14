package com.leo.stock.ui.widget;

/**
 * Created by Leo on 2019/12/23.
 */
import android.content.Context;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.widget.LinearLayout;

/**
 * Created by hbh on 2017/3/15.
 * 自定义一个布局
 * 用于拦截onTouch事件
 */

public class InterceptScrollLinearLayout extends LinearLayout {

    public InterceptScrollLinearLayout(Context context) {
        super(context);
    }

    public InterceptScrollLinearLayout(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    public InterceptScrollLinearLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    boolean intercept;

    public void setIntercept(boolean intercept) {
        this.intercept = intercept;
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent ev) {
        return intercept;
    }
}
