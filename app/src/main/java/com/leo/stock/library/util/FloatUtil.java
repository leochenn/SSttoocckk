package com.leo.stock.library.util;

import java.text.DecimalFormat;

/**
 * Created by Leo on 2019/12/23.
 */
public class FloatUtil {

    private static float handleFloatInternal(float value) {
        float b = (float) (Math.round(value * 1000)) / (1000);
        return b;
    }

    public static float handleFloat(float value) {
        DecimalFormat decimalFormat = new DecimalFormat("0.000");
        String b = decimalFormat.format(value);
        float c = Float.parseFloat(b);
        float d = handleFloatInternal(value);
        if (c != d) {
            LogUtil.e("handleFloat", value, c, d);
        }
        return c;
    }

    public static float handleFloat2(float value) {
        DecimalFormat decimalFormat = new DecimalFormat("0.00");
        String b = decimalFormat.format(value);
        float c = Float.parseFloat(b);
        float d = handleFloatInternal(value);
        if (c != d) {
            LogUtil.e("handleFloat", value, c, d);
        }
        return c;
    }

    public static float handleFloat(String value) {
        float a = Float.parseFloat(value);
        return handleFloat(a);
    }
}
