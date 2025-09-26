// 雪球消息监控助手 - 后台脚本
class XueqiuMonitor {
  constructor() {
    this.isMonitoring = true;
    this.followListEnabled = true;
    this.systemMessageEnabled = true;
    this.lastFollowContent = new Set();
    this.lastSystemMessageCount = 0;
    this.monitorInterval = null;
    this.activeTabId = null;
    
    this.init();
  }
  
  init() {
    // 启动监控
    this.startMonitoring();
    
    // 监听标签页切换
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo.tabId);
    });
    
    // 监听标签页更新
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && tab.url.includes('xueqiu.com')) {
        this.activeTabId = tabId;
      }
    });
    
    // 监听来自content script的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
    
    // 监听通知点击
    chrome.notifications.onClicked.addListener((notificationId) => {
      this.handleNotificationClick(notificationId);
    });
  }
  
  async handleTabActivated(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url && tab.url.includes('xueqiu.com')) {
        this.activeTabId = tabId;
        // 从其他页面切换回雪球页面时刷新
        // setTimeout(() => {
        //   chrome.tabs.reload(tabId);
        // }, 500);
      }
    } catch (error) {
      console.log('Tab activation error:', error);
    }
  }
  
  startMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    // 每3秒检查一次
    this.monitorInterval = setInterval(() => {
      this.checkForUpdates();
    }, 3000);
    
    // 更新图标状态
    this.updateIcon('monitoring');
  }
  
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.updateIcon('stopped');
  }
  
  async checkForUpdates() {
    if (!this.isMonitoring) return;
    
    try {
      // 查找雪球标签页
      const tabs = await chrome.tabs.query({ url: 'https://xueqiu.com/*' });
      if (tabs.length === 0) return;
      
      const xueqiuTab = tabs[0];
      this.activeTabId = xueqiuTab.id;
      
      // 向content script发送检查请求
      chrome.tabs.sendMessage(xueqiuTab.id, { 
        action: 'checkUpdates',
        followListEnabled: this.followListEnabled,
        systemMessageEnabled: this.systemMessageEnabled
      }).catch(error => {
        console.log('Message send error:', error);
      });
      
    } catch (error) {
      console.log('Check updates error:', error);
      this.updateIcon('error');
    }
  }
  
  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'followListUpdate':
        if (this.followListEnabled) {
          this.handleFollowListUpdate(message.data);
        }
        break;
        
      case 'systemMessageUpdate':
        if (this.systemMessageEnabled) {
          this.handleSystemMessageUpdate(message.data);
        }
        break;
        
      case 'getSettings':
        sendResponse({
          isMonitoring: this.isMonitoring,
          followListEnabled: this.followListEnabled,
          systemMessageEnabled: this.systemMessageEnabled
        });
        break;
        
      case 'updateSettings':
        this.updateSettings(message.settings);
        sendResponse({ success: true });
        break;
    }
  }
  
  handleFollowListUpdate(data) {
    const { newContent } = data;
    
    newContent.forEach(content => {
      const contentId = content.id || content.text;
      if (!this.lastFollowContent.has(contentId)) {
        this.lastFollowContent.add(contentId);
        this.showNotification('followList', content.text);
      }
    });
  }
  
  handleSystemMessageUpdate(data) {
    const { count } = data;
    
    if (count > this.lastSystemMessageCount) {
      const newMessages = count - this.lastSystemMessageCount;
      this.lastSystemMessageCount = count;
      this.showNotification('systemMessage', newMessages);
    }
  }
  
  showNotification(type, content) {
    let title, message, notificationId;
    
    if (type === 'followList') {
      title = '雪球 - 关注列表更新';
      message = content.length > 20 ? content.substring(0, 20) + '...' : content;
      notificationId = 'followList_' + Date.now();
    } else if (type === 'systemMessage') {
      title = '雪球 - 系统消息';
      message = `您有 ${content} 条新的系统消息`;
      notificationId = 'systemMessage_' + Date.now();
    }
    
    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon.png',
      title: title,
      message: message,
      priority: 2
    });
  }
  
  handleNotificationClick(notificationId) {
    if (notificationId.startsWith('followList_')) {
      this.openXueqiuPage('https://xueqiu.com/');
    } else if (notificationId.startsWith('systemMessage_')) {
      this.openXueqiuPage('https://xueqiu.com/messages');
    }
    
    chrome.notifications.clear(notificationId);
  }
  
  async openXueqiuPage(url) {
    try {
      // 查找现有的雪球标签页
      const tabs = await chrome.tabs.query({ url: 'https://xueqiu.com/*' });
      
      if (tabs.length > 0) {
        // 激活现有标签页并导航到指定URL
        await chrome.tabs.update(tabs[0].id, { active: true, url: url });
        await chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        // 创建新标签页
        await chrome.tabs.create({ url: url });
      }
    } catch (error) {
      console.log('Open page error:', error);
    }
  }
  
  updateSettings(settings) {
    if (settings.hasOwnProperty('isMonitoring')) {
      this.isMonitoring = settings.isMonitoring;
      if (this.isMonitoring) {
        this.startMonitoring();
      } else {
        this.stopMonitoring();
      }
    }
    
    if (settings.hasOwnProperty('followListEnabled')) {
      this.followListEnabled = settings.followListEnabled;
    }
    
    if (settings.hasOwnProperty('systemMessageEnabled')) {
      this.systemMessageEnabled = settings.systemMessageEnabled;
    }
  }
  
  updateIcon(status) {
    let iconPath;
    let title;
    
    switch (status) {
      case 'monitoring':
        iconPath = 'icons/icon.png'; // 绿色图标
        title = '雪球监控助手 - 正常监控中';
        break;
      case 'stopped':
        iconPath = 'icons/icon.png'; // 灰色图标
        title = '雪球监控助手 - 监控已暂停';
        break;
      case 'error':
        iconPath = 'icons/icon.png'; // 红色图标
        title = '雪球监控助手 - 连接异常';
        break;
    }
    
    // chrome.action.setIcon({ path: iconPath });
    chrome.action.setTitle({ title: title });
  }
}

// 初始化监控器
const monitor = new XueqiuMonitor();