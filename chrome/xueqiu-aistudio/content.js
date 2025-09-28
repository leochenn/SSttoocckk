console.log("雪球消息监控助手内容脚本已加载。");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'checkForUpdates') {
        // It's better to reload the feed by clicking the tab, as requested.
        const followTab = document.querySelector('.home-timeline-tabs .sticky a[href="https://xueqiu.com/"]');
        if (followTab) {
            followTab.click();
        }

        // Wait a moment for potential content refresh after click
        setTimeout(() => {
            const data = {};
            if (message.options.checkTimeline) {
                data.timeline = getTimelineData();
            }
            if (message.options.checkMessages) {
                data.systemMessages = getSystemMessageData();
            }
            chrome.runtime.sendMessage({ type: 'contentData', data });
        }, 500); // 0.5s delay
    } else if (message.type === 'clickSystemMessage') {
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
        console.error("无法找到关注列表的第一条内容。");
        return null;
    }

    const userEl = firstPost.querySelector('.user-name');
    const timeEl = firstPost.querySelector('.date-and-source');
    const contentEl = firstPost.querySelector('.timeline__item__content .content--description');

    if (userEl && timeEl && contentEl) {
        return {
            user: userEl.innerText.trim(),
            time: timeEl.innerText.split('·')[0].trim(), // Remove source part like '· 来自Android'
            content: contentEl.innerText.trim()
        };
    }
    return null;
}

function getSystemMessageData() {
    const messageItem = document.querySelector('li[data-analytics-data*="系统消息"]');
    if (!messageItem) {
        console.error("无法找到系统消息元素。");
        return { count: 0, hasUnread: false };
    }
    
    const countSpan = messageItem.querySelector('span');
    if (countSpan && countSpan.innerText) {
        const count = parseInt(countSpan.innerText, 10);
        return { count: isNaN(count) ? 0 : count, hasUnread: true };
    }

    return { count: 0, hasUnread: false };
}