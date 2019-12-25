package com.leo.stock.library.util;

import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

public class LogUtil {
    private static String TAG = "StockApp";
    private static final boolean LOG_SWITCH = Log.isLoggable(TAG, Log.VERBOSE) || true; // android

    /**
     * 通过开关控制输出到logcat
     */
    public static void d(Object... args) {
        if (LOG_SWITCH) {
            String content = logFormatter(args);
            Log.d(TAG, "*" + content);
        }
    }

    public static void e(Object... args) {
        if (LOG_SWITCH) {
            String content = logFormatter(args);
            Log.e(TAG, "*" + content);
        }
    }

    public static void e(Exception e, Object... args) {
        if (LOG_SWITCH) {
            if (e != null) {
                e.printStackTrace();
            }

            String content = logFormatter(args);
            content = join(content, e);
            Log.e(TAG, "*" + content);
        }
    }

    /**
     * 输出到logcat
     */
    public static void debug(Object... args) {
        String content = logFormatter(args);
        Log.d(TAG, content);
    }

    public static void error(Exception e, Object... args) {
        if (e != null) {
            e.printStackTrace();
        }

        String content = logFormatter(args);
        content = join(content, e);
        Log.e(TAG, content);
    }

    public static void error(Object... args) {
        String content = logFormatter(args);
        Log.e(TAG, content);
    }

    private static String logFormatter(Object... args) {
        int i = 0;
        StringBuilder sb = new StringBuilder();
        for (; ; ) {

            String convert = null;
            try {
                convert = String.valueOf(args[i]);
            } catch (Exception e) {
            }

            if (isEmpty(convert)) {
                convert = "";
            }
            sb.append(convert);
            i++;
            if (i >= args.length) {
                break;
            }
            sb.append('`');
        }

        return sb.toString();
    }

    private static final String join(String msg, Exception e) {
        if (e != null) {
            if (!isEmpty(msg)) {
                msg = msg + "\r\n" + getStackTrace(e);
            } else {
                msg = getStackTrace(e);
            }
        }
        return msg;
    }

    // 当前代码执行时所在的文件名/方法名/行号
    // https://www.2cto.com/kf/201704/623700.html

    private static String getStackTrace(Exception e) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintStream ps = new PrintStream(baos);
        e.printStackTrace(ps);
        return baos.toString();
    }

    private static final boolean isEmpty(String s) {
        return (s == null) || (s.length() == 0) || (s.trim().length() == 0);
    }
}
