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
    });

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