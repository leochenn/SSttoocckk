package com.leo.stock.Bean;

import android.text.TextUtils;

import java.io.Serializable;
import java.util.List;

/**
 * Created by Leo on 2019/12/23.
 */
public class LocalBean implements Serializable {
    public String id;
    public float low;
    public float high;

    public boolean monitorEnable;
    public String email1, email2;

    public boolean hasEmail() {
        return !TextUtils.isEmpty(email1) || !TextUtils.isEmpty(email2);
    }

    public String getEmail() {
        if (!TextUtils.isEmpty(email1)) {
            return email1;
        }
        return email2;
    }
}
