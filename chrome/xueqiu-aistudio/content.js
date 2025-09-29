if (typeof window.contentScriptInjected === 'undefined') {
    window.contentScriptInjected = true;
    console.log("雪球助手内容脚本已注入并运行。");

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

    function setupSystemMessageObserver() {
        const targetNode = document.querySelector('li[data-analytics-data*="系统消息"]');

        if (!targetNode) {
            return false;
        }

        const observer = new MutationObserver((mutationsList, observer) => {
            // ** ADDED CHECK: The most important fix for the error **
            if (!chrome.runtime?.id) {
                // The extension context has been invalidated (e.g., reloaded).
                // Disconnect the observer to prevent further errors.
                observer.disconnect();
                return;
            }

            console.log("MutationObserver: 检测到系统消息元素变化。");
            try {
                const systemMessageData = getSystemMessageData();
                chrome.runtime.sendMessage({
                    type: 'proactiveSystemMessageUpdate',
                    data: systemMessageData
                });
            } catch (e) {
                // This catch block is now less likely to be needed for this specific error,
                // but it's good practice to keep it.
                console.error("MutationObserver: " + e.message);
            }
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
}