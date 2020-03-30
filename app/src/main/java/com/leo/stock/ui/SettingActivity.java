
package com.leo.stock.ui;

import android.app.Activity;
import android.os.Bundle;
import android.widget.CheckBox;
import android.widget.EditText;

import com.leo.stock.R;
import com.leo.stock.library.util.FloatUtil;
import com.leo.stock.module.email.Config;
import com.leo.stock.module.service.Settings;
import com.leo.stock.module.service.SpUtil;

/**
 * Created by Leo on 2020/3/26.
 */
public class SettingActivity extends Activity {

    EditText editTextRefresh, editTextEmailAuthCode, editTextSoundCount, editTextHighAlarm, editTextLowAlarm, editTextAlarmInterval;
    CheckBox checkBoxEmail, checkBoxSound, checkBoxNotify;
    EditText editTextFtpHost, EditTextFtpUser, EditTextFtpPwd;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_setting);

        checkBoxEmail = findViewById(R.id.cbx_email);
        checkBoxEmail.setChecked(SpUtil.getBoolean(this, "cb_email", true));

        checkBoxSound = findViewById(R.id.cbx_sound);
        checkBoxSound.setChecked(SpUtil.getBoolean(this, "cb_sound", true));

        checkBoxNotify = findViewById(R.id.cbx_notify);
        checkBoxNotify.setChecked(SpUtil.getBoolean(this, "cb_notify", true));

        editTextHighAlarm = findViewById(R.id.edit_high);
        editTextHighAlarm.setText("" + SpUtil.getFloat(this, "edit_high", 3));

        editTextLowAlarm = findViewById(R.id.edit_low);
        editTextLowAlarm.setText("" + SpUtil.getFloat(this, "edit_low", 3));

        editTextRefresh = findViewById(R.id.edit_refresh);
        editTextRefresh.setText("" + SpUtil.getInt(this, "edit_refresh", 10));

        editTextSoundCount = findViewById(R.id.edit_sound);
        editTextSoundCount.setText("" + SpUtil.getInt(this, "edit_soundcount", 3));

        editTextEmailAuthCode = findViewById(R.id.edit_qqcode);
        editTextEmailAuthCode.setText(SpUtil.getString(this, "edit_qqauth", Config.AUTH_CODE));

        editTextAlarmInterval = findViewById(R.id.edit_alarm_interval);
        editTextAlarmInterval.setText("" + Settings.getAlarmInterval(this));

        editTextFtpHost = findViewById(R.id.edit_ftp_host);
        editTextFtpHost.setText(Settings.getFtpHost(this));

        EditTextFtpUser = findViewById(R.id.edit_ftp_user);
        EditTextFtpUser.setText(Settings.getFtpUser(this));

        EditTextFtpPwd = findViewById(R.id.edit_ftp_pwd);
        EditTextFtpPwd.setText(Settings.getFtpPwd(this));
    }

    @Override
    protected void onDestroy() {
        SpUtil.putBoolean(this, "cb_email", checkBoxEmail.isChecked());
        SpUtil.putBoolean(this, "cb_sound", checkBoxSound.isChecked());
        SpUtil.putBoolean(this, "cb_notify", checkBoxNotify.isChecked());
        SpUtil.putFloat(this, "edit_high", FloatUtil.handleFloatString(editTextHighAlarm.getText().toString().trim()));
        SpUtil.putFloat(this, "edit_low", FloatUtil.handleFloatString(editTextLowAlarm.getText().toString().trim()));
        SpUtil.putInt(this, "edit_refresh", Integer.parseInt(editTextRefresh.getText().toString().trim()));
        SpUtil.putInt(this, "edit_soundcount", Integer.parseInt(editTextSoundCount.getText().toString().trim()));
        SpUtil.putString(this, "edit_qqauth", editTextEmailAuthCode.getText().toString().trim());
        SpUtil.putInt(this, "edit_alarm_interval", Integer.parseInt(editTextAlarmInterval.getText().toString().trim()));

        SpUtil.putString(this, "edit_ftp_host", editTextFtpHost.getText().toString().trim());
        SpUtil.putString(this, "edit_ftp_user", EditTextFtpUser.getText().toString().trim());
        SpUtil.putString(this, "edit_ftp_pwd", EditTextFtpPwd.getText().toString().trim());
        super.onDestroy();
    }
}
