package com.leo.stock.library.util;

import java.text.DecimalFormat;

/**
 * Created by Leo on 2019/12/23.
 */
public class FloatUtil {

    public static float handleFloatString(float value) {
        return handleFloatString(value, "0.000");
    }

    public static float handleFloatString(float value, String format) {
        DecimalFormat decimalFormat = new DecimalFormat(format);
        String b = decimalFormat.format(value);
        return convertString(b);
    }

    private static float convertString(String value) {
        try {
            return Float.parseFloat(value);
        } catch (Exception e) {
            LogUtil.e(e, "convertString", value);
            return 0f;
        }
    }

    public static float handleFloatString(String value) {
        return handleFloatString(convertString(value));
    }
}
