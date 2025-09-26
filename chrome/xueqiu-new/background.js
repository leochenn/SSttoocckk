// 雪球消息监控助手 - 后台脚本 (重构版)
class XueqiuMonitor {
  constructor() {
    // 默认设置
    this.defaultSettings = {
      isMonitoring: true,
      followListEnabled: true,
      systemMessageEnabled: true
    };
    
    // 运行时状态
    this.lastFollowContent = new Set();
    this.lastSystemMessageCount = 0;
    this.activeTabId = null;
    this.isInitialized = false;
    
    // 监控配置
    this.ALARM_NAME = 'xueqiu_monitor';
    this.CHECK_INTERVAL = 3; // 3秒检查一次
    
    this.init();
  }
  
  async init() {
    console.log('雪球监控助手启动...');
    
    // 从存储中恢复设置
    await this.loadSettings();
    
    // 监听Service Worker启动事件
    chrome.runtime.onStartup.addListener(() => {
      console.log('Service Worker重启，恢复监控状态');
      this.handleServiceWorkerRestart();
    });
    
    // 监听插件安装/启用事件
    chrome.runtime.onInstalled.addListener(() => {
      console.log('插件安装/更新，初始化监控');
      this.handleServiceWorkerRestart();
    });
    
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
      return true; // 保持消息通道开放
    });
    
    // 监听通知点击
    chrome.notifications.onClicked.addListener((notificationId) => {
      this.handleNotificationClick(notificationId);
    });
    
    // 监听alarm事件
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === this.ALARM_NAME) {
        this.checkForUpdates();
      }
    });
    
    // 初始化完成后，根据设置启动监控
    await this.handleServiceWorkerRestart();
    this.isInitialized = true;
    console.log('雪球监控助手初始化完成');
  }
  
  // 从存储中加载设置
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['xueqiu_settings']);
      if (result.xueqiu_settings) {
        this.settings = { ...this.defaultSettings, ...result.xueqiu_settings };
        console.log('已加载保存的设置:', this.settings);
      } else {
        this.settings = { ...this.defaultSettings };
        await this.saveSettings();
        console.log('使用默认设置并保存');
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      this.settings = { ...this.defaultSettings };
    }
  }
  
  // 保存设置到存储
  async saveSettings() {
    try {
      await chrome.storage.local.set({ xueqiu_settings: this.settings });
      console.log('设置已保存:', this.settings);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }
  
  // 处理Service Worker重启
  async handleServiceWorkerRestart() {
    await this.loadSettings();
    
    if (this.settings.isMonitoring) {
      await this.startMonitoring();
      console.log('监控服务已恢复');
    } else {
      await this.stopMonitoring();
      console.log('监控服务保持关闭状态');
    }
  }
  
  async handleTabActivated(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url && tab.url.includes('xueqiu.com')) {
        this.activeTabId = tabId;
        // 注意：页面切换刷新功能已被注释，如需要可以取消注释
        // setTimeout(() => {
        //   chrome.tabs.reload(tabId);
        // }, 500);
      }
    } catch (error) {
      console.log('Tab activation error:', error);
    }
  }
  
  async startMonitoring() {
    // 清除现有的alarm
    await chrome.alarms.clear(this.ALARM_NAME);
    
    // 创建新的alarm，每3秒触发一次
    await chrome.alarms.create(this.ALARM_NAME, {
      delayInMinutes: 0.05, // 立即开始 (3秒 = 0.05分钟)
      periodInMinutes: 0.05 // 每3秒重复
    });
    
    this.settings.isMonitoring = true;
    await this.saveSettings();
    this.updateIcon('monitoring');
    console.log('监控服务已启动');
  }
  
  async stopMonitoring() {
    // 清除alarm
    await chrome.alarms.clear(this.ALARM_NAME);
    
    this.settings.isMonitoring = false;
    await this.saveSettings();
    this.updateIcon('stopped');
    console.log('监控服务已停止');
  }
  
  async checkForUpdates() {
    if (!this.settings.isMonitoring) {
      console.log('监控已禁用，跳过检查');
      return;
    }
    
    try {
      // 查找雪球标签页
      const tabs = await chrome.tabs.query({ url: 'https://xueqiu.com/*' });
      if (tabs.length === 0) {
        console.log('未找到雪球标签页');
        return;
      }
      
      const xueqiuTab = tabs[0];
      this.activeTabId = xueqiuTab.id;
      
      // 向content script发送检查请求
      try {
        await chrome.tabs.sendMessage(xueqiuTab.id, { 
          action: 'checkUpdates',
          followListEnabled: this.settings.followListEnabled,
          systemMessageEnabled: this.settings.systemMessageEnabled
        });
        
        this.updateIcon('monitoring');
      } catch (messageError) {
        console.log('发送消息失败，可能页面未加载完成:', messageError);
        this.updateIcon('error');
      }
      
    } catch (error) {
      console.log('检查更新时出错:', error);
      this.updateIcon('error');
    }
  }
  
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'followListUpdate':
          if (this.settings.followListEnabled) {
            this.handleFollowListUpdate(message.data);
          }
          break;
          
        case 'systemMessageUpdate':
          if (this.settings.systemMessageEnabled) {
            this.handleSystemMessageUpdate(message.data);
          }
          break;
          
        case 'getSettings':
          sendResponse(this.settings);
          break;
          
        case 'updateSettings':
          await this.updateSettings(message.settings);
          sendResponse({ success: true });
          break;
          
        case 'ping':
          sendResponse({success: true, message: 'pong'});
          return;
          
        case 'testNotification':
          this.showNotification('followList', message.data.message || '这是一条测试通知');
          sendResponse({success: true});
          return;
          
        case 'debugDOM':
          this.triggerDOMDebug(sender.tab.id);
          sendResponse({success: true});
          return;
          
        case 'manualCheck':
          this.triggerManualCheck(sender.tab.id);
          sendResponse({success: true});
          return;
      }
    } catch (error) {
      console.error('处理消息时出错:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // 触发DOM调试
  async triggerDOMDebug(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'debugDOM' });
    } catch (error) {
      console.error('触发DOM调试失败:', error);
    }
  }
  
  // 触发手动检查
  async triggerManualCheck(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { 
        action: 'checkUpdates',
        followListEnabled: this.settings.followListEnabled,
        systemMessageEnabled: this.settings.systemMessageEnabled
      });
    } catch (error) {
      console.error('触发手动检查失败:', error);
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
      console.log('打开页面时出错:', error);
    }
  }
  
  async updateSettings(newSettings) {
    const oldIsMonitoring = this.settings.isMonitoring;
    
    // 更新设置
    this.settings = { ...this.settings, ...newSettings };
    
    // 保存到存储
    await this.saveSettings();
    
    // 如果监控开关状态发生变化，相应地启动或停止监控
    if (this.settings.isMonitoring !== oldIsMonitoring) {
      if (this.settings.isMonitoring) {
        await this.startMonitoring();
      } else {
        await this.stopMonitoring();
      }
    }
    
    console.log('设置已更新:', this.settings);
  }
  
  updateIcon(status) {
    let iconPath;
    let title;
    
    switch (status) {
      case 'monitoring':
        iconPath = 'icons/icon.png'; // 可以后续添加绿色图标
        title = '雪球监控助手 - 正常监控中';
        break;
      case 'stopped':
        iconPath = 'icons/icon.png'; // 可以后续添加灰色图标
        title = '雪球监控助手 - 监控已暂停';
        break;
      case 'error':
        iconPath = 'icons/icon.png'; // 可以后续添加红色图标
        title = '雪球监控助手 - 连接异常';
        break;
    }
    
    chrome.action.setTitle({ title: title });
  }
  
  // 获取监控状态信息（用于调试）
  async getMonitorStatus() {
    const alarms = await chrome.alarms.getAll();
    const hasAlarm = alarms.some(alarm => alarm.name === this.ALARM_NAME);
    
    return {
      isInitialized: this.isInitialized,
      settings: this.settings,
      hasActiveAlarm: hasAlarm,
      activeTabId: this.activeTabId,
      alarmCount: alarms.length
    };
  }
}

// 初始化监控器
const monitor = new XueqiuMonitor();

// 导出监控器实例供调试使用
if (typeof globalThis !== 'undefined') {
  globalThis.xueqiuMonitor = monitor;
}