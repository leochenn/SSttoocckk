if (typeof window.contentScriptInjected === 'undefined') {
    window.contentScriptInjected = true;
    console.log("雪球助手内容脚本已注入并运行。");

    // 统一日志系统 - 同时发送到 background 和本地控制台
    function logToExtension(level, message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[Content-${timestamp}] ${message}`;
        
        // 本地控制台输出（如果不被反调试阻止）
        try {
            if (level === 'error') {
                console.error(logEntry, data);
            } else if (level === 'warn') {
                console.warn(logEntry, data);
            } else {
                console.log(logEntry, data);
            }
        } catch (e) {
            // 被反调试阻止时忽略
        }
        
        // 发送到 background 的扩展控制台
        if (chrome.runtime?.id) {
            try {
                chrome.runtime.sendMessage({
                    type: 'contentLog',
                    data: { level, message: logEntry, data }
                });
            } catch (e) {
                // 扩展上下文失效时忽略
            }
        }
    }

    logToExtension('info', '雪球助手内容脚本已注入并运行');

    // NTFY 服务地址 (现在由 background.js 处理)
    const NTFY_URL = 'http://118.89.62.149:8090/ctrl_pc'; // 保留URL以便参考，但不再在此处使用

    // 用于存储上次检测到的时间线内容
    let lastTimelineContent = '';

    // sendNtfyNotification 函数已移除，通知逻辑移至 background.js


    // 点击“关注” Tab
    async function clickFollowTab() {
        logToExtension('info', '尝试点击“关注”Tab...');
        // 精确定位：div.home-timeline-tabs -> div.sticky-content-fixed -> a (innerText 关注)
        const followTabContainer = document.querySelector('.home-timeline-tabs .sticky-content-fixed');
        let followTab = null;
        if (followTabContainer) {
            const potentialTabs = followTabContainer.querySelectorAll('a');
            for (const tab of potentialTabs) {
                if (tab.innerText.trim() === '关注') {
                    followTab = tab;
                    break;
                }
            }
        }
        
        if (followTab) {
            followTab.click();
            logToExtension('info', '成功点击“关注”Tab (无论是否已激活)。');
            return true;
        } else {
            logToExtension('warn', '未找到“关注”Tab。');
            throw new Error('未找到“关注”Tab');
        }
    }

    // 等待内容加载完成
    async function waitForContentLoad(timeout = 5000) {
        logToExtension('info', '等待内容加载...');
        const statusList = document.querySelector('.status-list');
        if (!statusList) {
            logToExtension('warn', '未找到 .status-list 容器，可能页面结构已改变或未加载。');
            // 如果容器不存在，就直接返回，让后续的 getTopPostDetails 去处理
            return;
        }

        // 记录初始DOM状态，用于判断是否有变化
        let initialChildCount = statusList.children.length;
        let initialFirstChildHTML = statusList.firstElementChild ? statusList.firstElementChild.innerHTML : '';
        logToExtension('debug', `初始 .status-list 子元素数量: ${initialChildCount}, 初始第一个子元素HTML片段: ${initialFirstChildHTML.substring(0, 50)}...`);

        let attempt = 0;
        const maxAttempts = timeout / 200; // 每200ms检查一次

        while (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const currentChildCount = statusList.children.length;
            const currentFirstChildHTML = statusList.firstElementChild ? statusList.firstElementChild.innerHTML : '';
            
            // 检查是否有加载指示器
            const loadingIndicator = document.querySelector('.status-list .loading, .status-list .loading-icon, .status-list .loading-text');
            
            // 如果加载指示器消失，且内容有变化，则认为加载完成
            if (!loadingIndicator && (currentChildCount !== initialChildCount || currentFirstChildHTML !== initialFirstChildHTML)) {
                logToExtension('info', `内容已加载，且DOM有变化 (尝试 ${attempt + 1})。`);
                return;
            } else if (!loadingIndicator && attempt > 0) { // 如果没有加载指示器，且等待了一段时间，也认为加载完成（可能是瞬时加载）
                logToExtension('info', `无明显加载指示器，经过 ${attempt + 1} 次尝试，认为加载完成。`);
                return;
            }
            attempt++;
        }
        logToExtension('warn', '等待内容加载超时，或者内容未发生明显变化。');
    }

    // 获取页面顶部帖子内容及连续出现次数
    function getTopPostDetails() {
        const posts = document.querySelectorAll('.status-list article.timeline__item');
        if (posts.length === 0) {
            logToExtension('warn', '未找到任何帖子。');
            return { error: 'NO_POSTS' };
        }

        const firstPost = posts[0];
        const contentEl = firstPost.querySelector('.timeline__item__content .content--description');
        if (!contentEl) {
            logToExtension('warn', '未找到顶部帖子的内容描述。');
            return { error: 'NO_CONTENT_DESCRIPTION' };
        }

        const userEl = firstPost.querySelector('.user-name');
        const userName = userEl ? userEl.innerText.trim() : '未知用户';
        const postContent = contentEl.innerText.trim();

        // 计算顶部帖子签名
        const topSignature = `${userName}: ${postContent}`;
        let consecutiveCount = 0;

        // 遍历帖子，计算与顶部帖子签名相同的连续帖子数量
        for (const post of posts) {
            const currentPostUserEl = post.querySelector('.user-name');
            const currentPostContentEl = post.querySelector('.timeline__item__content .content--description');
            if (currentPostUserEl && currentPostContentEl) {
                const currentSignature = `${currentPostUserEl.innerText.trim()}: ${currentPostContentEl.innerText.trim()}`;
                if (currentSignature === topSignature) {
                    consecutiveCount++;
                } else {
                    break; // 遇到不同内容就停止计数
                }
            } else {
                break; // 无法解析帖子也停止计数
            }
        }
        
        const result = {
            signature: topSignature,
            count: consecutiveCount
        };
        logToExtension('info', `成功获取顶部帖子内容: ${result.signature.substring(0, 50)}... (连续 ${result.count} 条)`);
        return result;
    }
    /*
    // 全局函数：检查组合调仓
    function checkPortfolioSession() {
        try {
            console.log("正在检查雪球组合会话...");
            
            // Find the "雪球组合" session
            const sessionItems = document.querySelectorAll('.session_item');
            console.log(`找到 ${sessionItems.length} 个会话项`);
            
            let portfolioSession = null;

            for (const session of sessionItems) {
                const nameElement = session.querySelector('.session_target_name span');
                if (nameElement) {
                    const sessionName = nameElement.textContent.trim();
                    console.log(`检查会话: ${sessionName}`);
                    if (sessionName === '雪球组合') {
                        portfolioSession = session;
                        console.log("找到雪球组合会话");
                        break;
                    }
                }
            }

            if (!portfolioSession) {
                console.log("未找到雪球组合会话");
                return;
            }

            // Check if there are unread messages
            const unreadElement = portfolioSession.querySelector('.unread');
            const unreadCount = unreadElement ? parseInt(unreadElement.textContent.trim()) : 0;
            
            // Check if unread element is visible
            // When there are unread messages: style="false" 
            // When no unread messages: style="display: none"
            const styleAttr = unreadElement ? unreadElement.getAttribute('style') : '';
            const isUnreadVisible = unreadElement && styleAttr !== 'display: none';
                
            const hasUnread = isUnreadVisible && unreadCount > 0;
            console.log(`未读消息数量: ${unreadCount}, style属性: "${styleAttr}", 元素可见: ${isUnreadVisible}, 是否有未读: ${hasUnread}`);

            // Get the summary message
            const summaryElement = portfolioSession.querySelector('.session_summary');
            const summaryText = summaryElement ? summaryElement.textContent.trim() : '';
            console.log(`会话摘要: ${summaryText}`);

            // Check if it's a portfolio adjustment message
            const isPortfolioAdjustment = summaryText.includes('刚有一笔新调仓');
            console.log(`是否为调仓消息: ${isPortfolioAdjustment}`);

            const currentState = {
                hasUnread,
                summaryText,
                isPortfolioAdjustment
            };

            // Check if we should send notification
            let shouldNotify = false;
            
            if (hasUnread && isPortfolioAdjustment) {
                if (!lastPortfolioState) {
                    // First time checking - notify if there's an unread adjustment message
                    shouldNotify = true;
                    console.log("首次检查发现未读调仓消息");
                } else if (!lastPortfolioState.hasUnread || lastPortfolioState.summaryText !== summaryText) {
                    // State changed - new unread message or different message
                    shouldNotify = true;
                    console.log("检测到新的调仓消息变化");
                }
            }
            
            if (shouldNotify) {
                // Extract portfolio name from message
                const match = summaryText.match(/你关注的「(.+?)」刚有一笔新调仓/);
                if (match && match[1]) {
                    const portfolioName = match[1];
                    console.log(`发送组合调仓通知: ${portfolioName}`);
                    
                    // Determine the target URL based on portfolio name
                    let targetUrl = null;
                    if (portfolioName === '测试组合') {
                        targetUrl = 'https://xueqiu.com/P/ZH3362205';
                    } else if (portfolioName === '可转债轮动策略') {
                        targetUrl = 'https://xueqiu.com/P/ZH1332574';
                    }
                    
                    // Send notification to background script
                    if (chrome.runtime?.id) {
                        chrome.runtime.sendMessage({
                            type: 'portfolioAdjustmentDetected',
                            data: {
                                portfolioName: portfolioName,
                                message: summaryText,
                                targetUrl: targetUrl
                            }
                        });
                    }
                }
            }

            lastPortfolioState = currentState;

        } catch (error) {
            console.error("检查雪球组合会话时出错:", error);
        }
    }
    */

    /*
    // 拦截页面的可见性与失焦事件，阻止其在非聚焦时暂停更新
    function installTabVisibilityBlocker() {
        // 存储阻止器状态和引用
        if (!window.visibilityBlockerState) {
            window.visibilityBlockerState = {
                isActive: false,
                blockerFunction: null,
                installCount: 0,
                lastInstallTime: 0
            };
        }

        const state = window.visibilityBlockerState;
        
        try {
            // 如果已经安装且时间间隔太短，跳过重复安装
            const now = Date.now();
            if (state.isActive && (now - state.lastInstallTime) < 5000) {
                logToExtension('info', '[VisibilityBlocker] 跳过重复安装，当前状态正常');
                return;
            }

            const blocker = (e) => {
                const hidden = document.visibilityState === 'hidden' || document.hidden;
                // 阻止页面对隐藏/失焦事件的处理
                if (e.type === 'visibilitychange' || e.type === 'blur' || e.type === 'pagehide') {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    // preventDefault 对该事件无效，但不影响拦截
                    logToExtension('info', `[VisibilityBlocker] 拦截事件: ${e.type}, hidden=${hidden}`);
                }
            };

            // 如果之前有阻止器，先移除
            if (state.blockerFunction) {
                try {
                    document.removeEventListener('visibilitychange', state.blockerFunction, true);
                    window.removeEventListener('blur', state.blockerFunction, true);
                    window.removeEventListener('pagehide', state.blockerFunction, true);
                } catch (e) {
                    // 忽略移除失败
                }
            }

            // 安装新的阻止器
            state.blockerFunction = blocker;
            
            // 使用捕获阶段，保证先于页面脚本执行
            document.addEventListener('visibilitychange', blocker, true);
            window.addEventListener('blur', blocker, true);
            window.addEventListener('pagehide', blocker, true);

            // 尝试让 hasFocus 始终返回 true（部分站点会检测）
            try {
                if (!Document.prototype._origHasFocus) {
                    const origHasFocus = Document.prototype.hasFocus;
                    Document.prototype.hasFocus = function() { return true; };
                    Document.prototype._origHasFocus = origHasFocus;
                }
            } catch (e) {
                // 原型不可写时忽略
            }

            // 更新状态
            state.isActive = true;
            state.installCount++;
            state.lastInstallTime = now;

            logToExtension('info', `[VisibilityBlocker] 已启用 (第${state.installCount}次安装)，阻止页面在失焦时暂停更新`);
        } catch (err) {
            logToExtension('warn', '[VisibilityBlocker] 启用失败', err);
            state.isActive = false;
        }
    }

    installTabVisibilityBlocker();

    // 定期检查和重新安装可见性阻止器，确保长期稳定性
    function maintainVisibilityBlocker() {
        // 检查阻止器是否仍然有效
        const state = window.visibilityBlockerState;
        if (!state || !state.isActive) {
            logToExtension('warn', '[VisibilityBlocker] 检测到阻止器失效，重新安装');
            installTabVisibilityBlocker();
            return;
        }

        // 测试阻止器是否正常工作
        try {
            // 创建一个测试事件来验证阻止器
            const testEvent = new Event('visibilitychange', { bubbles: true, cancelable: true });
            let eventBlocked = false;
            
            const testListener = (e) => {
                if (e === testEvent) {
                    eventBlocked = true;
                }
            };
            
            // 添加测试监听器（在阻止器之后）
            document.addEventListener('visibilitychange', testListener, false);
            
            // 触发测试事件
            document.dispatchEvent(testEvent);
            
            // 移除测试监听器
            document.removeEventListener('visibilitychange', testListener, false);
            
            // 如果事件没有被阻止，说明阻止器可能失效了
            if (eventBlocked) {
                logToExtension('warn', '[VisibilityBlocker] 检测到阻止器可能失效，重新安装');
                installTabVisibilityBlocker();
            } else {
                logToExtension('info', '[VisibilityBlocker] 状态检查正常');
            }
        } catch (e) {
            logToExtension('warn', '[VisibilityBlocker] 状态检查失败，重新安装', e);
            installTabVisibilityBlocker();
        }
    }

    // 每30秒检查一次阻止器状态
    setInterval(maintainVisibilityBlocker, 30000);
    */

    /*
    // 增强监控机制 - 定期主动检查系统消息
    let enhancedMonitoringInterval = null;
    
    function startEnhancedMonitoring() {
        if (enhancedMonitoringInterval) {
            clearInterval(enhancedMonitoringInterval);
        }
        
        // 只在系统消息页面启动增强监控
        if (window.location.href.includes('/center/#/sys-message')) {
            logToExtension('info', '[EnhancedMonitoring] 启动增强监控机制');
            
            enhancedMonitoringInterval = setInterval(() => {
                try {
                    // 检查扩展上下文是否仍然有效
                    if (!chrome.runtime?.id) {
                        logToExtension('warn', '[EnhancedMonitoring] 扩展上下文失效，停止监控');
                        clearInterval(enhancedMonitoringInterval);
                        return;
                    }
                    
                    // 主动检查系统消息数据
                    const systemMessageData = getSystemMessageDataFromPage();
                    if (systemMessageData) {
                        // 发送主动更新消息
                        chrome.runtime.sendMessage({
                            type: 'proactiveSystemMessageUpdate',
                            data: systemMessageData,
                            source: 'EnhancedMonitoring'
                        }).catch(error => {
                            if (!error.message.includes('Extension context invalidated')) {
                                logToExtension('warn', '[EnhancedMonitoring] 发送消息失败', error);
                            }
                        });
                    }
                    
                    // 检查组合调仓
                    checkPortfolioSession();
                    
                } catch (error) {
                    logToExtension('warn', '[EnhancedMonitoring] 执行失败', error);
                }
            }, 20000); // 每20秒检查一次
        }
    }
    
    // 启动增强监控
    startEnhancedMonitoring();
    
    // 页面导航时重新启动监控
    let lastUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            logToExtension('info', '[EnhancedMonitoring] 检测到页面导航，重新启动监控');
            startEnhancedMonitoring();
        }
    }, 5000);
    */

    /*
    // 页面可见性变化时也重新安装（防止页面脚本干扰）
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            logToExtension('info', '[VisibilityBlocker] DOM加载完成，重新安装阻止器');
            installTabVisibilityBlocker();
        }, 1000);
    });

    // 监听页面动态内容变化，可能有新脚本加载
    const pageObserver = new MutationObserver((mutations) => {
        let hasScriptChanges = false;
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        (node.tagName === 'SCRIPT' || node.querySelector('script'))) {
                        hasScriptChanges = true;
                    }
                });
            }
        });
        
        if (hasScriptChanges) {
            logToExtension('info', '[VisibilityBlocker] 检测到新脚本加载，重新安装阻止器');
            setTimeout(installTabVisibilityBlocker, 500);
        }
    });

    pageObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
    */

    // 获取系统消息未读数
    function getSystemMessageUnreadCount() {
        const messageItem = document.querySelector('li[data-analytics-data*="系统消息"]');
        if (!messageItem) {
            logToExtension('warn', '未找到系统消息元素。');
            return { count: 0, hasUnread: false };
        }
        
        const countSpan = messageItem.querySelector('span');
        if (countSpan && countSpan.innerText) {
            const count = parseInt(countSpan.innerText, 10);
            logToExtension('info', `检测到系统消息未读数: ${count}`);
            return { count: isNaN(count) ? 0 : count, hasUnread: count > 0 };
        }

        logToExtension('info', '系统消息无未读数显示。');
        return { count: 0, hasUnread: false };
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // ** ADDED CHECK: Ensure the extension is still running before processing messages **
        if (!chrome.runtime?.id) {
            // If the extension has been updated or disabled, chrome.runtime.id will be undefined.
            // This prevents the "Extension context invalidated" error.
            return;
        }

        if (message.type === 'ping') {
            sendResponse({ status: 'ready' });
            return true;
        }
        
        if (message.type === 'refreshAndCheckTimeline') {
            logToExtension('info', '收到刷新并检查关注列表指令');
            // 检查当前是否在雪球首页
            if (!window.location.href.startsWith('https://xueqiu.com/')) {
                logToExtension('warn', '当前不在雪球首页，静默等待。');
                sendResponse({ error: '不在雪球首页' });
                return true;
            }

            // 获取存储的上次内容
            chrome.storage.local.get('lastTimelineContent', async (result) => {
                let storedContent = result.lastTimelineContent;
                if (typeof storedContent === 'string') { // 处理旧的字符串格式存储
                    lastTimelineContent = { signature: storedContent, count: 1 }; // 假设旧字符串为一条
                } else {
                    lastTimelineContent = storedContent || { signature: '', count: 0 };
                }
                logToExtension('info', `上次记录的内容: ${lastTimelineContent.signature.substring(0, 30)}... (连续 ${lastTimelineContent.count} 条)`);

                const responseData = {};

                try {
                    // 点击关注 Tab
                    await clickFollowTab();

                    // 等待内容加载
                    await waitForContentLoad();

                    // 获取最新帖子内容及连续计数
                    const currentTopPost = getTopPostDetails(); // 预期返回 { signature: string, count: number } 或 { error: string }
                    
                    if (currentTopPost && currentTopPost.error) {
                        responseData.error = currentTopPost.error;
                        logToExtension('warn', `获取内容时遇到错误: ${currentTopPost.error}`);
                    } else if (currentTopPost && (currentTopPost.signature !== lastTimelineContent.signature || currentTopPost.count !== lastTimelineContent.count)) {
                        logToExtension('info', '检测到关注列表新内容！');
                        // 更新存储
                        await chrome.storage.local.set({ lastTimelineContent: currentTopPost });
                        lastTimelineContent = currentTopPost;
                        responseData.newContent = currentTopPost.signature; // 仅发送 signature 到 background
                    } else {
                        logToExtension('info', '关注列表无新内容或无变化。');
                        responseData.newContent = null;
                    }

                    // 如果需要检查系统消息
                    if (message.options && message.options.checkSystemMessages) {
                        responseData.systemMessages = getSystemMessageUnreadCount();
                    }

                    // 向 background.js 发送所有相关数据
                    sendResponse({ success: true, data: responseData });

                } catch (error) {
                    logToExtension('error', `处理刷新和检查关注列表时发生错误: ${error.message}`);
                    sendResponse({ error: error.message });
                }
            });
            return true; // 保持消息通道开放，以便异步响应
        }
        
        // ------------------ 旧的监控逻辑 (已屏蔽) ------------------
        /*
        if (message.type === 'requestSystemMessageData') {
            // 主动轮询请求 - 立即获取当前页面数据
            try {
                const data = getSystemMessageDataFromPage();
                logToExtension('info', '[ActivePolling] 响应主动轮询请求');
                sendResponse({ data: data });
            } catch (error) {
                logToExtension('warn', '[ActivePolling] 获取数据失败', error);
                sendResponse({ data: null, error: error.message });
            }
            return true; // 保持消息通道开放
        }
        
        if (message.type === 'checkForUpdates') {
            // ** MODIFICATION START **
            // 只有在需要监控关注列表时，才点击 "关注" 标签页
            if (message.options.checkTimeline) {
                const allTabs = document.querySelectorAll('.home-timeline-tabs a');
                let followTab = null;
                
                for (const tab of allTabs) {
                    if (tab.innerText.trim() === '关注') {
                        followTab = tab;
                        break;
                    }
                }

                if (followTab) {
                    followTab.click();
                } else {
                    // 仅当需要检查关注列表却找不到tab时，才发送错误
                    sendResponse({ error: '无法找到"关注"标签页，请确认您已登录并在雪球首页。' });
                    return; // 提前返回，中断后续操作
                }
            }
            // ** MODIFICATION END **

            // 无论是否点击，都等待一小段时间以确保DOM状态稳定
            // 如果只检查系统消息，这个等待是无害的
            setTimeout(() => {
                try {
                    const data = {};
                    if (message.options.checkTimeline) {
                        data.timeline = getTimelineData();
                    }
                    if (message.options.checkMessages) {
                        data.systemMessages = getSystemMessageData();
                    }
                    sendResponse({ data });
                } catch (e) {
                    sendResponse({ error: e.message });
                }
            }, 500);

            return true;
        } 
        
        else if (message.type === 'clickSystemMessage') {
            const messageLink = document.querySelector('li[data-analytics-data*="系统消息"] a');
            if (messageLink) {
                logToExtension('info', '检测到新系统消息，正在点击链接');
                messageLink.click();
            }
        }

        // ** NEW LOGIC: Handle navigation request from background script **
        else if (message.type === 'navigateToHome') {
            console.log("收到跳转指令，正在点击'关注'标签页...");
            const allTabs = document.querySelectorAll('.home-timeline-tabs a');
            let followTab = null;
            for (const tab of allTabs) {
                if (tab.innerText.trim() === '关注') {
                    followTab = tab;
                    break;
                }
            }
            if (followTab) {
                followTab.click();
                window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top smoothly
            }
        }

        // ** NEW LOGIC: Handle system message page monitoring **
        else if (message.type === 'monitorSystemMessagePage') {
            logToExtension('info', '开始监控系统消息页面的雪球组合会话');
            setupSystemMessagePageMonitor();
            sendResponse({ status: 'monitoring_started' });
        }
        */
        // ------------------ 旧的监控逻辑结束 ------------------

        // Fallback for unhandled messages
        return false; 
    });

    /*
    function getTimelineData() {
        const posts = document.querySelectorAll('.status-list > article.timeline__item:nth-child(-n+10)');
        if (posts.length === 0) {
            throw new Error("关注列表为空，无法获取内容。");
        }

        const topPost = posts[0];
        const topUserEl = topPost.querySelector('.user-name');
        const topContentEl = topPost.querySelector('.timeline__item__content .content--description');

        if (!topUserEl || !topContentEl) {
            throw new Error("无法解析第一条帖子的内容。");
        }
        
        const topPostDetails = {
            user: topUserEl.innerText.trim(),
            content: topContentEl.innerText.trim()
        };
        const signature = `${topPostDetails.user}-${topPostDetails.content}`;

        let consecutiveCount = 0;
        for (const post of posts) {
            const userEl = post.querySelector('.user-name');
            const contentEl = post.querySelector('.timeline__item__content .content--description');
            if (userEl && contentEl) {
                const currentSignature = `${userEl.innerText.trim()}-${contentEl.innerText.trim()}`;
                if (currentSignature === signature) {
                    consecutiveCount++;
                } else {
                    break;
                }
            }
        }

        return { signature, count: consecutiveCount, topPost: topPostDetails };
    }
    */

    /*
    function getSystemMessageData() {
        // 检查是否在系统消息页面
        if (window.location.href.includes('/center/#/sys-message')) {
            return getSystemMessageDataFromPage();
        }
        
        // 原有的主页面逻辑
        const messageItem = document.querySelector('li[data-analytics-data*="系统消息"]');
        if (!messageItem) {
            throw new Error("无法找到系统消息元素。");
        }
        
        const countSpan = messageItem.querySelector('span');
        if (countSpan && countSpan.innerText) {
            const count = parseInt(countSpan.innerText, 10);
            return { count: isNaN(count) ? 0 : count, hasUnread: true };
        }

        return { count: 0, hasUnread: false };
    }
    */

    /*
    function getSystemMessageDataFromPage() {
        try {
            // 等待页面加载完成
            const waitForElement = (selector, timeout = 5000) => {
                return new Promise((resolve) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        resolve(element);
                        return;
                    }
                    
                    const observer = new MutationObserver(() => {
                        const element = document.querySelector(selector);
                        if (element) {
                            observer.disconnect();
                            resolve(element);
                        }
                    });
                    
                    observer.observe(document.body, { childList: true, subtree: true });
                    
                    setTimeout(() => {
                        observer.disconnect();
                        resolve(null);
                    }, timeout);
                });
            };

            // 尝试多种可能的选择器
            const possibleSelectors = [
                '.message-list',
                '.sys-message-list', 
                '[class*="message-list"]',
                '[class*="list"]',
                '.content',
                '[class*="content"]',
                'ul',
                '.messages'
            ];

            let messageList = null;
            for (const selector of possibleSelectors) {
                messageList = document.querySelector(selector);
                if (messageList && messageList.children.length > 0) {
                    break;
                }
            }

            if (!messageList) {
                logToExtension('warn', '系统消息页面：未找到消息列表容器，尝试使用整个页面');
                messageList = document.body;
            }

            // 查找所有可能的消息元素
            const allMessages = messageList.querySelectorAll('li, .message-item, [class*="message"], div[class*="item"], .item');
            
            // 检查是否有调仓相关的消息
            const portfolioMessages = Array.from(allMessages).filter(msg => {
                const text = msg.textContent || '';
                return text.includes('调仓') || text.includes('组合') || text.includes('买入') || text.includes('卖出') || text.includes('持仓');
            });

            // 检查未读状态 - 使用多种可能的未读标识
            const hasUnreadPortfolio = portfolioMessages.some(msg => {
                const classList = Array.from(msg.classList);
                const hasUnreadClass = classList.some(cls => 
                    cls.includes('unread') || cls.includes('new') || cls.includes('active')
                );
                const hasUnreadChild = msg.querySelector('.unread, .new, [class*="unread"], [class*="new"]');
                const hasUnreadStyle = msg.style.fontWeight === 'bold' || 
                                     getComputedStyle(msg).fontWeight === 'bold' ||
                                     getComputedStyle(msg).fontWeight === '700';
                
                return hasUnreadClass || hasUnreadChild || hasUnreadStyle;
            });

            // 如果没有找到明确的未读标识，检查是否有新的调仓消息（基于时间或其他标识）
            let hasUnread = hasUnreadPortfolio;
            if (!hasUnread && portfolioMessages.length > 0) {
                // 假设最新的消息可能是未读的
                const latestMessage = portfolioMessages[0];
                if (latestMessage) {
                    hasUnread = true;
                }
            }

            const count = portfolioMessages.length;

            logToExtension('info', `系统消息页面检查结果 - 总消息: ${allMessages.length}, 组合消息: ${count}, 未读: ${hasUnread}`);
            
            return { count, hasUnread };
        } catch (error) {
            logToExtension('error', '系统消息页面数据获取失败', error);
            return { count: 0, hasUnread: false };
        }
    }
    */

    /*
    function setupSystemMessageObserver() {
        const targetNode = document.querySelector('li[data-analytics-data*="系统消息"]');

        if (!targetNode) {
            return false;
        }

        let debounceTimer = null;
        let lastMessageData = null;

        const observer = new MutationObserver((mutationsList, observer) => {
            // ** ADDED CHECK: The most important fix for the error **
            if (!chrome.runtime?.id) {
                // The extension context has been invalidated (e.g., reloaded).
                // Disconnect the observer to prevent further errors.
                observer.disconnect();
                return;
            }

            logToExtension('info', 'MutationObserver: 检测到系统消息元素变化');
            
            // 清除之前的定时器
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            
            // 设置防抖定时器（500ms）
            debounceTimer = setTimeout(() => {
                try {
                    const systemMessageData = getSystemMessageData();
                    
                    // 检查数据是否真的发生了变化
                    const currentDataStr = JSON.stringify(systemMessageData);
                    const lastDataStr = JSON.stringify(lastMessageData);
                    
                    if (currentDataStr !== lastDataStr) {
                        console.log("MutationObserver: 系统消息数据发生变化，发送更新消息", systemMessageData);
                        lastMessageData = systemMessageData;
                        
                        chrome.runtime.sendMessage({
                            type: 'proactiveSystemMessageUpdate',
                            data: systemMessageData
                        });
                    } else {
                        console.log("MutationObserver: 系统消息数据未发生实际变化，跳过发送");
                    }
                } catch (e) {
                    console.error("MutationObserver: " + e.message);
                }
            }, 500);
        });

        const config = { childList: true, subtree: true, characterData: true };
        observer.observe(targetNode, config);

        console.log("MutationObserver: 已成功附加到系统消息元素。");
        return true;
    }

    const setupInterval = setInterval(() => {
        if (setupSystemMessageObserver()) {
            clearInterval(setupInterval);
        }
    }, 2000);
    */

    /*
    // 如果当前在系统消息页面，自动启动页面监控
    if (window.location.href.includes('/center/#/sys-message')) {
        logToExtension('info', '检测到系统消息页面，自动启动监控');
        setTimeout(() => {
            setupSystemMessagePageMonitor();
        }, 2000); // 等待页面完全加载
    }

    // ** NEW FUNCTION: Monitor system message page for portfolio updates **
    function setupSystemMessagePageMonitor() {
        // Check if we're on the system message page
        if (!window.location.href.includes('xueqiu.com/center/#/sys-message')) {
            logToExtension('info', "不在系统消息页面，跳过监控设置");
            return;
        }

        logToExtension('info', "设置系统消息页面监控...");
        
        // Store processed message details to prevent duplicates
        let processedMessageDetails = new Set();
        
        // Flag to track if this is the first message detection (skip notification for first message)
        let isFirstMessageDetection = true;

        // 立即执行一次检查
        setTimeout(() => {
            checkPortfolioSession();
        }, 1000);

        // Function to monitor message details in im_message_wrap
        function checkMessageDetails() {
            const messageWrap = document.querySelector('.im_message_wrap');
            if (!messageWrap) {
                return; // Node doesn't exist yet
            }

            // Find all message items in the wrap
            const messageItems = messageWrap.querySelectorAll('.item_msg_item.snbim_card_msg.snbim_bigcard');
            if (messageItems.length === 0) {
                return;
            }

            // Get the last (bottom) message item
            const lastMessageItem = messageItems[messageItems.length - 1];
            const messageId = lastMessageItem.getAttribute('data-messageid');
            
            if (!messageId) {
                return;
            }

            // Check if this message has already been processed
            if (processedMessageDetails.has(messageId)) {
                return;
            }

            // Extract portfolio adjustment details
            const cardContent = lastMessageItem.querySelector('.snbim_card_con');
            if (!cardContent) {
                return;
            }

            const contentText = cardContent.textContent.trim();
            
            // Check if this is a portfolio adjustment message
            if (contentText.includes('调整了') && (contentText.includes('股票') || contentText.includes('基金') || contentText.includes('ETF'))) {
                // Extract portfolio name from the title
                const titleElement = lastMessageItem.querySelector('.snbim_card_title');
                const portfolioNameMatch = titleElement ? titleElement.textContent.match(/你关注的「(.+?)」刚有一笔新调仓/) : null;
                const portfolioName = portfolioNameMatch ? portfolioNameMatch[1] : '未知组合';

                // Mark this message as processed
                processedMessageDetails.add(messageId);

                logToExtension('info', `检测到新的调仓详情 - 组合: ${portfolioName}, 内容: ${contentText}`);

                // Skip notification for the first message detection (likely triggered by manual click)
                if (isFirstMessageDetection) {
                    logToExtension('info', `跳过第一条消息的提醒 - 组合: ${portfolioName} (可能是手动点击触发)`);
                    isFirstMessageDetection = false;
                    return;
                }

                // Send notification to background script for subsequent messages
                chrome.runtime.sendMessage({
                    type: 'portfolioDetailDetected',
                    data: {
                        portfolioName: portfolioName,
                        adjustmentDetail: contentText,
                        messageId: messageId
                    }
                });
            }
        }



        // Smart initial check - wait for elements to be available
        function waitForElementsAndCheck() {
            const sessionContainer = document.querySelector('.snbim-nsession-listwrap');
            const sessionItems = document.querySelectorAll('.session_item');
            
            if (sessionContainer && sessionItems.length > 0) {
                console.log("页面元素已加载，开始首次检查雪球组合会话...");
                checkPortfolioSession();
            } else {
                console.log("等待页面元素加载...");
                setTimeout(waitForElementsAndCheck, 200);
            }
        }
        
        // Start smart waiting after minimal delay
        setTimeout(waitForElementsAndCheck, 300);

        // Set up MutationObserver to monitor changes
        const observer = new MutationObserver(() => {
            checkPortfolioSession();
        });

        // Observe the session list container
        const sessionContainer = document.querySelector('.snbim-nsession-listwrap');
        if (sessionContainer) {
            observer.observe(sessionContainer, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['style']
            });
            console.log("系统消息页面监控已设置完成");
        } else {
            console.log("未找到会话列表容器，稍后重试...");
            setTimeout(setupSystemMessagePageMonitor, 2000);
        }

        // Set up observer for message details
        function setupMessageDetailsObserver() {
            const messageWrap = document.querySelector('.im_message_wrap');
            if (messageWrap) {
                const detailObserver = new MutationObserver((mutations) => {
                    // Check if this is a real content change (new message)
                    let hasRealContentChange = false;
                    mutations.forEach(mutation => {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            // Check if added nodes contain message content
                            mutation.addedNodes.forEach(node => {
                                if (node.nodeType === Node.ELEMENT_NODE && 
                                    (node.classList?.contains('snbim_card') || 
                                     node.querySelector?.('.snbim_card'))) {
                                    hasRealContentChange = true;
                                }
                            });
                        }
                    });
                    
                    // If this is a real content change after the initial load, allow notifications
                    if (hasRealContentChange && !isFirstMessageDetection) {
                        logToExtension('info', 'MutationObserver: 检测到新消息内容变化');
                    }
                    
                    checkMessageDetails();
                });
                
                detailObserver.observe(messageWrap, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
                
                console.log("消息详情监控已设置完成");
                
                // Initial check (this will skip the first message notification)
                checkMessageDetails();
                
                // After initial check, reset the flag to allow future notifications
                setTimeout(() => {
                    isFirstMessageDetection = false;
                    logToExtension('info', '初始消息检查完成，后续新消息将正常提醒');
                }, 2000); // Wait 2 seconds after initial check
            } else {
                // If im_message_wrap doesn't exist yet, set up a global observer to watch for it
                const globalObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (node.classList && node.classList.contains('im_message_wrap')) {
                                    console.log("检测到im_message_wrap节点出现，设置详情监控");
                                    setupMessageDetailsObserver();
                                    globalObserver.disconnect();
                                } else if (node.querySelector && node.querySelector('.im_message_wrap')) {
                                    console.log("检测到im_message_wrap节点出现，设置详情监控");
                                    setupMessageDetailsObserver();
                                    globalObserver.disconnect();
                                }
                            }
                        });
                    });
                });
                
                globalObserver.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                
                console.log("等待im_message_wrap节点出现...");
            }
        }

        // Set up message details observer
        setupMessageDetailsObserver();
    }
    */
}