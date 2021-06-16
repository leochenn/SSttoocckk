
package com.leo.stock.ui;

import android.app.Activity;
import android.os.Bundle;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.TextView;

import com.leo.stock.R;
import com.leo.stock.library.util.FloatUtil;
import com.leo.stock.module.email.Config;
import com.leo.stock.module.monitor.Settings;
import com.leo.stock.module.monitor.SpUtil;

/**
 * Created by Leo on 2020/3/26.
 */
public class SettingActivity extends Activity {

    EditText editTextRefresh, editTextEmailAuthCode, editTextSoundCount, editTextHighAlarm, editTextLowAlarm, editTextAlarmInterval, editTextEndTime;
    CheckBox checkBoxEmail, checkBoxSound, checkBoxNotify;
    EditText editTextFtpHost, EditTextFtpUser, EditTextFtpPwd;
    TextView tvVersion;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_setting);

        tvVersion = findViewById(R.id.tv_version);
        tvVersion.setText(Config.TIME);

        checkBoxEmail = findViewById(R.id.cbx_email);
        checkBoxEmail.setChecked(Settings.isEmailAlarmEnable(this));

        checkBoxSound = findViewById(R.id.cbx_sound);
        checkBoxSound.setChecked(Settings.isSoundAlarmEnable(this));

        checkBoxNotify = findViewById(R.id.cbx_notify);
        checkBoxNotify.setChecked(Settings.isNotifyAlarmEnable(this));

        editTextHighAlarm = findViewById(R.id.edit_high);
        editTextHighAlarm.setText("" + Settings.getPriceHighAlarmInterval(this));

        editTextLowAlarm = findViewById(R.id.edit_low);
        editTextLowAlarm.setText("" + Settings.getPriceLowAlarmInterval(this));

        editTextRefresh = findViewById(R.id.edit_refresh);
        editTextRefresh.setText("" + Settings.getRefreshInterval(this));

        editTextSoundCount = findViewById(R.id.edit_sound);
        editTextSoundCount.setText("" + Settings.soundAlarmCount(this));

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

        editTextEndTime = findViewById(R.id.edit_end_time);
        editTextEndTime.setText("" + Settings.getEndTime(this));
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

        SpUtil.putInt(this, "edit_end_time", Integer.parseInt(editTextEndTime.getText().toString().trim()));
        super.onDestroy();
    }
}
