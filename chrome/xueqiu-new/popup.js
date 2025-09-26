// 雪球监控助手 - 弹出窗口脚本
document.addEventListener('DOMContentLoaded', function() {
  const masterSwitch = document.getElementById('masterSwitch');
  const followListSwitch = document.getElementById('followListSwitch');
  const systemMessageSwitch = document.getElementById('systemMessageSwitch');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const openXueqiuBtn = document.getElementById('openXueqiu');
  const openOptionsBtn = document.getElementById('openSettings');
  
  // 加载当前设置
  loadSettings();
  
  // 绑定事件监听器
  masterSwitch.addEventListener('change', handleMasterSwitchChange);
  followListSwitch.addEventListener('change', handleFollowListSwitchChange);
  systemMessageSwitch.addEventListener('change', handleSystemMessageSwitchChange);
  openXueqiuBtn.addEventListener('click', openXueqiu);
  openOptionsBtn.addEventListener('click', openOptions);
  
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
  
  function handleMasterSwitchChange() {
    const isEnabled = masterSwitch.checked;
    
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: { isMonitoring: isEnabled }
    }, (response) => {
      if (response && response.success) {
        updateStatus(isEnabled);
        updateSwitchStates(isEnabled);
      }
    });
  }
  
  function handleFollowListSwitchChange() {
    const isEnabled = followListSwitch.checked;
    
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: { followListEnabled: isEnabled }
    });
  }
  
  function handleSystemMessageSwitchChange() {
    const isEnabled = systemMessageSwitch.checked;
    
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: { systemMessageEnabled: isEnabled }
    });
  }
  
  function updateStatus(isMonitoring) {
    if (isMonitoring) {
      statusIndicator.className = 'status-indicator monitoring';
    } else {
      statusIndicator.className = 'status-indicator stopped';
    }
  }
  
  function updateSwitchStates(masterEnabled) {
    followListSwitch.disabled = !masterEnabled;
    systemMessageSwitch.disabled = !masterEnabled;
    
    const followListLabel = document.getElementById('followListLabel');
    const systemMessageLabel = document.getElementById('systemMessageLabel');
    
    if (!masterEnabled) {
      followListLabel.className = 'control-label disabled';
      systemMessageLabel.className = 'control-label disabled';
      followListSwitch.parentElement.querySelector('.slider').classList.add('disabled');
      systemMessageSwitch.parentElement.querySelector('.slider').classList.add('disabled');
    } else {
      followListLabel.className = 'control-label';
      systemMessageLabel.className = 'control-label';
      followListSwitch.parentElement.querySelector('.slider').classList.remove('disabled');
      systemMessageSwitch.parentElement.querySelector('.slider').classList.remove('disabled');
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