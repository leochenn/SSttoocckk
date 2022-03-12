package com.leo.stock.library.util;

import android.text.TextUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by Leo on 2021/4/24.
 */
public class StockUtil {

    // 沪市可转债的单位是手，
    // 深市可转债的单位是张，
    // 1手=10张=1000元，1张= 100元
    // 1000元  沪市 1手，深市10张

    // 获取证券数量, 可转债统一返回张数
    public static int getBondCount(String code, int count) {
        if (isSHKeZhuanZhai(code)) {
            return count * 10;
        }
        return count;
    }

    /**
     * 判断code是否为可转债代码
     * @param code
     * @return
     */
    public static boolean isKeZhuanZhai(String code) {
        if (isSHKeZhuanZhai(code)) {
            return true;
        }
        if (isSZKeZhuanZhai(code)) {
            return true;
        }
        return false;
    }

    /**
     * 沪市可转债
     * @param code
     * @return
     */
    public static boolean isSHKeZhuanZhai(String code) {
        List<String> list = new ArrayList<String>();
        // 沪主板 600开头股票 转债110
        list.add("110");
        // 沪主板 601开头股票 转债1130
        list.add("1130");
        // 沪主板 603开头股票 转债1135 1136
        list.add("1135");
        list.add("1136");
        for (String bond : list) {
            if (code.startsWith(bond) || code.startsWith("sh" + bond)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 深市可转债
     * @param code
     * @return
     */
    public static boolean isSZKeZhuanZhai(String code) {
        List<String> list = new ArrayList<String>();
        // 深主板 000开头股票 转债127
        list.add("127");
        // 深创业板 300开头股票 转债123
        list.add("123");
        // 深中小板 002开头股票 转债128
        list.add("128");
        for (String bond : list) {
            if (code.startsWith(bond) || code.startsWith("sz" + bond)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 判断code是否为沪市证券代码, 仅判断股票 可转债
     * @param code
     * @return
     */
    public static boolean isSHBond(String code) {
        List<String> listSH = new ArrayList<String>();
        // 沪主板 600开头股票 转债110
        listSH.add("600");
        listSH.add("110");
        // 沪主板 601开头股票 转债1130
        listSH.add("601");
        listSH.add("1130");
        // 沪主板 603开头股票 转债1135 1136
        listSH.add("603");
        listSH.add("1135");
        listSH.add("1136");

        // 沪可交换债
        listSH.add("132");

        listSH.add("000001");

        for (String abc : listSH) {
            if (code.startsWith(abc)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 判断code是否为深市证券代码, 仅判断股票 可转债
     * @param code
     * @return
     */
    public static boolean isSZBond(String code) {
        List<String> listSZ = new ArrayList<String>();
        // 深主板 000开头股票 转债127
        listSZ.add("000");
        listSZ.add("127");

        // 深创业板 300开头股票 转债123
        listSZ.add("300");
        listSZ.add("123");

        // 深中小板 002开头股票 转债128
        listSZ.add("002");
        listSZ.add("128");

        // 深可交换债
        listSZ.add("120");
        for (String abc : listSZ) {
            if (code.startsWith(abc)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param code 纯数字证券代码
     * @return 返回带sh sz前缀的证券代码
     */
    public static String getHSCode(String code) {
        if (TextUtils.isEmpty(code)) {
            return null;
        }

        if (isSHBond(code)) {
            return "sh" + code;
        }

        if (isSZBond(code)) {
            return "sz" + code;
        }

        // 上海发债7，基金51
        if (code.startsWith("5") || code.startsWith("7")) {
            return "sh" + code;
        }

        // 深圳发债3
        if (code.startsWith("3")) {
            return "sz" + code;
        }

        // lof 基金
        if (code.startsWith("163") || code.startsWith("161") || code.startsWith("159")) {
            return "sz" + code;
        }

        if (code.startsWith("513")) {
            return "fu" + code;
        }

        LogUtil.e("获取沪深编码异常:" + code);
        return "sh" + code;
    }
}
