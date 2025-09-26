// 雪球消息监控助手 - 内容脚本

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

class XueqiuContentMonitor {
  constructor() {
    this.lastFollowListContent = [];
    this.lastSystemMessageCount = 0;
    this.isInitialized = false;
    this.isInitializing = true; // 标记是否正在初始化
    this.processedContent = new Set(); // 初始化已处理内容的Set
    
    this.init();
  }
  
  init() {
    console.log(`[${getTimestamp()}] 雪球监控助手 Content Script 开始加载`);
    
    // 立即设置消息监听器，确保可以响应ping
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放，支持异步响应
    });
    
    // 等待页面完全加载后再初始化监控功能
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.initialize(), 3000); // 增加到3秒
      });
    } else {
      setTimeout(() => this.initialize(), 3000); // 增加到3秒
    }
  }
  
  initialize() {
    console.log(`[${getTimestamp()}] [DEBUG] 雪球监控助手开始初始化...`);
    console.log(`[${getTimestamp()}] [DEBUG] 当前状态 - isInitializing:`, this.isInitializing, 'isInitialized:', this.isInitialized);
    
    // 初始化基准数据
    console.log(`[${getTimestamp()}] [DEBUG] 开始更新关注列表基准数据...`);
    this.updateFollowListBaseline();
    console.log(`[${getTimestamp()}] [DEBUG] 开始更新系统消息基准数据...`);
    this.updateSystemMessageBaseline();
    
    // 标记初始化完成
    this.isInitialized = true;
    this.isInitializing = false;
    console.log(`[${getTimestamp()}] [DEBUG] 雪球监控助手初始化完成，开始监控新内容`);
    console.log(`[${getTimestamp()}] [DEBUG] 最终状态 - isInitializing:`, this.isInitializing, 'isInitialized:', this.isInitialized);
  }
  
  handleMessage(message, sender, sendResponse) {
    console.log(`[${getTimestamp()}] Content script received message:`, message);
    
    try {
      switch (message.action) {
        case 'ping':
          // 响应ping消息，表示content script已就绪
          console.log(`[${getTimestamp()}] 收到ping请求，当前初始化状态:`, this.isInitialized);
          sendResponse({
            success: true, 
            ready: this.isInitialized,
            url: window.location.href,
            readyState: document.readyState
          });
          break;
        case 'checkUpdates':
          if (this.isInitialized) {
            this.checkForUpdates(message);
            sendResponse({success: true});
          } else {
            console.log(`[${getTimestamp()}] Content script尚未初始化完成，无法执行检查`);
            sendResponse({success: false, error: 'Not initialized yet'});
          }
          break;
        case 'debugDOM':
          this.debugDOMStructure();
          sendResponse({success: true});
          break;
        default:
          console.log(`[${getTimestamp()}] === 雪球页面DOM结构调试 ===`);
          sendResponse({success: false, error: 'Unknown action'});
      }
    } catch (error) {
      console.error('处理消息时出错:', error);
      sendResponse({success: false, error: error.message});
    }
  }
  
  debugDOMStructure() {
    console.log(`[${getTimestamp()}] 找到 ${numberElements.length} 个包含数字的元素:`);
    numberElements.forEach((item, index) => {
      console.log(`[${getTimestamp()}] ${index + 1}. 数字: "${item.text}", 标签: ${item.tagName}, 类名: "${item.className}", ID: "${item.id}"`);
      console.log(`[${getTimestamp()}]    父元素文本: "${item.parentText}"`);
      console.log(`[${getTimestamp()}]    位置: (${item.rect.left}, ${item.rect.top}), 尺寸: ${item.rect.width}x${item.rect.height}`);
      console.log(`[${getTimestamp()}]    样式: 背景色=${item.backgroundColor}, 圆角=${item.borderRadius}, 定位=${item.position}`);
      console.log(`[${getTimestamp()}] ---`);
    });
    
    // 查找所有包含"消息"的元素
    const messageElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent;
      return text && (text.includes('消息') || text.includes('message'));
    });
    
    console.log(`[${getTimestamp()}] 找到 ${messageElements.length} 个包含"消息"的元素:`);
    messageElements.forEach((el, index) => {
      console.log(`[${getTimestamp()}] ${index + 1}. 标签: ${el.tagName}, 类名: "${el.className}", ID: "${el.id}"`);
      console.log(`[${getTimestamp()}]    文本: "${el.textContent.substring(0, 100)}"`);
      console.log(`[${getTimestamp()}]    href: "${el.href || '无'}"`);
      console.log(`[${getTimestamp()}] ---`);
    });
    
    console.log(`[${getTimestamp()}] === 调试结束 ===`);
  }
  
  clickFollowButton() {
    console.log(`[${getTimestamp()}] ===== clickFollowButton 开始 =====`);
    
    try {
      // 查找"关注"按钮的多种可能选择器
      const followSelectors = [
        'a[href*="关注"]',
        'a[title="关注"]',
        'a:contains("关注")',
        '.home-timeline-tabs a[href*="关注"]',
        '.home-timeline-tabs a[title="关注"]',
        '.home-timeline-tabs a:contains("关注")',
        'div[class*="timeline-tabs"] a[href*="关注"]',
        'div[class*="timeline-tabs"] a[title="关注"]',
        'div[class*="timeline-tabs"] a:contains("关注")',
        // 基于您提供的HTML结构
        'div.home-timeline-tabs a[href="/关注"]',
        'div.home-timeline-tabs a[href*="关注"]'
      ];
      
      let followButton = null;
      
      // 尝试每个选择器
      for (const selector of followSelectors) {
        if (selector.includes(':contains')) {
          // 对于包含文本的选择器，需要手动查找
          const elements = document.querySelectorAll('a');
          for (const element of elements) {
            if (element.textContent && element.textContent.trim() === '关注') {
              followButton = element;
              console.log(`[${getTimestamp()}] 通过文本内容找到关注按钮:`, element);
              break;
            }
          }
        } else {
          followButton = document.querySelector(selector);
          if (followButton) {
            console.log(`[${getTimestamp()}] 通过选择器找到关注按钮:`, selector, followButton);
            break;
          }
        }
      }
      
      if (!followButton) {
        // 如果没有找到，尝试更通用的方法
        const allLinks = document.querySelectorAll('a');
        for (const link of allLinks) {
          const text = link.textContent?.trim();
          const href = link.getAttribute('href');
          if (text === '关注' || href?.includes('关注')) {
            followButton = link;
            console.log(`[${getTimestamp()}] 通过遍历找到关注按钮:`, link);
            break;
          }
        }
      }
      
      if (followButton) {
        console.log(`[${getTimestamp()}] 找到关注按钮，准备点击:`, followButton);
        console.log(`[${getTimestamp()}] 按钮文本:`, followButton.textContent?.trim());
        console.log(`[${getTimestamp()}] 按钮href:`, followButton.getAttribute('href'));
        
        // 模拟点击事件
        followButton.click();
        console.log(`[${getTimestamp()}] 已点击关注按钮`);
        
        // 等待一小段时间让页面响应
        setTimeout(() => {
          console.log(`[${getTimestamp()}] 关注按钮点击后等待完成`);
        }, 500);
        
      } else {
        console.log(`[${getTimestamp()}] 未找到关注按钮，可能页面结构已变化`);
        // 输出当前页面的导航结构用于调试
        const navElements = document.querySelectorAll('nav, .nav, .tabs, .timeline-tabs, .home-timeline-tabs');
        console.log(`[${getTimestamp()}] 当前页面导航元素:`, navElements);
        navElements.forEach((nav, index) => {
          console.log(`[${getTimestamp()}] 导航元素 ${index}:`, nav.outerHTML.substring(0, 200));
        });
      }
      
    } catch (error) {
      console.log(`[${getTimestamp()}] 点击关注按钮时出错:`, error);
    }
    
    console.log(`[${getTimestamp()}] ===== clickFollowButton 结束 =====`);
  }
  
  checkForUpdates(settings) {
    console.log(`[${getTimestamp()}] ===== checkForUpdates 开始 =====`);
    console.log(`[${getTimestamp()}] [DEBUG] 当前时间:`, new Date().toLocaleTimeString());
    console.log(`[${getTimestamp()}] [DEBUG] 当前状态 - isInitializing:`, this.isInitializing, 'isInitialized:', this.isInitialized);
    console.log(`[${getTimestamp()}] [DEBUG] 设置 - followListEnabled:`, settings.followListEnabled, 'systemMessageEnabled:', settings.systemMessageEnabled);
    
    // 如果正在初始化，跳过检查
    if (this.isInitializing) {
      console.log(`[${getTimestamp()}] 正在初始化中，跳过本次检查`);
      return;
    }

    if (!this.isInitialized) {
      console.log(`[${getTimestamp()}] Content script尚未初始化完成，跳过本次检查`);
      return;
    }

    try {
      // 自动点击"关注"按钮来刷新内容列表
      this.clickFollowButton();
      
      // 检查关注列表更新
      if (settings.followListEnabled) {
        console.log(`[${getTimestamp()}] [DEBUG] 开始检查关注列表更新...`);
        this.checkFollowListUpdates();
      }

      // 检查系统消息更新
      if (settings.systemMessageEnabled) {
        console.log(`[${getTimestamp()}] [DEBUG] 开始检查系统消息更新...`);
        this.checkSystemMessageUpdates();
      }
    } catch (error) {
      console.log(`[${getTimestamp()}] [DEBUG] 检查更新时出错:`, error);
    }
    
    console.log(`[${getTimestamp()}] ===== checkForUpdates 结束 =====`);
  }
  
  checkFollowListUpdates() {
    console.log(`[${getTimestamp()}] 开始检查关注列表更新...`);
    console.log(`[${getTimestamp()}] [DEBUG] 当前状态 - isInitializing:`, this.isInitializing, 'isInitialized:', this.isInitialized);
    console.log(`[${getTimestamp()}] [DEBUG] 已处理内容数量:`, this.processedContent.size);
    
    // 基于实际DOM结构的精确选择器
    const statusList = document.querySelector('.status-list');
    if (!statusList) {
      console.log(`[${getTimestamp()}] Status list container not found`);
      return;
    }

    const timelineItems = statusList.querySelectorAll('article.timeline__item');
    if (timelineItems.length === 0) {
      console.log(`[${getTimestamp()}] No timeline items found`);
      return;
    }

    console.log(`[${getTimestamp()}] Found ${timelineItems.length} timeline items`);
    const newContent = [];
    
    timelineItems.forEach((item, index) => {
      try {
        const dynamicInfo = this.extractXueqiuDynamicInfo(item);
        if (!dynamicInfo || !this.isValidXueqiuContent(dynamicInfo)) {
          console.log(`[${getTimestamp()}] [DEBUG] 跳过无效内容，索引: ${index}`);
          return;
        }

        const contentId = this.generateXueqiuContentId(dynamicInfo);
        console.log(`[${getTimestamp()}] [DEBUG] 处理内容 ${index}: ID=${contentId}, 用户=${dynamicInfo.username}, 时间=${dynamicInfo.time}`);
        console.log(`[${getTimestamp()}] [DEBUG] 内容预览: ${dynamicInfo.content.substring(0, 50)}...`);
        console.log(`[${getTimestamp()}] [DEBUG] 是否已处理: ${this.processedContent.has(contentId)}`);
         
         if (!this.processedContent.has(contentId)) {
           this.processedContent.add(contentId);
           const contentItem = {
             id: contentId,
             username: dynamicInfo.username,
             time: dynamicInfo.time,
             source: dynamicInfo.source,
             content: dynamicInfo.content,
             element: item.outerHTML.substring(0, 500),
             timestamp: Date.now(),
             index: index
           };
           newContent.push(contentItem);
           console.log(`[${getTimestamp()}] [DEBUG] 添加新内容: ${contentItem.username} - ${contentItem.content.substring(0, 30)}...`);
         } else {
           console.log(`[${getTimestamp()}] 内容已存在，跳过: ${dynamicInfo.username} - ${dynamicInfo.content.substring(0, 30)}...`);
         }
      } catch (error) {
        console.error('Error processing timeline item:', error);
      }
    });

    console.log(`[${getTimestamp()}] [DEBUG] 检测到 ${newContent.length} 条新内容`);
    if (newContent.length > 0) {
      console.log('当前最新内容完整信息:', newContent[0]);
      
      // 只在非初始化阶段发送通知
      if (!this.isInitializing) {
        console.log('[DEBUG] 发送新内容通知到background script');
        // 发送给background script
        chrome.runtime.sendMessage({
          action: 'followListUpdate',
          data: { newContent }
        });
      } else {
        console.log('初始化阶段，跳过通知发送');
      }
    } else {
      console.log('[DEBUG] 没有检测到新内容');
    }
  }
  
  // 通过模式识别查找动态内容
  findDynamicContentByPattern() {
    const allElements = document.querySelectorAll('div, article, section');
    const dynamicElements = [];
    
    for (const element of allElements) {
      const text = element.textContent?.trim();
      if (!text || text.length < 20) continue;
      
      // 检查是否包含雪球动态的特征模式
      const hasTimePattern = /\d{2}-\d{2}\s+\d{2}:\d{2}/.test(text) || 
                            text.includes('分钟前') || 
                            text.includes('小时前') || 
                            text.includes('刚刚') ||
                            text.includes('今天') ||
                            text.includes('昨天');
      
      const hasSourcePattern = text.includes('来自') || 
                              text.includes('Android') || 
                              text.includes('iPhone') ||
                              text.includes('网页版');
      
      const hasUserPattern = text.includes('@') || 
                            text.includes('回复') ||
                            /[\u4e00-\u9fa5]+\d*/.test(text); // 中文用户名模式
      
      // 如果包含时间和用户特征，可能是动态内容
      if (hasTimePattern && (hasSourcePattern || hasUserPattern)) {
        // 进一步验证是否是完整的动态内容容器
        if (this.isCompleteDynamicContainer(element)) {
          dynamicElements.push(element);
        }
      }
    }
    
    return dynamicElements;
  }
  
  // 检查是否是完整的动态内容容器
  isCompleteDynamicContainer(element) {
    const text = element.textContent;
    const rect = element.getBoundingClientRect();
    
    // 检查元素大小（动态内容通常有一定的高度和宽度）
    if (rect.height < 50 || rect.width < 200) {
      return false;
    }
    
    // 检查是否包含足够的内容
    if (text.length < 30) {
      return false;
    }
    
    // 检查是否包含多个特征
    let featureCount = 0;
    if (/\d{2}-\d{2}\s+\d{2}:\d{2}/.test(text)) featureCount++;
    if (text.includes('来自')) featureCount++;
    if (text.includes('@') || text.includes('回复')) featureCount++;
    if (text.includes('转发') || text.includes('评论') || text.includes('赞')) featureCount++;
    
    return featureCount >= 2;
  }
  
  // 专门针对雪球网站的内容提取方法
  extractXueqiuDynamicInfo(timelineItem) {
    try {
      // 提取用户名 - 基于实际DOM结构
      const usernameEl = timelineItem.querySelector('.user-name');
      const username = usernameEl ? usernameEl.textContent.trim() : '';

      // 提取时间和来源 - 基于实际DOM结构
      const dateSourceEl = timelineItem.querySelector('.date-and-source');
      let time = '';
      let source = '';
      
      if (dateSourceEl) {
        const fullText = dateSourceEl.textContent.trim();
        // 解析时间和来源，格式如: "09-23 11:58· 来自Android"
        const timeMatch = fullText.match(/(\d{2}-\d{2}\s+\d{2}:\d{2})/);
        if (timeMatch) {
          time = timeMatch[1];
        }
        
        const sourceMatch = fullText.match(/来自(.+)/);
        if (sourceMatch) {
          source = sourceMatch[1].trim();
        }
      }

      // 提取主要内容 - 基于实际DOM结构
      const contentEl = timelineItem.querySelector('.timeline__item__content .content--description');
      let content = '';
      
      if (contentEl) {
        // 获取第一个div的文本内容（主要回复内容）
        const mainContentDiv = contentEl.querySelector('div');
        if (mainContentDiv) {
          content = mainContentDiv.textContent.trim();
        } else {
          content = contentEl.textContent.trim();
        }
      }

      // 验证是否为有效的动态内容
      if (!username || !time || !content) {
        return null;
      }

      return {
        username: username,
        time: time,
        source: source || '',
        content: content,
        fullText: `${username} ${time}${source ? '· 来自' + source : ''} ${content}`.trim()
      };
    } catch (error) {
      console.error('Error extracting Xueqiu dynamic info:', error);
      return null;
    }
  }

  // 提取动态信息
  extractDynamicInfo(element) {
    const fullText = element.textContent?.trim();
    if (!fullText) return null;
    
    const info = {
      fullText: fullText,
      username: '',
      time: '',
      source: '',
      content: '',
      element: element
    };
    
    // 提取用户名 - 查找文本开头的用户名模式
    const usernameMatch = fullText.match(/^([^\s\d]{2,}(?:\d+)?)/);
    if (usernameMatch) {
      info.username = usernameMatch[1];
    }
    
    // 提取时间 - 多种时间格式
    const timePatterns = [
      /(\d{2}-\d{2}\s+\d{2}:\d{2})/,  // 09-23 11:58
      /(\d+分钟前)/,
      /(\d+小时前)/,
      /(刚刚)/,
      /(今天\s*\d{2}:\d{2})/,
      /(昨天\s*\d{2}:\d{2})/
    ];
    
    for (const pattern of timePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        info.time = match[1];
        break;
      }
    }
    
    // 提取来源
    const sourceMatch = fullText.match(/来自([^\s]+)/);
    if (sourceMatch) {
      info.source = sourceMatch[1];
    }
    
    // 提取主要内容 - 去除用户名、时间、来源后的内容
    let content = fullText;
    if (info.username) {
      content = content.replace(info.username, '').trim();
    }
    if (info.time) {
      content = content.replace(info.time, '').trim();
    }
    if (info.source) {
      content = content.replace(`来自${info.source}`, '').trim();
    }
    
    // 清理内容开头的特殊字符
    content = content.replace(/^[·\s]+/, '').trim();
    info.content = content;
    
    return info;
  }
  
  // 验证是否是有效的雪球动态内容
  isValidXueqiuContent(dynamicInfo) {
    // 必须有用户名和内容
    if (!dynamicInfo.username || !dynamicInfo.content) {
      return false;
    }
    
    // 内容长度检查
    if (dynamicInfo.content.length < 10 || dynamicInfo.content.length > 2000) {
      return false;
    }
    
    // 用户名格式检查
    if (dynamicInfo.username.length < 2 || dynamicInfo.username.length > 20) {
      return false;
    }
    
    // 排除一些明显不是动态内容的文本
    const excludePatterns = [
      /^(首页|关注|热门|自选|基金|私募|ETF)$/,
      /^(全部|关注精选|只看原发|股票分析|可转债|未分组)$/,
      /^(发帖|搜索|登录|注册)$/
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(dynamicInfo.content) || pattern.test(dynamicInfo.username)) {
        return false;
      }
    }
    
    return true;
  }

  // 验证是否是有效的动态内容
  isValidDynamicContent(dynamicInfo) {
    // 必须有用户名和内容
    if (!dynamicInfo.username || !dynamicInfo.content) {
      return false;
    }
    
    // 内容长度检查
    if (dynamicInfo.content.length < 10 || dynamicInfo.content.length > 2000) {
      return false;
    }
    
    // 用户名格式检查
    if (dynamicInfo.username.length < 2 || dynamicInfo.username.length > 20) {
      return false;
    }
    
    // 排除一些明显不是动态内容的文本
    const excludePatterns = [
      /^(首页|关注|热门|自选|基金|私募|ETF)$/,
      /^(全部|关注精选|只看原发|股票分析|可转债|未分组)$/,
      /^(发帖|搜索|登录|注册)$/
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(dynamicInfo.content) || pattern.test(dynamicInfo.username)) {
        return false;
      }
    }
    
    return true;
  }
  
  // 生成雪球内容ID
  generateXueqiuContentId(dynamicInfo) {
    // 使用用户名、时间和内容前50字符生成唯一ID
    const contentPreview = dynamicInfo.content.substring(0, 50);
    const idString = `${dynamicInfo.username}_${dynamicInfo.time}_${contentPreview}`;
    
    // 生成简单的哈希值
    let hash = 0;
    for (let i = 0; i < idString.length; i++) {
      const char = idString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    // 移除时间戳，确保相同内容生成相同ID
    return `xq_${Math.abs(hash)}`;
  }

  // 生成高级内容ID
  generateAdvancedContentId(dynamicInfo) {
    // 使用用户名、时间和内容前50字符生成唯一ID
    const contentPreview = dynamicInfo.content.substring(0, 50);
    const idString = `${dynamicInfo.username}_${dynamicInfo.time}_${contentPreview}`;
    
    // 生成简单的哈希值
    let hash = 0;
    for (let i = 0; i < idString.length; i++) {
      const char = idString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    // 移除时间戳，确保相同内容生成相同ID
    return `xq_${Math.abs(hash)}`;
  }

  checkSystemMessageUpdates() {
    console.log('[DEBUG] ===== checkSystemMessageUpdates 开始 =====');
    console.log('[DEBUG] 当前状态 - isInitializing:', this.isInitializing, 'isInitialized:', this.isInitialized);
    console.log('[DEBUG] 上次系统消息数量:', this.lastSystemMessageCount);
    
    const currentCount = this.detectSystemMessage();
    console.log('[DEBUG] 当前系统消息数量:', currentCount, '基准数量:', this.lastSystemMessageCount);
    
    // 检查是否有新的系统消息
    if (currentCount > this.lastSystemMessageCount) {
      const newMessages = currentCount - this.lastSystemMessageCount;
      console.log('[DEBUG] 发现', newMessages, '条新的系统消息!');
      console.log('[DEBUG] 当前初始化状态:', this.isInitializing);
      
      // 只在非初始化阶段发送通知
      if (!this.isInitializing) {
        console.log('[DEBUG] 发送系统消息通知到background script...');
        // 发送通知到background script
        chrome.runtime.sendMessage({
          action: 'systemMessageUpdate',
          data: { count: currentCount }
        });
      } else {
        console.log('[DEBUG] 初始化阶段，跳过系统消息通知发送');
      }
      
      // 更新基准数量
      this.lastSystemMessageCount = currentCount;
      console.log('[DEBUG] 更新基准数量为:', this.lastSystemMessageCount);
    } else if (currentCount === this.lastSystemMessageCount) {
      console.log('[DEBUG] 系统消息数量无变化');
    } else {
      console.log('[DEBUG] 系统消息数量减少了，可能是页面刷新或消息被清除');
      this.lastSystemMessageCount = currentCount;
    }
    
    console.log('[DEBUG] ===== checkSystemMessageUpdates 结束 =====');
  }
  
  generateContentId(element) {
    // 生成内容的唯一标识
    const text = element.textContent?.trim();
    const timestamp = element.querySelector('[class*="time"], [class*="date"]')?.textContent || '';
    return `${text?.substring(0, 50)}_${timestamp}`.replace(/\s+/g, '_');
  }
  
  updateFollowListBaseline() {
    // 更新关注列表基准数据，使用与检测逻辑相同的选择器
    console.log('[DEBUG] 开始初始化关注列表基准数据...');
    
    const statusList = document.querySelector('.status-list');
    if (!statusList) {
      console.log('Status list container not found during baseline update');
      return;
    }

    const timelineItems = statusList.querySelectorAll('article.timeline__item');
    if (timelineItems.length === 0) {
      console.log('No timeline items found during baseline update');
      return;
    }

    console.log(`[DEBUG] 找到 ${timelineItems.length} 个时间线项目用于基准数据初始化`);

    // 清空现有的处理记录
    this.processedContent.clear();
    
    // 将所有现有内容添加到已处理集合中，避免初始化时发送通知
    timelineItems.forEach((item, index) => {
      try {
        const dynamicInfo = this.extractXueqiuDynamicInfo(item);
        if (dynamicInfo && this.isValidXueqiuContent(dynamicInfo)) {
          const contentId = this.generateXueqiuContentId(dynamicInfo);
          this.processedContent.add(contentId);
          console.log(`[DEBUG] 基准数据 ${index}: ID=${contentId}, 用户=${dynamicInfo.username}, 时间=${dynamicInfo.time}`);
          console.log(`[DEBUG] 基准内容预览: ${dynamicInfo.content.substring(0, 50)}...`);
        } else {
          console.log(`[DEBUG] 跳过无效基准内容，索引: ${index}`);
        }
      } catch (error) {
        console.error('Error processing baseline item:', error);
      }
    });
    
    console.log(`[DEBUG] 初始化关注列表基准数据完成: ${this.processedContent.size} 项已记录`);
    
    // 输出已记录的内容ID列表（前5个）
    const recordedIds = Array.from(this.processedContent).slice(0, 5);
    console.log('[DEBUG] 已记录的内容ID示例:', recordedIds);
  }
  
  updateSystemMessageBaseline() {
    // 更新系统消息基准数据，使用与检测逻辑相同的策略
    console.log('初始化系统消息基准数据...');
    
    const currentCount = this.detectSystemMessage();
    this.lastSystemMessageCount = currentCount;
    console.log(`初始化系统消息基准数据完成: ${currentCount}`);
  }
  
  detectSystemMessage() {
    console.log('[DEBUG] ===== detectSystemMessage 开始 =====');
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
      '.user__control__msg a', // 用户控制面板中的所有链接
      
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
      // 首先在user__control__msg类下查找包含"系统消息"的链接
      const userControlMsg = document.querySelector('.user__control__msg');
      if (userControlMsg) {
        const systemMsgLinks = Array.from(userControlMsg.querySelectorAll('a')).filter(el => {
          const text = el.textContent;
          return text && text.includes('系统消息');
        });
        
        if (systemMsgLinks.length > 0) {
          console.log(`在user__control__msg中找到 ${systemMsgLinks.length} 个系统消息链接`);
          
          for (const link of systemMsgLinks) {
            const linkText = link.textContent.trim();
            const match = linkText.match(/系统消息(\d+)/);
            if (match) {
              const count = parseInt(match[1]);
              if (count > 0) {
                messageCount = count;
                messageCountElement = link;
                console.log(`在user__control__msg中找到系统消息数量: ${count}, 文本: "${linkText}"`);
                break;
              }
            }
          }
        }
      }
      
      // 如果在user__control__msg中没找到，继续使用原有逻辑
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
    
    console.log('[DEBUG] detectSystemMessage 最终结果:', messageCount);
    console.log('[DEBUG] ===== detectSystemMessage 结束 =====');
    return messageCount;
  }
}

// 初始化内容监控器
const contentMonitor = new XueqiuContentMonitor();