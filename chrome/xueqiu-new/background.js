// 雪球消息监控助手 - 后台脚本 (重构版)

// 时间戳格式化函数
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

class XueqiuMonitor {
  constructor() {
    // 默认设置
    this.defaultSettings = {
      isMonitoring: true,
      followListEnabled: true,
      systemMessageEnabled: true,
      monitorInterval: 10
    };
    
    // 运行时状态
    this.lastTopContent = null; // 存储上次检查的最新一条内容的时间
    this.lastSystemMessageCount = 0;
    this.activeTabId = null;
    this.isInitialized = false;
    
    // 监控配置
    this.ALARM_NAME = 'xueqiu_monitor';
    
    this.init();
  }
  
  async init() {
    console.log(`[${getTimestamp()}] 雪球监控助手启动...`);
    
    // 检查并刷新雪球页面以实现注入
    await this.refreshXueqiuTabs();
    
    // 从存储中恢复设置
    await this.loadSettings();
    
    // 监听Service Worker启动事件
    chrome.runtime.onStartup.addListener(() => {
      console.log(`[${getTimestamp()}] Service Worker重启，恢复监控状态`);
      this.handleServiceWorkerRestart();
    });
    
    // 监听插件安装/启用事件
    chrome.runtime.onInstalled.addListener(() => {
      console.log(`[${getTimestamp()}] 插件安装/更新，初始化监控`);
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
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === this.ALARM_NAME) {
        console.log(`[${getTimestamp()}] [DEBUG] ===== Alarm 事件触发 =====`);
        console.log(`[${getTimestamp()}] [DEBUG] Alarm 名称:`, alarm.name, '期望名称:', this.ALARM_NAME);
        console.log(`[${getTimestamp()}] [DEBUG] Alarm 时间:`, new Date().toLocaleTimeString());
        
        // 执行检查更新
        console.log(`[${getTimestamp()}] [DEBUG] 匹配的alarm，开始执行checkForUpdates...`);
        await this.checkForUpdates();
      } else {
        console.log(`[${getTimestamp()}] [DEBUG] 不匹配的alarm，忽略`);
      }
    });
    
