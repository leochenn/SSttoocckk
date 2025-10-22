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

        // ** NEW LOGIC: Handle system message page monitoring **
        else if (message.type === 'monitorSystemMessagePage') {
            console.log("开始监控系统消息页面的雪球组合会话...");
            setupSystemMessagePageMonitor();
            sendResponse({ status: 'monitoring_started' });
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

            console.log("MutationObserver: 检测到系统消息元素变化。");
            
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

    // ** NEW FUNCTION: Monitor system message page for portfolio updates **
    function setupSystemMessagePageMonitor() {
        // Check if we're on the system message page
        if (!window.location.href.includes('xueqiu.com/center/#/sys-message')) {
            console.log("不在系统消息页面，跳过监控设置");
            return;
        }

        console.log("设置系统消息页面监控...");
        
        // Store the last known state
        let lastPortfolioState = null;
        
        // Store processed message details to prevent duplicates
        let processedMessageDetails = new Set();

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

                console.log(`检测到新的调仓详情 - 组合: ${portfolioName}, 内容: ${contentText}`);

                // Send notification to background script
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
                const detailObserver = new MutationObserver(() => {
                    checkMessageDetails();
                });
                
                detailObserver.observe(messageWrap, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
                
                console.log("消息详情监控已设置完成");
                
                // Initial check
                checkMessageDetails();
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
}