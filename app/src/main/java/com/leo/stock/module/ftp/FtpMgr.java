package com.leo.stock.module.ftp;

import com.leo.stock.App;
import com.leo.stock.biz.IGetData;
import com.leo.stock.library.base.ExeOperator;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.monitor.Settings;

import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPFile;
import org.apache.commons.net.ftp.FTPReply;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.util.ArrayList;

/**
 * Created by Leo on 2020/3/30.
 */
public class FtpMgr {

    private static final String TAG = "FtpMgr";

    private static String FTP_SERVER_HOST;

    private static int FTP_SERVRE_PORT = 21;

    private static String FTP_SERVER_USER;

    private static String FTP_SERVER_PWD;

    FTPClient ftpClient;
    boolean result;

    private FtpMgr() {
        FTP_SERVER_HOST = Settings.getFtpHost(App.getInstance().getApplicationContext());
        FTP_SERVER_USER = Settings.getFtpUser(App.getInstance().getApplicationContext());
        FTP_SERVER_PWD = Settings.getFtpPwd(App.getInstance().getApplicationContext());
        ftpClient = new FTPClient();
        login();
    }

    private void login() {
        try {
            ftpClient.setConnectTimeout(6000);
            ftpClient.connect(FTP_SERVER_HOST, FTP_SERVRE_PORT);
            if (ftpClient.isConnected()) {
                boolean loginState = ftpClient.login(FTP_SERVER_USER, FTP_SERVER_PWD);
                LogUtil.d(TAG, "ftp登录", loginState);
                if (loginState) {
                    //设置编码类型为UTF-8
                    ftpClient.setControlEncoding("UTF-8");
                    //设置文件类型为二进制文件类型
                    ftpClient.setFileType(FTPClient.BINARY_FILE_TYPE);
                    if (FTPReply.isPositiveCompletion(ftpClient.getReplyCode())) {
                        result = true;
                    } else {
                        LogUtil.e(TAG, "ftp返回错误码");
                    }
                }
            } else {
                LogUtil.e(TAG, "ftp连接失败");
            }
        } catch (Exception e) {
            LogUtil.e(e, TAG, "login");
        }
        if (!result) {
            destroy();
        }
    }

    private void destroy() {
        try {
            ftpClient.logout();
            LogUtil.d(TAG, "注销登录");
        } catch (IOException e) {
            LogUtil.e(e, TAG, "logout");
        }
        try {
            ftpClient.disconnect();
            LogUtil.d(TAG, "断开连接");
        } catch (IOException e) {
            LogUtil.e(e, TAG, "disconnect");
        }
    }

    private void download(String fileName) {
        InputStream is = null;
        try {
            is = ftpClient.retrieveFileStream(fileName);
            BufferedReader reader =
                    new BufferedReader(new InputStreamReader(is));

            String line = null;
            while ((line = reader.readLine()) != null) {
                LogUtil.d(TAG, line);
            }
            reader.close();
            LogUtil.d(TAG, "download finish");
        } catch (Exception e) {
            LogUtil.e(e, TAG, "download");
        } finally {
            try {
                if (is != null) {
                    is.close();
                }
                boolean a = ftpClient.completePendingCommand();
                LogUtil.d(TAG, "download completePendingCommand", a);
            } catch (IOException e) {
                LogUtil.e(e, TAG, "download");
            }
        }
    }

    private void downloadStringList(String fileName, ArrayList<String> list) {
        boolean abc = false;
        InputStream is = null;
        try {
            is = ftpClient.retrieveFileStream(fileName);
            BufferedReader reader =
                    new BufferedReader(new InputStreamReader(is));
            String line = null;
            while ((line = reader.readLine()) != null) {
                LogUtil.d(TAG, line);
                list.add(line);
            }
            reader.close();
            abc = true;
            LogUtil.d(TAG, "downloadStringList finish");
        } catch (Exception e) {
            LogUtil.e(e, TAG, "downloadStringList");
        } finally {
            try {
                if (is != null) {
                    is.close();
                }
                if (abc) {
                    boolean a = ftpClient.completePendingCommand();
                    LogUtil.d(TAG, "download completePendingCommand", a);
                }
            } catch (IOException e) {
                LogUtil.e(e, TAG, "completePendingCommand");
            }
        }
    }

