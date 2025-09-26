// 雪球监控助手 - 选项页面脚本
document.addEventListener('DOMContentLoaded', function() {
  const masterSwitch = document.getElementById('masterSwitch');
  const followListSwitch = document.getElementById('followListSwitch');
  const systemMessageSwitch = document.getElementById('systemMessageSwitch');
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
        
        updateStatus(response.isMonitoring);
        updateSwitchStates(response.isMonitoring);
      }
    });
  }
  
  function handleSettingChange() {
    const isMonitoring = masterSwitch.checked;
    updateStatus(isMonitoring);
    updateSwitchStates(isMonitoring);
    
    // 实时保存设置
    saveSettings();
  }
  
  function saveSettings() {
    const settings = {
      isMonitoring: masterSwitch.checked,
      followListEnabled: followListSwitch.checked,
      systemMessageEnabled: systemMessageSwitch.checked
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
  
  function updateStatus(isMonitoring) {
    if (isMonitoring) {
      statusIndicator.className = 'status-indicator monitoring';
      statusText.textContent = '正常监控中 - 每3秒检查一次更新';
    } else {
      statusIndicator.className = 'status-indicator stopped';
      statusText.textContent = '监控已暂停 - 不会接收任何通知';
    }
  }
  
  function updateSwitchStates(masterEnabled) {
    followListSwitch.disabled = !masterEnabled;
    systemMessageSwitch.disabled = !masterEnabled;
    
    const followListItem = followListSwitch.closest('.setting-item');
    const systemMessageItem = systemMessageSwitch.closest('.setting-item');
    
    if (!masterEnabled) {
      followListItem.style.opacity = '0.5';
      systemMessageItem.style.opacity = '0.5';
    } else {
      followListItem.style.opacity = '1';
      systemMessageItem.style.opacity = '1';
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