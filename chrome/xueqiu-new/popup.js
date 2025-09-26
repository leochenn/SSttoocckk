// 雪球监控助手 - 弹出窗口脚本
document.addEventListener('DOMContentLoaded', function() {
  const followListSwitch = document.getElementById('followListSwitch');
  const systemMessageSwitch = document.getElementById('systemMessageSwitch');
  const monitorInterval = document.getElementById('monitorInterval');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const frequencyDisplay = document.getElementById('frequencyDisplay');
  const openXueqiuBtn = document.getElementById('openXueqiu');
  const openOptionsBtn = document.getElementById('openSettings');
  
  // 加载当前设置
  loadSettings();
  
  // 绑定事件监听器
  followListSwitch.addEventListener('change', handleNotificationSwitchChange);
  systemMessageSwitch.addEventListener('change', handleNotificationSwitchChange);
  monitorInterval.addEventListener('change', handleIntervalChange);
  monitorInterval.addEventListener('input', handleIntervalInput);
  openXueqiuBtn.addEventListener('click', openXueqiu);
  openOptionsBtn.addEventListener('click', openOptions);
  
  function loadSettings() {
    // 从background script获取当前设置
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (response) {
        followListSwitch.checked = response.followListEnabled;
        systemMessageSwitch.checked = response.systemMessageEnabled;
        monitorInterval.value = response.monitorInterval || 10;
        
        // 根据两个通知开关状态确定监控状态
        const isMonitoring = response.followListEnabled || response.systemMessageEnabled;
        updateStatus(isMonitoring);
        updateFrequencyDisplay(response.monitorInterval || 10);
      }
    });
  }
  
  function handleNotificationSwitchChange() {
    const followListEnabled = followListSwitch.checked;
    const systemMessageEnabled = systemMessageSwitch.checked;
    const isMonitoring = followListEnabled || systemMessageEnabled;
    
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: { 
        followListEnabled: followListEnabled,
        systemMessageEnabled: systemMessageEnabled,
        isMonitoring: isMonitoring
      }
    }, (response) => {
      if (response && response.success) {
        updateStatus(isMonitoring);
      }
    });
  }
  
  function updateStatus(isMonitoring) {
    if (isMonitoring) {
      statusIndicator.className = 'status-indicator monitoring';
    } else {
      statusIndicator.className = 'status-indicator stopped';
    }
  }
  

  
  function openXueqiu() {
    chrome.tabs.create({ url: 'https://xueqiu.com/' });
    window.close();
  }
  
  function handleIntervalChange() {
    const interval = parseInt(monitorInterval.value) || 10;
    
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: { monitorInterval: interval }
    }, (response) => {
      if (response && response.success) {
        updateFrequencyDisplay(interval);
      }
    });
  }
  
  function handleIntervalInput() {
    let value = parseInt(monitorInterval.value);
    
    if (isNaN(value) || value < 1) {
      monitorInterval.value = 1;
    } else if (value > 60) {
      monitorInterval.value = 60;
    }
    
    updateFrequencyDisplay(parseInt(monitorInterval.value) || 10);
  }
  
  function updateFrequencyDisplay(interval) {
    if (frequencyDisplay) {
      frequencyDisplay.textContent = `${interval}秒/次`;
    }
  }

  function openXueqiu() {
    chrome.tabs.create({ url: 'https://xueqiu.com/' });
    window.close();
  }

  function openOptions() {
    chrome.runtime.openOptionsPage();
    window.close();
  }
});