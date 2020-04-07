package com.leo.stock.module.service;

import com.leo.stock.library.util.LogUtil;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;

/**
 * Created by Leo on 2020/4/7.
 */
public class IO {

    public static void loadFromLocal(String path, MonitorBeans monitorBeans) {
        File file = new File(path);
        if (!file.exists()) {
            return;
        }

        FileInputStream inputStream = null;
        try {
            inputStream = new FileInputStream(file);
            ObjectInputStream inputStream1 = new ObjectInputStream(inputStream);

            MonitorBean bean = null;
            while ((bean = (MonitorBean) inputStream1.readObject()) != null) {
                monitorBeans.add(bean);
            }
            inputStream1.close();
        } catch (Exception e) {
            LogUtil.e(e, "IO", "loadFromLocal");
        } finally {
            if (inputStream != null) {
                try {
                    inputStream.close();
                } catch (IOException e) {
                    LogUtil.e(e, "IO", "loadFromLocal");
                }
            }
        }
    }

    public static void saveToLocal(String path, MonitorBeans monitorBeans) {
        File file = new File(path);
        if (file.exists()) {
            file.delete();
        }
        try {
            FileOutputStream fileOutputStream = new FileOutputStream(file, false);
            ObjectOutputStream objectOutputStream = new ObjectOutputStream(fileOutputStream);
            for (MonitorBean bean : monitorBeans.getCollection()) {
                objectOutputStream.writeObject(bean);
            }
            objectOutputStream.writeObject(null);
            objectOutputStream.flush();
            objectOutputStream.close();
            fileOutputStream.close();
        } catch (Exception e) {
            LogUtil.e(e, "IO", "saveToLocal");
        }
    }
}
