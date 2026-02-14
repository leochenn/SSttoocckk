if (typeof window.contentScriptInjected === 'undefined') {
    window.contentScriptInjected = true;
    console.log("雪球助手内容脚本已注入并运行。");

    const MSG_TYPES = {
        CONTENT_LOG: 'contentLog',
        CHECK_TIMELINE: 'refreshAndCheckTimeline',
        NAVIGATE_HOME: 'navigateToHome'
    };

    const SELECTORS = {
        FOLLOW_TAB_CONTAINER: '.home-timeline-tabs .sticky-content-fixed',
        STATUS_LIST: '.status-list',
        TIMELINE_ITEM: '.status-list article.timeline__item',
        POST_CONTENT: '.timeline__item__content .content--description',
        USER_NAME: '.user-name',
        LOADING_INDICATORS: '.status-list .loading, .status-list .loading-icon, .status-list .loading-text',
        SYSTEM_MSG_ITEM: 'li[data-analytics-data*="系统消息"]'
    };

    /**
     * DOM 解析逻辑 (对应 modules/dom-parser.js)
     */
    const domParser = {
        getTopPostDetails() {
            const posts = document.querySelectorAll(SELECTORS.TIMELINE_ITEM);
            if (posts.length === 0) return { error: 'NO_POSTS' };

            const firstPost = posts[0];
            const contentEl = firstPost.querySelector(SELECTORS.POST_CONTENT);
            if (!contentEl) return { error: 'NO_CONTENT_DESCRIPTION' };

            const userEl = firstPost.querySelector(SELECTORS.USER_NAME);
            const userName = userEl ? (userEl.textContent || '').trim() : '未知用户';
            const postContent = (contentEl.textContent || '').trim();
            const topSignature = `${userName}: ${postContent}`;
            
            let consecutiveCount = 0;
            for (const post of posts) {
                const curUser = post.querySelector(SELECTORS.USER_NAME);
                const curCont = post.querySelector(SELECTORS.POST_CONTENT);
                if (curUser && curCont) {
                    const curSig = `${(curUser.textContent || '').trim()}: ${(curCont.textContent || '').trim()}`;
                    if (curSig === topSignature) consecutiveCount++;
                    else break;
                } else break;
            }
            
            return { signature: topSignature, count: consecutiveCount };
        },

        getSystemMessageUnreadCount() {
            const messageItem = document.querySelector(SELECTORS.SYSTEM_MSG_ITEM);
            if (!messageItem) return { count: 0, hasUnread: false };
            const countSpan = messageItem.querySelector('span');
            const count = countSpan ? parseInt(countSpan.textContent || '0', 10) : 0;
            return { count: isNaN(count) ? 0 : count, hasUnread: count > 0 };
        }
    };

    /**
     * 内容脚本专用的日志对象 (模拟 modules/logger.js 的行为)
     */
    const logger = {
        _log(level, message, data) {
            const timestamp = new Date().toLocaleTimeString();
            let levelLabel = '🔵 INFO:';
            if (level === 'error') levelLabel = '🔴 ERROR:';
            else if (level === 'warn') levelLabel = '🟠 WARN:';

            const formattedMessage = `[Content-${timestamp}] ${levelLabel} ${message}`;
            
            console.log(formattedMessage, data || '');

            if (chrome.runtime?.id) {
                try {
                    chrome.runtime.sendMessage({
                        type: MSG_TYPES.CONTENT_LOG,
                        data: { level, message, data }
                    });
                } catch (e) {}
            }
        },
        info(msg, data) { this._log('info', msg, data); },
        warn(msg, data) { this._log('warn', msg, data); },
        error(msg, data) { this._log('error', msg, data); }
    };

    logger.info('雪球助手内容脚本已初始化');

    let lastTimelineContent = { signature: '', count: 0 };

    // 核心动作 1：点击“关注” Tab
    async function clickFollowTab() {
        logger.info('尝试点击“关注”Tab...');
        const followTabContainer = document.querySelector(SELECTORS.FOLLOW_TAB_CONTAINER);
        let followTab = null;
        if (followTabContainer) {
            const potentialTabs = followTabContainer.querySelectorAll('a');
            for (const tab of potentialTabs) {
                if ((tab.textContent || '').trim() === '关注') {
                    followTab = tab;
                    break;
                }
            }
        }
        
        if (followTab) {
            followTab.click();
            logger.info('成功点击“关注”Tab。');
            return true;
        } else {
            logger.warn('未找到“关注”Tab。');
            throw new Error('未找到“关注”Tab');
        }
    }

    // 核心动作 2：等待内容加载完成
    async function waitForContentLoad(timeout = 5000) {
        logger.info('等待内容加载...');
        const statusList = document.querySelector(SELECTORS.STATUS_LIST);
        if (!statusList) {
            logger.warn('未找到 .status-list 容器。');
            return;
        }

        let initialChildCount = statusList.children.length;
        let initialFirstChildHTML = statusList.firstElementChild ? statusList.firstElementChild.innerHTML : '';

        let attempt = 0;
        const maxAttempts = timeout / 200;

        while (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
            const currentChildCount = statusList.children.length;
            const currentFirstChildHTML = statusList.firstElementChild ? statusList.firstElementChild.innerHTML : '';
            const loadingIndicator = document.querySelector(SELECTORS.LOADING_INDICATORS);
            
            if (!loadingIndicator && (currentChildCount !== initialChildCount || currentFirstChildHTML !== initialFirstChildHTML)) {
                logger.info('检测到 DOM 变更，加载完成。');
                return;
            } else if (!loadingIndicator && attempt > 0) {
                logger.info('无加载指示器，视为加载完成。');
                return;
            }
            attempt++;
        }
        logger.warn('等待内容加载超时。');
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!chrome.runtime?.id) return;

        if (message.type === MSG_TYPES.CHECK_TIMELINE) {
            if (!window.location.href.startsWith('https://xueqiu.com/')) {
                sendResponse({ error: '不在雪球首页' });
                return true;
            }

            chrome.storage.local.get('lastTimelineContent', async (result) => {
                const responseData = {};

                try {
                    await clickFollowTab();
                    await waitForContentLoad();
                    
                    responseData.newContent = domParser.getTopPostDetails();

                    if (message.options?.checkSystemMessages) {
                        responseData.systemMessages = domParser.getSystemMessageUnreadCount();
                    }
                    sendResponse({ success: true, data: responseData });
                } catch (error) {
                    sendResponse({ error: error.message });
                }
            });
            return true;
        }
        
        if (message.type === MSG_TYPES.NAVIGATE_HOME) {
            window.location.href = 'https://xueqiu.com/';
            return;
        }
        return false; 
    });
}
