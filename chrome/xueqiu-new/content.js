// 雪球消息监控助手 - 内容脚本
class XueqiuContentMonitor {
  constructor() {
    this.lastFollowListContent = [];
    this.lastSystemMessageCount = 0;
    this.isInitialized = false;
    
    this.init();
  }
  
  init() {
    // 等待页面完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.initialize(), 2000);
      });
    } else {
      setTimeout(() => this.initialize(), 2000);
    }
    
    // 监听来自background script的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }
  
  initialize() {
    console.log('雪球监控助手已加载');
    this.isInitialized = true;
    
    // 初始化基准数据
    this.updateFollowListBaseline();
    this.updateSystemMessageBaseline();
  }
  
  handleMessage(message, sender, sendResponse) {
    if (message.action === 'checkUpdates') {
      this.checkForUpdates(message);
    }
  }
  
  checkForUpdates(settings) {
    if (!this.isInitialized) {
      this.initialize();
      return;
    }
    
    try {
      // 检查关注列表更新
      if (settings.followListEnabled) {
        this.checkFollowListUpdates();
      }
      
      // 检查系统消息更新
      if (settings.systemMessageEnabled) {
        this.checkSystemMessageUpdates();
      }
    } catch (error) {
      console.log('检查更新时出错:', error);
    }
  }
  
  checkFollowListUpdates() {
    // 尝试多种可能的选择器来找到关注列表
    const possibleSelectors = [
      '.timeline-container .timeline-item',
      '.feed-item',
      '.status-item',
      '[data-type="status"]',
      '.timeline .item',
      '.feed .item'
    ];
    
    let followItems = [];
    
    for (const selector of possibleSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        followItems = Array.from(elements);
        console.log(`找到关注列表元素，使用选择器: ${selector}, 数量: ${elements.length}`);
        break;
      }
    }
    
    if (followItems.length === 0) {
      // 如果没有找到，尝试通过文本内容查找
      const allDivs = document.querySelectorAll('div');
      followItems = Array.from(allDivs).filter(div => {
        const text = div.textContent;
        return text && (
          text.includes('分钟前') || 
          text.includes('小时前') || 
          text.includes('刚刚') ||
          text.includes('今天') ||
          text.includes('昨天')
        );
      });
      
      if (followItems.length > 0) {
        console.log(`通过时间文本找到可能的关注列表元素: ${followItems.length}`);
      }
    }
    
    const newContent = [];
    
    followItems.forEach((item, index) => {
      const text = item.textContent?.trim();
      if (text && text.length > 10) { // 过滤掉太短的内容
        const contentId = this.generateContentId(item);
        
        if (!this.lastFollowListContent.includes(contentId)) {
          newContent.push({
            id: contentId,
            text: text,
            element: item
          });
        }
      }
    });
    
    if (newContent.length > 0) {
      console.log('发现新的关注列表内容:', newContent.length);
      
      // 更新基准数据
      this.lastFollowListContent = followItems.map(item => this.generateContentId(item));
      
      // 发送给background script
      chrome.runtime.sendMessage({
        action: 'followListUpdate',
        data: { newContent }
      });
    }
  }
  
  checkSystemMessageUpdates() {
    // 尝试多种可能的选择器来找到系统消息数量
    const possibleSelectors = [
      '.message-count',
      '.badge',
      '.notification-count',
      '[class*="count"]',
      '[class*="badge"]',
      '[class*="notification"]'
    ];
    
    let messageCountElement = null;
    let messageCount = 0;
    
    // 首先尝试找到"我的消息"或"系统消息"相关的元素
    const messageLinks = Array.from(document.querySelectorAll('a, span, div')).filter(el => {
      const text = el.textContent;
      return text && (text.includes('我的消息') || text.includes('系统消息') || text.includes('消息'));
    });
    
    for (const link of messageLinks) {
      // 在消息链接附近查找数字
      const parent = link.parentElement;
      if (parent) {
        for (const selector of possibleSelectors) {
          const countEl = parent.querySelector(selector);
          if (countEl) {
            const countText = countEl.textContent.trim();
            const count = parseInt(countText);
            if (!isNaN(count) && count > 0) {
              messageCount = count;
              messageCountElement = countEl;
              console.log(`找到系统消息数量: ${count}, 选择器: ${selector}`);
              break;
            }
          }
        }
        if (messageCountElement) break;
      }
    }
    
    // 如果还没找到，尝试全局搜索数字badge
    if (!messageCountElement) {
      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent.trim();
          const count = parseInt(text);
          if (!isNaN(count) && count > 0) {
            // 检查是否在消息相关的上下文中
            const context = el.closest('[class*="message"], [class*="notification"], [id*="message"]');
            if (context) {
              messageCount = count;
              messageCountElement = el;
              console.log(`通过上下文找到系统消息数量: ${count}`);
              break;
            }
          }
        }
        if (messageCountElement) break;
      }
    }
    
    if (messageCount > this.lastSystemMessageCount) {
      console.log(`系统消息数量变化: ${this.lastSystemMessageCount} -> ${messageCount}`);
      
      chrome.runtime.sendMessage({
        action: 'systemMessageUpdate',
        data: { count: messageCount }
      });
      
      this.lastSystemMessageCount = messageCount;
    }
  }
  
  generateContentId(element) {
    // 生成内容的唯一标识
    const text = element.textContent?.trim();
    const timestamp = element.querySelector('[class*="time"], [class*="date"]')?.textContent || '';
    return `${text?.substring(0, 50)}_${timestamp}`.replace(/\s+/g, '_');
  }
  
  updateFollowListBaseline() {
    // 更新关注列表基准数据
    const possibleSelectors = [
      '.timeline-container .timeline-item',
      '.feed-item',
      '.status-item',
      '[data-type="status"]'
    ];
    
    for (const selector of possibleSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        this.lastFollowListContent = Array.from(elements).map(item => this.generateContentId(item));
        console.log(`初始化关注列表基准数据: ${this.lastFollowListContent.length} 项`);
        break;
      }
    }
  }
  
  updateSystemMessageBaseline() {
    // 更新系统消息基准数据
    const possibleSelectors = [
      '.message-count',
      '.badge',
      '.notification-count'
    ];
    
    for (const selector of possibleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const count = parseInt(element.textContent.trim());
        if (!isNaN(count)) {
          this.lastSystemMessageCount = count;
          console.log(`初始化系统消息基准数据: ${count}`);
          break;
        }
      }
    }
  }
}

// 初始化内容监控器
const contentMonitor = new XueqiuContentMonitor();