package com.leo.stock.library.io;

import android.content.Context;

import com.leo.stock.Bean.LocalBean;
import com.leo.stock.library.util.LogUtil;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Created by Leo on 2019/12/23.
 */
public class FileIO {

    public static void delete(Context context, String code) {
        String diretory = context.getFilesDir().toString();
        File dst = new File(diretory, code);
        if (dst.exists()) {
            boolean del = dst.delete();
            LogUtil.d("delete", code, del);
        }
    }

    public static void save(Context context, LocalBean localBean) {
        String diretory = context.getFilesDir().toString();
        File dst = new File(diretory, localBean.id);
        try {
            FileOutputStream fos = new FileOutputStream(dst);
            ObjectOutputStream oos = new ObjectOutputStream(fos);
            oos.writeObject(localBean);
            oos.flush();
            oos.close();
        } catch (Exception e) {
            LogUtil.e(e, "FileIO save");
        }
    }

    public static LocalBean read(Context context, String code) {
        LocalBean person = null;
        String diretory = context.getFilesDir().toString();
        File dst = new File(diretory, code);
        try {
            FileInputStream fis = new FileInputStream(dst);
            ObjectInputStream ois = new ObjectInputStream(fis);
            person = (LocalBean) ois.readObject();
            ois.close();
        } catch (Exception e) {
            LogUtil.e(e, "FileIO read");
        }
        return person;
    }

    public static List<LocalBean> getFileList(Context context) {
        File[] files = context.getFilesDir().listFiles();
        if (files == null || files.length == 0) {
            return null;
        }

        List<LocalBean> list = new ArrayList<>();
        for (File file : files) {
            LocalBean localBean = read(context, file.getName());
            list.add(localBean);
        }
        return list;
    }
}
