/**
 * 雪球监控助手 - 内容脚本 (传感器架构)
 */

if (typeof window.contentScriptInjected === 'undefined') {
    window.contentScriptInjected = true;

    const XueqiuSensor = {
        /**
         * 统一日志系统
         */
        log(level, message, data = null) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `[Content-${timestamp}] ${message}`;
            
            // 本地控制台输出
            try {
                if (level === 'error') console.error(logEntry, data || '');
                else if (level === 'warn') console.warn(logEntry, data || '');
                else console.log(logEntry, data || '');
            } catch (e) {}
            
            // 发送到 Background
            if (chrome.runtime?.id) {
                try {
                    chrome.runtime.sendMessage({
                        type: 'contentLog',
                        data: { level, message: logEntry, data }
                    });
                } catch (e) {}
            }
        },

        /**
         * 时间线相关传感器
         */
        timeline: {
            // 点击“关注” Tab
            async clickFollowTab() {
                XueqiuSensor.log('info', '尝试点击“关注”Tab...');
                const container = document.querySelector('.home-timeline-tabs .sticky-content-fixed');
                if (!container) throw new Error('未找到 Tab 容器');

                const followTab = Array.from(container.querySelectorAll('a'))
                    .find(tab => tab.innerText.trim() === '关注');
                
                if (followTab) {
                    followTab.click();
                    return true;
                }
                throw new Error('未找到“关注”Tab');
            },

            // 等待内容加载
            async waitForLoad(timeout = 5000) {
                XueqiuSensor.log('info', '等待内容加载...');
                const statusList = document.querySelector('.status-list');
                if (!statusList) return;

                const initialCount = statusList.children.length;
                const initialHTML = statusList.firstElementChild?.innerHTML || '';

                let attempt = 0;
                while (attempt < timeout / 200) {
                    await new Promise(r => setTimeout(r, 200));
                    const currentCount = statusList.children.length;
                    const currentHTML = statusList.firstElementChild?.innerHTML || '';
                    const loading = document.querySelector('.status-list .loading, .status-list .loading-icon');
                    
                    if (!loading && (currentCount !== initialCount || currentHTML !== initialHTML)) {
                        return;
                    }
                    attempt++;
                }
            },

            // 获取顶部帖子详情
            getTopPostDetails() {
                const posts = document.querySelectorAll('.status-list article.timeline__item');
                if (posts.length === 0) return { error: 'NO_POSTS' };

                const firstPost = posts[0];
                const contentEl = firstPost.querySelector('.timeline__item__content .content--description');
                const userEl = firstPost.querySelector('.user-name');
                
                if (!contentEl) return { error: 'NO_CONTENT_DESCRIPTION' };

                const userName = userEl ? userEl.innerText.trim() : '未知用户';
                const postContent = contentEl.innerText.trim();
                const topSignature = `${userName}: ${postContent}`;
                
                let consecutiveCount = 0;
                for (const post of posts) {
                    const u = post.querySelector('.user-name')?.innerText.trim();
                    const c = post.querySelector('.timeline__item__content .content--description')?.innerText.trim();
                    if (`${u}: ${c}` === topSignature) consecutiveCount++;
                    else break;
                }
                
                return { signature: topSignature, count: consecutiveCount };
            }
        },

        /**
         * 系统消息相关传感器
         */
        system: {
            getUnreadCount() {
                const item = document.querySelector('li[data-analytics-data*="系统消息"]');
                if (!item) return { count: 0, hasUnread: false };
                
                const span = item.querySelector('span');
                const count = span ? parseInt(span.innerText, 10) : 0;
                return { count: isNaN(count) ? 0 : count, hasUnread: count > 0 };
            },

            // 获取详情页中的调仓消息
            getPortfolioDataFromPage() {
                try {
                    const messageList = document.querySelector('.message-list, .sys-message-list, [class*="message-list"]');
                    if (!messageList) return null;

                    const allMessages = messageList.querySelectorAll('li, .message-item, [class*="message"]');
                    const portfolioMessages = Array.from(allMessages).filter(msg => {
                        const text = msg.textContent || '';
                        return text.includes('调仓') || text.includes('组合');
                    });

                    // 检查是否有未读标识
                    const hasUnread = portfolioMessages.some(msg => 
                        msg.querySelector('.unread, .new, [class*="unread"], [class*="new"]') ||
                        getComputedStyle(msg).fontWeight === 'bold' || 
                        getComputedStyle(msg).fontWeight === '700'
                    );

                    return { count: portfolioMessages.length, hasUnread };
                } catch (e) {
                    XueqiuSensor.log('warn', '获取详情页调仓数据失败', e.message);
                    return null;
                }
            },

            // 启动系统消息图标监听
            setupIconObserver() {
                const targetNode = document.querySelector('li[data-analytics-data*="系统消息"]');
                if (!targetNode) return false;

                let debounceTimer = null;
                let lastDataStr = '';

                const observer = new MutationObserver(() => {
                    if (!chrome.runtime?.id) {
                        observer.disconnect();
                        return;
                    }

                    if (debounceTimer) clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        const data = XueqiuSensor.system.getUnreadCount();
                        const currentDataStr = JSON.stringify(data);
                        if (currentDataStr !== lastDataStr) {
                            lastDataStr = currentDataStr;
                            chrome.runtime.sendMessage({
                                type: 'proactiveSystemMessageUpdate',
                                data: data
                            });
                        }
                    }, 500);
                });

                observer.observe(targetNode, { childList: true, subtree: true, characterData: true });
                return true;
            }
        },

        /**
         * 导航功能
         */
        navigation: {
            async toHome() {
                XueqiuSensor.log('info', '执行导航到首页关注列表');
                try {
                    await XueqiuSensor.timeline.clickFollowTab();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } catch (e) {
                    XueqiuSensor.log('error', '导航失败', e.message);
                }
            }
        }
    };

    // 消息监听
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!chrome.runtime?.id) return;

        if (message.type === 'ping') {
            sendResponse({ status: 'ready' });
        }
        else if (message.type === 'refreshAndCheckTimeline') {
            handleRefreshAndCheck(message.options, sendResponse);
            return true; // 异步支持
        }
        else if (message.type === 'navigateToHome') {
            XueqiuSensor.navigation.toHome();
        }
        else if (message.type === 'monitorSystemMessagePage') {
            XueqiuSensor.log('info', '启动系统消息页面深度监控');
            // 这里可以添加针对详情页的特定监听逻辑，目前保持基础响应
            sendResponse({ status: 'monitoring_started' });
        }
        else if (message.type === 'requestSystemMessageData') {
            const data = window.location.href.includes('/center/#/sys-message') 
                ? XueqiuSensor.system.getPortfolioDataFromPage() 
                : XueqiuSensor.system.getUnreadCount();
            sendResponse({ data });
        }
        return false;
    });

    /**
     * 处理刷新并检查指令
     */
    async function handleRefreshAndCheck(options, sendResponse) {
        XueqiuSensor.log('info', '收到刷新检查指令');
        
        if (!window.location.href.startsWith('https://xueqiu.com/')) {
            sendResponse({ error: '不在雪球首页' });
            return;
        }

        try {
            const { lastTimelineContent } = await chrome.storage.local.get('lastTimelineContent');
            const lastState = lastTimelineContent || { signature: '', count: 0 };

            await XueqiuSensor.timeline.clickFollowTab();
            await XueqiuSensor.timeline.waitForLoad();
            
            const currentPost = XueqiuSensor.timeline.getTopPostDetails();
            const responseData = {};

            if (currentPost.error) {
                responseData.error = currentPost.error;
            } else if (currentPost.signature !== lastState.signature || currentPost.count !== lastState.count) {
                XueqiuSensor.log('info', '检测到新内容');
                await chrome.storage.local.set({ lastTimelineContent: currentPost });
                responseData.newContent = currentPost.signature;
            }

            if (options?.checkSystemMessages) {
                responseData.systemMessages = XueqiuSensor.system.getUnreadCount();
            }

            sendResponse({ success: true, data: responseData });
        } catch (error) {
            XueqiuSensor.log('error', '处理指令失败', error.message);
            sendResponse({ error: error.message });
        }
    }

    // 初始化：启动系统消息监听
    const setupInterval = setInterval(() => {
        if (XueqiuSensor.system.setupIconObserver()) {
            clearInterval(setupInterval);
        }
    }, 2000);

    XueqiuSensor.log('info', '雪球助手内容脚本已就绪');
}
