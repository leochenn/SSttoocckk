// A flag to ensure the listener is only added once.
if (typeof window.contentScriptInjected === 'undefined') {
    window.contentScriptInjected = true;

    console.log("雪球助手内容脚本已注入并运行。");

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'ping') {
            sendResponse({ status: 'ready' });
            return true;
        }
        
        if (message.type === 'checkForUpdates') {
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
                sendResponse({ error: '无法找到"关注"标签页，请确认您已登录并在雪球首页。' });
                return;
            }

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
                console.log("检测到新系统消息，正在点击链接...");
                messageLink.click();
            }
        }
    });

    function getTimelineData() {
        const firstPost = document.querySelector('.status-list > article.timeline__item:first-child');
        if (!firstPost) {
            throw new Error("无法找到关注列表的第一条内容。");
        }

        const userEl = firstPost.querySelector('.user-name');
        const contentEl = firstPost.querySelector('.timeline__item__content .content--description');

        if (userEl && contentEl) {
            // ** MODIFIED LOGIC **
            // Return only the user and content, which are stable.
            return {
                user: userEl.innerText.trim(),
                content: contentEl.innerText.trim()
            };
        }
        throw new Error("无法解析帖子内容，页面结构可能已改变。");
    }

    function getSystemMessageData() {
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
}