// 雪球监控助手 - 选项页面脚本
document.addEventListener('DOMContentLoaded', function() {
  const masterSwitch = document.getElementById('masterSwitch');
  const followListSwitch = document.getElementById('followListSwitch');
  const systemMessageSwitch = document.getElementById('systemMessageSwitch');
  const monitorInterval = document.getElementById('monitorInterval');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');
  const openXueqiuBtn = document.getElementById('openXueqiu');
  
  // 加载当前设置
  loadSettings();
  
  // 绑定事件监听器
  masterSwitch.addEventListener('change', handleSettingChange);
  followListSwitch.addEventListener('change', handleSettingChange);
  systemMessageSwitch.addEventListener('change', handleSettingChange);
  monitorInterval.addEventListener('change', handleSettingChange);
  monitorInterval.addEventListener('input', handleIntervalInput);
  saveBtn.addEventListener('click', saveSettings);
  openXueqiuBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://xueqiu.com/' });
  });
  
  function loadSettings() {
    // 从background script获取当前设置
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (response) {
        masterSwitch.checked = response.isMonitoring;
        followListSwitch.checked = response.followListEnabled;
        systemMessageSwitch.checked = response.systemMessageEnabled;
        monitorInterval.value = response.monitorInterval || 10;
        
        updateStatus(response.isMonitoring, response.monitorInterval || 10);
        updateSwitchStates(response.isMonitoring);
      }
    });
  }
  
  function handleSettingChange() {
    const isMonitoring = masterSwitch.checked;
    const interval = parseInt(monitorInterval.value) || 10;
    updateStatus(isMonitoring, interval);
    updateSwitchStates(isMonitoring);
    
    // 实时保存设置
    saveSettings();
  }
  
  function saveSettings() {
    const settings = {
      isMonitoring: masterSwitch.checked,
      followListEnabled: followListSwitch.checked,
      systemMessageEnabled: systemMessageSwitch.checked,
      monitorInterval: parseInt(monitorInterval.value) || 10
    };
    
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings
    }, (response) => {
      if (response && response.success) {
        showSaveStatus();
      }
    });
  }
  
  function updateStatus(isMonitoring, interval = 10) {
    if (isMonitoring) {
      statusIndicator.className = 'status-indicator monitoring';
      statusText.textContent = `正常监控中 - 每${interval}秒检查一次更新`;
    } else {
      statusIndicator.className = 'status-indicator stopped';
      statusText.textContent = '监控已暂停 - 不会接收任何通知';
    }
  }
  
  function updateSwitchStates(masterEnabled) {
    followListSwitch.disabled = !masterEnabled;
    systemMessageSwitch.disabled = !masterEnabled;
    monitorInterval.disabled = !masterEnabled;
    
    const followListItem = followListSwitch.closest('.setting-item');
    const systemMessageItem = systemMessageSwitch.closest('.setting-item');
    const intervalItem = monitorInterval.closest('.setting-item');
    
    if (!masterEnabled) {
      followListItem.style.opacity = '0.5';
      systemMessageItem.style.opacity = '0.5';
      intervalItem.style.opacity = '0.5';
    } else {
      followListItem.style.opacity = '1';
      systemMessageItem.style.opacity = '1';
      intervalItem.style.opacity = '1';
    }
  }

  function handleIntervalInput() {
    let value = parseInt(monitorInterval.value);
    
    // 输入验证：确保值在1-60之间
    if (isNaN(value) || value < 1) {
      monitorInterval.value = 1;
    } else if (value > 60) {
      monitorInterval.value = 60;
    }
    
    // 实时更新状态显示
    if (masterSwitch.checked) {
      const interval = parseInt(monitorInterval.value) || 10;
      updateStatus(true, interval);
    }
  }
  
  function showSaveStatus() {
    saveStatus.className = 'save-status success';
    saveStatus.style.display = 'block';
    
    setTimeout(() => {
      saveStatus.style.display = 'none';
    }, 2000);
  }
});