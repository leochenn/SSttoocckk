package okhttp3.internal.platform;

import android.annotation.SuppressLint;

import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import okhttp3.OkHttpClient;

/**
 * Created by Leo on 2019/7/26.
 */
public class OkHttpManager {

    public static OkHttpClient getIntance() {
        return new OkHttpManager().getOkHttpClient();
    }

    public OkHttpClient getOkHttpClient() {
        OkHttpClient.Builder builder = new OkHttpClient.Builder();
        ignoreHttps(builder);
        OkHttpClient okHttpClient = builder.build();
        return okHttpClient;
    }

    private void ignoreHttps(OkHttpClient.Builder builder) {
        // 当OkHttp遇到Https
        // https://blog.csdn.net/lmj623565791/article/details/48129405
        SSLSocketFactory sslFactory = getSocketFactory();
        builder.sslSocketFactory(sslFactory, Platform.get().trustManager(sslFactory));
        builder.hostnameVerifier(new HostnameVerifier() {
            @Override
            public boolean verify(String hostname, SSLSession session) {
                return true;
            }
        });
    }

    private TrustManager[] getTrustManager() {
        return new TrustManager[] { new X509TrustManager() {
            @Override
            public X509Certificate[] getAcceptedIssuers() {
                // return new X509Certificate[0];
                return new X509Certificate[] {};
            }

            @Override
            public void checkClientTrusted(X509Certificate[] certs, String authType) {
            }

            @Override
            public void checkServerTrusted(X509Certificate[] certs, String authType) {
            }
        } };
    }

    @SuppressLint("TrulyRandom")
    private SSLSocketFactory getSocketFactory() {
        try {
            // Install the all-trusting trust manager
            final SSLContext sslContext = SSLContext.getInstance("SSL");
            sslContext.init(null, getTrustManager(), new SecureRandom());
            // Create an ssl socket factory with our all-trusting manager
            return sslContext.getSocketFactory();
        } catch (KeyManagementException e) {
            e.printStackTrace();
        } catch (NoSuchAlgorithmException e) {
            e.printStackTrace();
        }
        return null;
    }
}
