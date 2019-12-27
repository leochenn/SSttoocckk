package com.leo.stock.module.music;

import android.content.Context;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import com.leo.stock.library.util.LogUtil;

import java.lang.reflect.Field;

/**
 * Created by Leo on 2019/12/27.
 */
public class Player {

    static final String TAG = "Player";

    private Context context;
    private Ringtone ringtone;

    public Player(Context context) {
        this.context = context;
    }

    public boolean isPlaying() {
        return ringtone != null && ringtone.isPlaying();
    }

    private void setRingtoneRepeat(Ringtone ringtone) {
        Class<Ringtone> clazz = Ringtone.class;
        try {
            Field audio = clazz.getDeclaredField("mAudio");
            audio.setAccessible(true);
            MediaPlayer target = (MediaPlayer) audio.get(ringtone);
            target.setLooping(true);
        } catch (NoSuchFieldException e) {
            e.printStackTrace();
        } catch (IllegalArgumentException e) {
            e.printStackTrace();
        } catch (Exception e) {
            LogUtil.e(e, TAG);
        }
    }

    public void play() {
        if (ringtone == null) {
            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            ringtone = RingtoneManager.getRingtone(context, uri);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                ringtone.setLooping(true);
            } else {
                setRingtoneRepeat(ringtone);
            }
        }
        ringtone.play();
    }

    public void stop() {
        if (ringtone != null) {
            ringtone.stop();
        }
    }
}
