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
    console.log('Content script received message:', message);
    
    switch (message.action) {
      case 'checkUpdates':
        this.checkForUpdates(message);
        break;
      case 'debugDOM':
        this.debugDOMStructure();
        break;
      default:
        console.log('Unknown message action:', message.action);
    }
    
    sendResponse({success: true});
  }
  
  debugDOMStructure() {
    console.log('=== 雪球页面DOM结构调试 ===');
    
    // 查找所有可能包含数字的元素
    const allElements = document.querySelectorAll('*');
    const numberElements = [];
    
    for (const el of allElements) {
      if (el.children.length === 0) { // 叶子节点
        const text = el.textContent.trim();
        if (/^\d+$/.test(text) && parseInt(text) > 0 && parseInt(text) <= 99) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          
          numberElements.push({
            element: el,
            text: text,
            className: el.className,
            id: el.id,
            tagName: el.tagName,
            parentText: el.parentElement?.textContent?.substring(0, 50) || '',
            rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            position: style.position
          });
        }
      }
    }
    
    console.log(`找到 ${numberElements.length} 个包含数字的元素:`);
    numberElements.forEach((item, index) => {
      console.log(`${index + 1}. 数字: "${item.text}", 标签: ${item.tagName}, 类名: "${item.className}", ID: "${item.id}"`);
      console.log(`   父元素文本: "${item.parentText}"`);
      console.log(`   位置: (${item.rect.left}, ${item.rect.top}), 尺寸: ${item.rect.width}x${item.rect.height}`);
      console.log(`   样式: 背景色=${item.backgroundColor}, 圆角=${item.borderRadius}, 定位=${item.position}`);
      console.log('---');
    });
    
    // 查找所有包含"消息"的元素
    const messageElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent;
      return text && (text.includes('消息') || text.includes('message'));
    });
    
    console.log(`找到 ${messageElements.length} 个包含"消息"的元素:`);
    messageElements.forEach((el, index) => {
      console.log(`${index + 1}. 标签: ${el.tagName}, 类名: "${el.className}", ID: "${el.id}"`);
      console.log(`   文本: "${el.textContent.substring(0, 100)}"`);
      console.log(`   href: "${el.href || '无'}"`);
      console.log('---');
    });
    
    console.log('=== 调试结束 ===');
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
    console.log('开始检查系统消息更新...');
    
    const currentCount = this.detectSystemMessage();
    console.log(`当前系统消息数量: ${currentCount}, 基准数量: ${this.lastSystemMessageCount}`);
    
    // 检查是否有新的系统消息
    if (currentCount > this.lastSystemMessageCount) {
      const newMessages = currentCount - this.lastSystemMessageCount;
      console.log(`发现 ${newMessages} 条新的系统消息!`);
      
      // 发送通知到background script
      chrome.runtime.sendMessage({
        action: 'systemMessageUpdate',
        data: { count: currentCount }
      });
      
      // 更新基准数量
      this.lastSystemMessageCount = currentCount;
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
    // 更新系统消息基准数据，使用与检测逻辑相同的策略
    console.log('初始化系统消息基准数据...');
    
    const currentCount = this.detectSystemMessage();
    this.lastSystemMessageCount = currentCount;
    console.log(`初始化系统消息基准数据完成: ${currentCount}`);
  }
  
  detectSystemMessage() {
    let messageCount = 0;
    let messageCountElement = null;
    
    // 根据实际DOM结构的精确选择器 - 直接指向包含"系统消息1"文本的链接元素
    const preciseSelector = 'body > div:nth-of-type(1) > div:nth-of-type(2) > div > div:nth-of-type(1) > ul > li:nth-of-type(8) > ul > li:nth-of-type(5) > a';
    
    // 雪球网站特定的选择器策略
    const xueqiuSelectors = [
      preciseSelector,  // 最精确的选择器
      'a[href="/center/#/sys-message"]',  // 系统消息链接
      'a[href*="sys-message"]',           // 包含sys-message的链接
      'li[data-analytics-data*="系统消息"] a', // 包含系统消息的li元素中的链接
      'ul.user__control__msg li a[href*="sys-message"]', // 消息菜单中系统消息链接
      '.user__control__msg a[href*="sys-message"]', // 用户控制面板中的系统消息链接
      
      // 通过文本内容查找系统消息链接
      'a:contains("系统消息")',
      
      // 通用的数字徽章选择器
      'a[href*="message"] .badge',
      'a[href*="message"] .count',
      'a[href*="message"] .num',
      '.badge',
      '.count',
      '.num',
      '[class*="badge"]',
      '[class*="count"]',
      '[class*="num"]'
    ];
    
    // 策略1: 使用雪球特定选择器
    for (const selector of xueqiuSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.trim();
        
        // 对于精确选择器，从"系统消息1"这样的文本中提取数字
        if (selector === preciseSelector) {
          const match = text.match(/系统消息(\d+)/);
          if (match) {
            const count = parseInt(match[1]);
            if (count > 0) {
              messageCount = count;
              messageCountElement = el;
              console.log(`通过精确选择器找到系统消息数量: ${count}, 文本: "${text}"`);
              break;
            }
          }
        } else {
          // 对于其他选择器，尝试直接解析数字或从文本中提取
          let count = parseInt(text);
          if (isNaN(count)) {
            // 如果直接解析失败，尝试从文本中提取数字
            const match = text.match(/(\d+)/);
            if (match) {
              count = parseInt(match[1]);
            }
          }
          
          if (!isNaN(count) && count > 0) {
            // 检查元素是否在消息相关的上下文中
            const parentText = el.closest('a')?.textContent || text;
            if (parentText.includes('消息') || parentText.includes('message') || 
                el.closest('[href*="message"]') || el.closest('[class*="message"]')) {
              messageCount = count;
              messageCountElement = el;
              console.log(`通过雪球选择器找到系统消息数量: ${count}, 选择器: ${selector}, 上下文: "${parentText}"`);
              break;
            }
          }
        }
      }
      if (messageCountElement) break;
    }
    
    // 策略2: 通过文本内容查找消息链接
    if (!messageCountElement) {
      const messageLinks = Array.from(document.querySelectorAll('a')).filter(el => {
        const text = el.textContent;
        const href = el.href || '';
        // 只匹配真正的消息链接：包含系统消息文本且href包含message
        return text && href.includes('message') && 
               (text.includes('系统消息') || text.includes('我的消息'));
      });
      
      console.log(`找到 ${messageLinks.length} 个可能的消息链接`);
      
      for (const link of messageLinks) {
        // 在消息链接本身查找数字，但要更精确
        const linkText = link.textContent.trim();
        
        // 优先匹配"系统消息X"格式
        let linkMatch = linkText.match(/系统消息(\d+)/);
        if (linkMatch) {
          const count = parseInt(linkMatch[1]);
          if (count > 0) {
            messageCount = count;
            messageCountElement = link;
            console.log(`在消息链接文本中找到数量: ${count}, 文本: "${linkText}"`);
            break;
          }
        }
        
        // 如果没有找到"系统消息X"格式，尝试匹配末尾的数字
        linkMatch = linkText.match(/(\d+)$/);
        if (linkMatch) {
          const count = parseInt(linkMatch[1]);
          if (count > 0 && count <= 999) { // 限制数字范围，避免匹配到股票代码等
            messageCount = count;
            messageCountElement = link;
            console.log(`在消息链接文本末尾找到数量: ${count}, 文本: "${linkText}"`);
            break;
          }
        }
        
        // 在消息链接附近查找数字元素
        const parent = link.parentElement;
        const siblings = parent ? Array.from(parent.children) : [];
        
        for (const sibling of siblings) {
          const siblingText = sibling.textContent.trim();
          const count = parseInt(siblingText);
          if (!isNaN(count) && count > 0 && siblingText.length <= 3) {
            messageCount = count;
            messageCountElement = sibling;
            console.log(`在消息链接兄弟元素中找到数量: ${count}`);
            break;
          }
        }
        
        if (messageCountElement) break;
      }
    }
    
    // 策略3: 全局搜索小数字（可能是通知数字）
    if (!messageCountElement) {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        // 只检查叶子节点（没有子元素的元素）
        if (el.children.length === 0) {
          const text = el.textContent.trim();
          const count = parseInt(text);
          
          // 检查是否是小的正整数（通常通知数字不会很大）
          if (!isNaN(count) && count > 0 && count <= 99 && text.length <= 2) {
            // 检查元素的样式和位置，看起来像通知徽章
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            
            // 检查是否具有徽章的特征：小尺寸、圆形、特定颜色等
            if (rect.width <= 30 && rect.height <= 30 && 
                (style.borderRadius.includes('50%') || style.borderRadius.includes('px')) &&
                (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent')) {
              
              // 进一步检查是否在导航区域
              const nav = el.closest('nav, .nav, .header, .top, [class*="nav"]');
              if (nav) {
                messageCount = count;
                messageCountElement = el;
                console.log(`通过样式特征找到可能的系统消息数量: ${count}`);
                break;
              }
            }
          }
        }
      }
    }
    
    return messageCount;
  }
}

// 初始化内容监控器
const contentMonitor = new XueqiuContentMonitor();