    private void upload(String fileName) {
        OutputStream os = null;
        FileInputStream fis = null;
        try {
            ftpClient.makeDirectory("/fff/");
            ftpClient.enterLocalPassiveMode();
            os = ftpClient.storeFileStream("/fff/123.txt");
            File file = new File(fileName);
            if (file.exists()) {
                fis = new FileInputStream(file);
                int length;
                byte[] bytes = new byte[1024];
                while ((length = fis.read(bytes)) != -1) {
                    os.write(bytes, 0, length);
                }
                LogUtil.d(TAG, "upload success");
            } else {
                os.write("abcd\n".getBytes());
                os.write("123456".getBytes());
                LogUtil.e(TAG, "upload 文件不存在", fileName);
            }
        } catch (Exception e) {
            LogUtil.e(e, TAG, "upload");
        } finally {
            try {
                if (fis != null) {
                    fis.close();
                }
                if (os != null) {
                    os.close();
                }
                boolean a = ftpClient.completePendingCommand();
                LogUtil.d(TAG, "upload completePendingCommand", a);
            } catch (IOException e) {
                LogUtil.e(e, TAG, "upload");
            }
        }
    }

    ArrayList<String> fileList;

    private ArrayList<String> list() {
        fileList = new ArrayList<>();
        getPath("/");
        return fileList;
    }

    public void getPath(String pathName) {
        try {
            if (pathName.startsWith("/") && pathName.endsWith("/")) {
                //更换目录到当前目录
                ftpClient.changeWorkingDirectory(pathName);
                FTPFile[] files = ftpClient.listFiles();
                for (FTPFile file : files) {
                    if (file.isFile()) {
                        fileList.add(pathName + file.getName());
                        LogUtil.d(TAG, "list", pathName + file.getName());
                    } else if (file.isDirectory()) {
                        // 需要加此判断。否则，ftp默认将‘项目文件所在目录之下的目录（./）’与‘项目文件所在目录向上一级目录下的目录（../）’都纳入递归，这样下去就陷入一个死循环了。需将其过滤掉。
                        if (!".".equals(file.getName()) && !"..".equals(file.getName())) {
                            getPath(pathName + file.getName() + "/");
                        }
                    }
                }
            }
        } catch (Exception e) {
            LogUtil.e(e, TAG, "list");
        }
    }

    public static void listFile() {
        ExeOperator.runOnThread(new Runnable() {
            @Override
            public void run() {
                FtpMgr ftpMgr = new FtpMgr();
                if (ftpMgr.result) {
                    ftpMgr.list();
                    ftpMgr.destroy();
                }
            }
        });
    }

    public static void downloadFile(final String fileName) {
        ExeOperator.runOnThread(new Runnable() {
            @Override
            public void run() {
                FtpMgr ftpMgr = new FtpMgr();
                if (ftpMgr.result) {
                    ArrayList<String> fileList = ftpMgr.list();
                    for (String name : fileList) {
                        ftpMgr.download(name);
                    }
                    ftpMgr.destroy();
                }
            }
        });
    }

    public static void downloadFile(final String fileName, final IGetData<ArrayList<String>> listener) {
        ExeOperator.runOnThread(new Runnable() {
            @Override
            public void run() {
                FtpMgr ftpMgr = new FtpMgr();
                if (ftpMgr.result) {
                    ArrayList<String> list = new ArrayList<>();
                    ftpMgr.downloadStringList(fileName, list);
                    ftpMgr.destroy();
                    listener.getData(list);
                } else {
                    listener.getData(null);
                }
            }
        });
    }

    public static void updateLoadFile(final String fileName) {
        ExeOperator.runOnThread(new Runnable() {
            @Override
            public void run() {
                FtpMgr ftpMgr = new FtpMgr();
                if (ftpMgr.result) {
                    ftpMgr.upload(fileName);
                    ftpMgr.destroy();
                }
            }
        });
    }
}