    // 初始化完成后，根据设置启动监控
    await this.handleServiceWorkerRestart();
    this.isInitialized = true;
    console.log(`[${getTimestamp()}] XueqiuMonitor初始化完成`);
  }
  
  // 从存储中加载设置
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['xueqiu_settings']);
      if (result.xueqiu_settings) {
        this.settings = { ...this.defaultSettings, ...result.xueqiu_settings };
        console.log(`[${getTimestamp()}] 设置已保存:`, this.settings);
      } else {
        this.settings = { ...this.defaultSettings };
        await this.saveSettings();
        console.log(`[${getTimestamp()}] 使用默认设置并保存`);
      }
    } catch (error) {
      console.error(`[${getTimestamp()}] 加载设置失败:`, error);
      this.settings = { ...this.defaultSettings };
    }
  }
  
  // 保存设置到存储
  async saveSettings() {
    try {
      await chrome.storage.local.set({ xueqiu_settings: this.settings });
      console.log(`[${getTimestamp()}] 设置已保存:`, this.settings);
    } catch (error) {
      console.error(`[${getTimestamp()}] 保存设置失败:`, error);
    }
  }
  
  // 处理Service Worker重启
  // 检查并刷新雪球页面以实现注入
  async refreshXueqiuTabs() {
    try {
      console.log(`[${getTimestamp()}] 检查浏览器中的雪球页面...`);
      
      // 查找所有雪球页面
      const tabs = await chrome.tabs.query({ url: 'https://xueqiu.com/*' });
      
      if (tabs.length === 0) {
        console.log(`[${getTimestamp()}] 未找到雪球页面，无需刷新`);
        return;
      }
      
      console.log(`[${getTimestamp()}] 找到 ${tabs.length} 个雪球页面，开始刷新以实现注入...`);
      
      // 刷新所有雪球页面
      for (const tab of tabs) {
        try {
          console.log(`[${getTimestamp()}] 刷新雪球页面: ${tab.url} (Tab ID: ${tab.id})`);
          await chrome.tabs.reload(tab.id);
        } catch (error) {
          console.log(`[${getTimestamp()}] 刷新页面失败 (Tab ID: ${tab.id}):`, error.message);
        }
      }
      
      console.log(`[${getTimestamp()}] 雪球页面刷新完成`);
    } catch (error) {
      console.error(`[${getTimestamp()}] 检查和刷新雪球页面时出错:`, error);
    }
  }

  async handleServiceWorkerRestart() {
    await this.loadSettings();
    
    if (this.settings.isMonitoring) {
      await this.startMonitoring();
      console.log(`[${getTimestamp()}] 监控服务已恢复`);
    } else {
      await this.stopMonitoring();
      console.log(`[${getTimestamp()}] 监控服务保持关闭状态`);
    }
  }
  
  async handleTabActivated(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url && tab.url.includes('xueqiu.com')) {
        this.activeTabId = tabId;
        
        // 如果监控已启用但alarm不存在，重新启动监控
        if (this.settings.isMonitoring) {
          const alarm = await chrome.alarms.get(this.ALARM_NAME);
          if (!alarm) {
            console.log(`[${getTimestamp()}] 检测到雪球页面激活，恢复监控服务`);
            await this.startMonitoring();
          }
        }
        
        // 注意：页面切换刷新功能已被注释，如需要可以取消注释
        // setTimeout(() => {
        //   chrome.tabs.reload(tabId);
        // }, 500);
      }
    } catch (error) {
      console.log(`[${getTimestamp()}] Tab activation error:`, error);
    }
  }
  
  async startMonitoring() {
    // 清除现有的alarm
    await chrome.alarms.clear(this.ALARM_NAME);
    
    // 检查是否有雪球页面打开
    const tabs = await chrome.tabs.query({ url: 'https://xueqiu.com/*' });
    if (tabs.length === 0) {
      console.log(`[${getTimestamp()}] 未找到雪球页面，监控服务将在有雪球页面时自动启动`);
      this.settings.isMonitoring = true;
      await this.saveSettings();
      this.updateIcon('waiting'); // 使用等待状态图标
      return;
    }
    
    // 创建新的alarm，使用设置的监控间隔
    // 延迟5秒开始，确保content script有足够时间完成初始化
    const intervalMinutes = (this.settings.monitorInterval || 10) / 60; // 转换为分钟
    await chrome.alarms.create(this.ALARM_NAME, {
      delayInMinutes: 0.083, // 5秒后开始 (5秒 = 0.083分钟)
      periodInMinutes: intervalMinutes // 使用设置的监控间隔
    });
    
    this.settings.isMonitoring = true;
    await this.saveSettings();
    this.updateIcon('monitoring');
    console.log(`[${getTimestamp()}] 监控服务已启动`);
  }
  
  async stopMonitoring() {
    // 清除alarm
    await chrome.alarms.clear(this.ALARM_NAME);
    
    this.settings.isMonitoring = false;
    await this.saveSettings();
    this.updateIcon('stopped');
    console.log(`[${getTimestamp()}] 监控服务已停止`);
  }
  
  async checkForUpdates() {
    console.log(`[${getTimestamp()}] [DEBUG] ===== Background checkForUpdates 开始 =====`);
    console.log(`[${getTimestamp()}] [DEBUG] 当前时间:`, new Date().toLocaleTimeString());
    console.log(`[${getTimestamp()}] [DEBUG] 监控状态:`, this.settings.isMonitoring);
    console.log(`[${getTimestamp()}] [DEBUG] 设置 - followListEnabled:`, this.settings.followListEnabled, 'systemMessageEnabled:', this.settings.systemMessageEnabled);
    
    if (!this.settings.isMonitoring) {
      console.log(`[${getTimestamp()}] [DEBUG] 监控已禁用，跳过检查`);
      return;
    }
    
    try {
      // 查找雪球标签页
      const tabs = await chrome.tabs.query({ url: 'https://xueqiu.com/*' });
      console.log(`[${getTimestamp()}] [DEBUG] 找到`, tabs.length, '个雪球标签页');
      
      if (tabs.length === 0) {
        console.log(`[${getTimestamp()}] [DEBUG] 未找到雪球标签页，暂停监控`);
        this.updateIcon('waiting');
        // 暂停alarm，避免无意义的检查
        await chrome.alarms.clear(this.ALARM_NAME);
        return;
      }
      
      const xueqiuTab = tabs[0];
      this.activeTabId = xueqiuTab.id;
      console.log(`[${getTimestamp()}] [DEBUG] 选择的标签页 ID:`, xueqiuTab.id, '状态:', xueqiuTab.status, '活动:', xueqiuTab.active);
      
      // 检查标签页是否处于活动状态和完全加载
      if (xueqiuTab.status !== 'complete') {
        console.log(`[${getTimestamp()}] [DEBUG] 雪球页面还在加载中，跳过本次检查`);
        return;
      }
      
      console.log(`[${getTimestamp()}] [DEBUG] 准备发送消息到content script...`);
      
      // 发送消息到content script
      const success = await this.sendMessageWithRetry(xueqiuTab.id, {
        action: 'checkForUpdates',
        settings: this.settings
      });
      
      console.log(`[${getTimestamp()}] [DEBUG] 消息发送结果:`, success);
      
      if (!success) {
        // 如果消息发送失败，可能需要重新注入content script
        console.log(`[${getTimestamp()}] [DEBUG] Content script通信失败，可能需要刷新页面`);
        this.updateIcon('error');
      }
    } catch (error) {
      console.log(`[${getTimestamp()}] [DEBUG] 检查更新时出错:`, error);
      this.updateIcon('error');
    }
    
    console.log(`[${getTimestamp()}] [DEBUG] ===== Background checkForUpdates 结束 =====`);
  }

  async sendMessageWithRetry(tabId, message, maxRetries = 3, delay = 1000) {
    let contentScriptExists = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 首先检查content script是否存在并就绪
        const pingResponse = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        contentScriptExists = true;
        
        if (pingResponse && pingResponse.success) {
          if (pingResponse.ready) {
            // Content script已就绪，发送实际消息
            await chrome.tabs.sendMessage(tabId, message);
            if (attempt > 1) {
              console.log(`[${getTimestamp()}] 消息发送成功 (重试${attempt-1}次后)`);
            }
            return true;
          } else {
            // Content script存在但尚未初始化完成
            if (attempt === 1) {
              console.log(`[${getTimestamp()}] Content script正在初始化，等待就绪...`);
            }
            if (attempt < maxRetries) {
              await this.sleep(delay);
              continue;
            }
          }
        }
        
      } catch (error) {
        if (attempt === maxRetries) {
          if (contentScriptExists) {
            console.warn(`[${getTimestamp()}] Content script存在但消息发送失败: ${error.message}`);
         } else {
           console.warn(`[${getTimestamp()}] Content script未加载或页面未准备好: ${error.message}`);
          }
          return false;
        } else {
          // 只在第一次失败时记录详细错误，避免重复日志
          if (attempt === 1 && error.message.includes('Could not establish connection')) {
            console.log(`[${getTimestamp()}] Content script未就绪，将重试 ${maxRetries-1} 次`);
          }
          await this.sleep(delay);
        }
      }
    }
    return false;
  }



  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      console.error(`[${getTimestamp()}] 处理消息时出错:`, error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // 触发DOM调试
  async triggerDOMDebug(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'debugDOM' });
    } catch (error) {
      console.error(`[${getTimestamp()}] 触发DOM调试失败:`, error);
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
      console.error(`[${getTimestamp()}] 触发手动检查失败:`, error);
    }
  }
  
  handleFollowListUpdate(data) {
    const { newContent } = data;
    
    console.log(`[${getTimestamp()}] [DEBUG] ===== handleFollowListUpdate 开始 =====`);
     console.log(`[${getTimestamp()}] [DEBUG] 接收到的关注列表数据:`, newContent);
    
    // 如果没有内容，直接返回
    if (!newContent || newContent.length === 0) {
      console.log(`[${getTimestamp()}] [DEBUG] 没有关注列表内容，跳过处理`);
      return;
    }
    
    // 获取最新的一条内容（数组第一个元素应该是最新的）
    const currentTopContent = newContent[0];
    const currentTopTime = currentTopContent.time;
    
    console.log('[DEBUG] 当前最新内容完整信息:', currentTopContent);
    console.log('[DEBUG] 当前最新内容时间:', currentTopTime);
    console.log('[DEBUG] 上次记录的最新时间:', this.lastTopContent);
    
    // 如果是第一次检查，只记录不发送通知
    if (this.lastTopContent === null) {
      this.lastTopContent = currentTopTime;
      console.log('[DEBUG] 首次检查，记录最新时间但不发送通知:', currentTopTime);
      return;
    }
    
    // 比较最新内容的时间是否发生变化
    if (currentTopTime !== this.lastTopContent) {
      console.log('[DEBUG] 检测到最新内容时间发生变化，发送通知');
      console.log('[DEBUG] 新时间:', currentTopTime, '旧时间:', this.lastTopContent);
      this.lastTopContent = currentTopTime;
      this.showNotification('followList', currentTopContent.content || '新动态');
    } else {
      console.log('[DEBUG] 最新内容时间无变化，不发送通知');
    }
    
    console.log('[DEBUG] ===== handleFollowListUpdate 结束 =====');
  }
  
  async handleSystemMessageUpdate(data) {
    console.log('[DEBUG] ===== handleSystemMessageUpdate 开始 =====');
    console.log('[DEBUG] 接收到的数据:', data);
    
    const { count } = data;
    console.log('[DEBUG] 当前系统消息数量:', count, '上次记录数量:', this.lastSystemMessageCount);
    
    if (count > this.lastSystemMessageCount) {
      const newMessages = count - this.lastSystemMessageCount;
      console.log('[DEBUG] 发现', newMessages, '条新系统消息，准备发送通知');
      this.lastSystemMessageCount = count;
      this.showNotification('systemMessage', newMessages);
    } else {
      console.log('[DEBUG] 系统消息数量无变化或减少，不发送通知');
    }
    
    console.log('[DEBUG] ===== handleSystemMessageUpdate 结束 =====');
  }
  
  showNotification(type, content) {
    let title, message, notificationId;
    
    if (type === 'followList') {
      title = '雪球 - 关注列表更新';
      const contentText = content || '新动态';
      message = contentText.length > 20 ? contentText.substring(0, 20) + '...' : contentText;
      notificationId = 'followList_' + Date.now();
    } else if (type === 'systemMessage') {
      title = '雪球 - 系统消息';
      message = `您有 ${content} 条新的系统消息`;
      notificationId = 'systemMessage_' + Date.now();
    }
    
    // 临时注释掉通知发送，用于调试
    console.log(`[${getTimestamp()}] 应该发送通知: ${title} - ${message}`);
    /*
    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon.png',
      title: title,
      message: message,
      priority: 2
    });
    */
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
    const oldMonitorInterval = this.settings.monitorInterval;
    
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
    // 如果监控时间间隔发生变化且监控正在运行，重新启动监控以应用新的间隔
    else if (this.settings.isMonitoring && this.settings.monitorInterval !== oldMonitorInterval) {
      console.log(`监控时间间隔已从 ${oldMonitorInterval} 秒更改为 ${this.settings.monitorInterval} 秒，重新启动监控...`);
      await this.startMonitoring(); // 重新启动监控以应用新的时间间隔
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
      case 'waiting':
        iconPath = 'icons/icon.png'; // 可以后续添加黄色图标
        title = '雪球监控助手 - 等待雪球页面';
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