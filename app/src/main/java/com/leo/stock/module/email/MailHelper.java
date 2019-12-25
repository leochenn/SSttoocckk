package com.leo.stock.module.email;

import android.text.TextUtils;
import android.widget.Toast;

import com.leo.stock.App;
import com.leo.stock.Bean.LocalBean;
import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.monitor.Monitor;
import com.sun.mail.util.MailSSLSocketFactory;

import java.io.UnsupportedEncodingException;
import java.security.GeneralSecurityException;
import java.util.Properties;

import javax.mail.BodyPart;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Multipart;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;

/**
 * Created by Leo on 2019/12/21.
 */
public class MailHelper {

    private static MailHelper instance;
    private static final String TAG = "MailHelper";

    public static MailHelper getInstance() {
        if (instance == null) {
            instance = new MailHelper();
        }
        return instance;
    }

    Properties props;
    Session session;

    private MailHelper() {
        props = new Properties();
        // 开启debug调试
        props.setProperty("mail.debug", "true");
        // 发送服务器需要身份验证
        props.setProperty("mail.smtp.auth", "true");
        // 设置邮件服务器主机名
        props.setProperty("mail.host", Config.SMTP_HOST);
        // 发送邮件协议名称
        props.setProperty("mail.transport.protocol", "smtp");
        props.put("mail.smtp.ssl.enable", "true");

        MailSSLSocketFactory sf = null;
        try {
            sf = new MailSSLSocketFactory();
        } catch (GeneralSecurityException e) {
            LogUtil.e(e, TAG);
        }
        sf.setTrustAllHosts(true);
        props.put("mail.smtp.ssl.socketFactory", sf);

        session = Session.getInstance(props);
        session.setDebug(true);
    }

    public boolean sendEmail(String email, String personal, String subject, String text) {
        boolean state = true;
        try {
            Message msg = new MimeMessage(session);
            if (!TextUtils.isEmpty(personal)) {
                msg.setFrom(new InternetAddress(Config.SEND_ADDRESS, personal));
            } else {
                msg.setFrom(new InternetAddress(Config.SEND_ADDRESS));
            }

            msg.addRecipient(Message.RecipientType.TO, new InternetAddress(email));
            msg.setSubject(subject);
            msg.setText(text);
            transportSend(msg);
            LogUtil.d(TAG, "sendEmail success", email, personal, subject, text);
        } catch (Exception e) {
            LogUtil.e(e, TAG, "sendEmail", subject, text, email);
            state = false;
        }
        return state;
    }

    private void transportSend(Message message) throws MessagingException {
        Transport transport = session.getTransport();
        transport.connect(Config.SEND_ADDRESS, Config.AUTH_CODE);
        transport.sendMessage(message, message.getAllRecipients());
        transport.close();
    }

    private Message createHtmlMsg(String imgHtml) throws UnsupportedEncodingException,
            MessagingException {
        Message msg = getBasicMessage();
        msg.setSubject("测试Html邮件");

        Multipart mainPart = new MimeMultipart();
        BodyPart html = new MimeBodyPart();

        String strHtml = "<html><body><img src='http://avatar.csdn.net/A/C/A/1_jianggujin" +
                ".jpg'/><div>this " +
                "is a HTML email.</div></body><br><a href=\"http://www.w3school.com" +
                ".cn\">W3School</a></html>";

        strHtml = createTable();
        html.setContent(strHtml, "text/html; charset=utf-8");
        mainPart.addBodyPart(html);
        // 将MiniMultipart对象设置为邮件内容
        msg.setContent(mainPart);
        return msg;
    }

    private String createTable() {
        StringBuilder content = new StringBuilder("<html><head></head><body>");
        content.append("<table border=\"5\" style=\"border:solid 1px #E8F2F9;font-size=14px;;" +
                "font-size:18px;\">");
        content.append("<tr style=\"background-color: #428BCA; color:#ffffff\">" +
                "<th>column1</th><th>column2</th><th>column3</th></tr>");

        content.append("<tr>");
        content.append("<td>" + "第一列" + "</td>"); //第一列
        content.append("<td>" + "第二列" + "</td>"); //第二列
        content.append("<td>" + "第三列" + "</td>"); //第三列
        content.append("</tr>");

        content.append("</table>");
        content.append("</body></html>");
        return content.toString();
    }

    private Message getBasicMessage() throws MessagingException {
        Message msg = new MimeMessage(session);
        msg.setFrom(new InternetAddress(Config.SEND_ADDRESS));
        msg.addRecipient(Message.RecipientType.TO, new InternetAddress(Config.RECIEVE_ADDRESS));
        return msg;
    }
}
