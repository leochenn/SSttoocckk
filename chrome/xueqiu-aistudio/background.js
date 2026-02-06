const ALARM_NAME = 'xueqiuMonitorAlarm';
let lastNotificationTimestamp = 0;

// NTFY 服务地址
const NTFY_URL = 'http://118.89.62.149:8090/ctrl_pc';

// 发送 NTFY 通知到 background.js
async function sendNtfyNotificationToBackground(message) {
    log(`准备向 NTFY 发送通知: ${message}`);
    try {
        const response = await fetch(NTFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: message
        });
        if (response.ok) {
            log('NTFY 通知发送成功！');
        } else {
            log(`NTFY 通知发送失败: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        log(`发送 NTFY 通知时出错:`, error);
    }
}


function getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}_`;
}

function log(message) {
    console.log(`${getTimestamp()} ${message}`);
}

async function getSettings() {
    const result = await chrome.storage.local.get('settings');
    return result.settings || {
        monitorTimeline: true,
        monitorSystemMessages: true, // 默认启用系统消息
        interval: 5 // 默认 5 秒
    };
}

async function updateStatus(state, message) {
    const status = { state, message };
    await chrome.storage.local.set({ status });
    try {
        await chrome.runtime.sendMessage({ type: 'statusUpdate', status });
    } catch (e) {
        // Popup is not open, ignore.
    }
}

async function ensureContentScriptInjected(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js'],
        });
    } catch (e) {
        log(`注入脚本到 Tab ${tabId} 失败 (可能页面正在加载或权限问题): ${e.message}`);
    }
}

async function manageAlarmLifecycle() {
    const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*" });
    const settings = await getSettings();

    if (!settings.monitorTimeline) {
        log('关注列表监控开关已关闭，停止闹钟。');
        chrome.alarms.clear(ALARM_NAME);
        await updateStatus('paused', '关注列表监控已禁用');
        return;
    }

    if (tabs.length > 0) {
        log('检测到雪球页面，且关注列表监控已启用，确保闹钟正在运行并使用最新设置。');
        // 强制监控间隔为 5-8 秒的随机值
        createAlarm(); // createAlarm now uses default random interval
        const result = await chrome.storage.local.get('status');
        if (result.status && result.status.message === '等待雪球页面') {
            await updateStatus('running', '监控已启动');
        }
    } else {
        log('未检测到雪球页面，停止闹钟。');
        chrome.alarms.clear(ALARM_NAME);
        await updateStatus('paused', '等待雪球页面');
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        manageAlarmLifecycle();
    }
});

chrome.tabs.onRemoved.addListener(() => {
    manageAlarmLifecycle();
});

chrome.runtime.onInstalled.addListener(async () => {
    log('插件已安装或更新。');
    const settings = await getSettings();
    await chrome.storage.local.set({ settings });
    const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*" });
    if (tabs.length > 0) {
        await ensureContentScriptInjected(tabs[0].id);
    }
    await manageAlarmLifecycle();
});

chrome.runtime.onStartup.addListener(async () => {
    log('浏览器启动。');
    await manageAlarmLifecycle();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
        log('闹钟触发，开始检查...');
        await performCheck();
        // 在每次闹钟触发并完成检查后，重新安排下一个闹钟，以获得新的随机间隔
        createAlarm();
        /*
        log('闹钟触发，检查是否在工作时间...');
        if (isWithinTradingHours()) {
            log('在工作时间内，开始检查...');
            await performCheck();
        } else {
            log('非工作时间，跳过本次检查。');
            await updateStatus('paused', '非工作时间');
        }
        */
    }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'settingsChanged') {
        log('设置已更改，正在更新闹钟。');
        await manageAlarmLifecycle();
    }
    else if (message.type === 'proactiveSystemMessageUpdate') {
        log('收到来自 MutationObserver 的主动更新。');
        if (message.data) {
            const actionTaken = await checkSystemMessageUpdate(message.data, 'MutationObserver');
            if (actionTaken) {
                log('MutationObserver 检测到更新，已直接打开新标签页。');
            }
        }
    }
    else if (message.type === 'portfolioAdjustmentDetected') {
        log('检测到组合调仓消息。');
        if (message.data && message.data.portfolioName) {
            const { portfolioName, message: adjustmentMessage, targetUrl } = message.data;
            log(`组合调仓通知: ${portfolioName} - ${adjustmentMessage}`);
            if (targetUrl) {
                log(`目标URL: ${targetUrl}`);
            }
            
            // Create Windows notification for portfolio adjustment
            createPortfolioNotification(portfolioName, adjustmentMessage, targetUrl);
        }
    }
    else if (message.type === 'portfolioDetailDetected') {
        log('检测到组合调仓详情。');
        if (message.data && message.data.portfolioName) {
            const { portfolioName, adjustmentDetail, messageId } = message.data;
            log(`组合调仓详情通知: ${portfolioName} - ${adjustmentDetail} (消息ID: ${messageId})`);
            
            // Create Windows notification for portfolio adjustment details
            createPortfolioDetailNotification(portfolioName, adjustmentDetail, messageId);
        }
    }
    else if (message.type === 'contentLog') {
        // 处理来自 content script 的日志
        if (message.data) {
            const { level, message: logMessage, data } = message.data;
            if (level === 'error') {
                console.error(logMessage, data);
            } else if (level === 'warn') {
                console.warn(logMessage, data);
            } else {
                console.log(logMessage, data);
            }
        }
    }
    return true;
});

// 处理来自 content script 的 sendNtfy 消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'sendNtfy' && message.message) {
        sendNtfyNotificationToBackground(message.message);
        sendResponse({ success: true });
        return true;
    }
});

function createAlarm(minIntervalSeconds = 5, maxIntervalSeconds = 8) {
    const randomIntervalSeconds = Math.floor(Math.random() * (maxIntervalSeconds - minIntervalSeconds + 1)) + minIntervalSeconds;
    // 先清除旧闹钟，确保只存在一个活动闹钟
    chrome.alarms.clear(ALARM_NAME); 
    chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: randomIntervalSeconds / 60 // 使用随机间隔作为下一次触发的延迟
    });
    log(`闹钟已设置为将在 ${randomIntervalSeconds} 秒后触发。`);
}

function isWithinTradingHours() {
    const now = new Date();
    const day = now.getDay(); // 0 (Sunday) to 6 (Saturday)
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Check if it's a weekday (Monday to Friday)
    if (day === 0 || day === 6) {
        return false;
    }

    // Create a comparable number for the current time, e.g., 9:20 -> 920, 11:31 -> 1131
    const currentTime = hours * 100 + minutes;

    // Morning session: 9:20 AM to 11:31 AM (inclusive)
    const morningStart = 8 * 100 + 20; // 920
    const morningEnd = 11 * 100 + 55; // 1131

    // Afternoon session: 1:00 PM to 3:00 PM (inclusive)
    const afternoonStart = 12 * 100 + 50; // 1300
    const afternoonEnd = 16 * 100 + 0; // 1500

    const isMorningSession = currentTime >= morningStart && currentTime <= morningEnd;
    const isAfternoonSession = currentTime >= afternoonStart && currentTime <= afternoonEnd;

    return isMorningSession || isAfternoonSession;
}

async function performCheck() {
    const settings = await getSettings();
    if (!settings.monitorTimeline) {
        log('关注列表监控开关已关闭，跳过本次检查。');
        await updateStatus('paused', '关注列表监控已禁用');
        return;
    }
    
    try {
        const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*", status: "complete" });
        if (tabs.length === 0) {
            await updateStatus('error', '未找到已加载完成的雪球页面。');
            log('错误：未找到已加载完成的雪球页面。');
            return;
        }
        
        // 寻找包含关注列表的首页标签
        let selectedTab = tabs.find(tab => !tab.url.includes('/center/'));
        if (!selectedTab) {
            selectedTab = tabs[0];
        }
        
        const tabId = selectedTab.id;
        log(`向页面 ${tabId} 发送刷新并检查指令。`);
        
        const response = await chrome.tabs.sendMessage(tabId, {
            type: 'refreshAndCheckTimeline',
            options: {
                checkSystemMessages: settings.monitorSystemMessages
            }
        }).catch(async (error) => {
            log(`与内容脚本通信失败: ${error.message}。尝试重新注入脚本。`);
            await ensureContentScriptInjected(tabId);
            return { error: "脚本无响应，已尝试重新注入，请等待下次检查。" };
        });

        if (response && response.data) {
            const { newContent, systemMessages } = response.data;
            let notified = false;

            // 1. 处理新内容 (Timeline) - 优先级最高
            if (newContent) {
                log(`检测到新内容，已通过内容脚本发送到 NTFY: ${newContent.substring(0, 30)}...`);
                await sendNtfyNotificationToBackground(`雪球有新内容: ${newContent}`);
                notified = true;
            }

            // 2. 处理系统消息 (仅在新内容未触发通知时)
            if (systemMessages && systemMessages.count > 0) {
                const { lastSystemMessageCount = 0 } = await chrome.storage.local.get('lastSystemMessageCount');
                log(`系统消息 - 当前未读数: ${systemMessages.count}, 上次记录未读数: ${lastSystemMessageCount}`);

                if (!notified && systemMessages.count !== lastSystemMessageCount) {
                    log(`检测到系统消息未读数变化！当前有 ${systemMessages.count} 条系统消息。`);
                    await sendNtfyNotificationToBackground(`雪球有 ${systemMessages.count} 条系统消息`);
                    notified = true;
                }
                // 无论是否通知，都记录当前数量用于下次对比
                await chrome.storage.local.set({ lastSystemMessageCount: systemMessages.count });
            } else if (systemMessages && systemMessages.count === 0) {
                // 如果当前未读数为0，则清除记录，确保下次有未读时能提醒
                await chrome.storage.local.set({ lastSystemMessageCount: 0 });
            }
            
            await updateStatus('running', '关注列表和系统消息检查完成');
        } else {
            await updateStatus('running', '检查完成，无新内容或系统消息更新');
        }
    } catch (error) {
        log(`检查过程中发生严重错误: ${error.message}`);
        await updateStatus('error', `检查出错: ${error.message}`);
    }
}

// ** MODIFIED FUNCTION: Centralizes notification logic **
async function handleContentData(response) {
    if (!response) {
        log('内容脚本没有返回任何响应。');
        await updateStatus('error', '内容脚本无响应');
        return;
    }
    log('收到来自内容脚本的响应。');
    if (response.error) {
        log(`内容脚本错误: ${response.error}`);
        await updateStatus('error', `内容脚本错误: ${response.error}`);
        return;
    }
    
    const data = response.data;
    let systemMessageActionTaken = false;
    let timelineNotificationOptions = null;

    if (data.systemMessages) {
        systemMessageActionTaken = await checkSystemMessageUpdate(data.systemMessages, 'Timer');
    }
    if (data.timeline) {
        timelineNotificationOptions = await checkTimelineUpdate(data.timeline);
    }

    // ** PRIORITY LOGIC **
    // If system message action was taken, prioritize it and ignore the timeline update.
    if (systemMessageActionTaken) {
        log('检测到系统消息更新，已直接打开新标签页。');
    } 
    // Otherwise, if there's only a timeline update, show that.
    else if (timelineNotificationOptions) {
        log('仅检测到内容列表更新，进行通知。');
        createNotification('timeline', timelineNotificationOptions);
    }
}

// ** MODIFIED FUNCTION: Returns notification options instead of creating notification **
async function checkTimelineUpdate({ signature, count, topPost }) {
    const { lastTimelineState } = await chrome.storage.local.get('lastTimelineState');

    if (!lastTimelineState) {
        log(`首次运行，设置基准状态: 内容="${signature.substring(0, 20)}...", 数量=${count}`);
        await chrome.storage.local.set({ lastTimelineState: { signature, count } });
        return null; // Don't notify on first run
    }

    let isNew = false;
    if (lastTimelineState.signature !== signature) {
        log(`发现新内容！旧内容: "${lastTimelineState.signature.substring(0, 20)}...", 新内容: "${signature.substring(0, 20)}..."`);
        isNew = true;
    } 
    else if (lastTimelineState.count < count) {
        log(`发现新的相同内容！内容: "${signature.substring(0, 20)}...", 旧数量: ${lastTimelineState.count}, 新数量: ${count}`);
        isNew = true;
    }

    if (isNew) {
        await chrome.storage.local.set({ lastTimelineState: { signature, count } });
        const { user, content } = topPost;
        const notificationContent = `${user}: ${content.substring(0, 20)}...`;
        // Return the options object for the notification
        return {
            title: '雪球 - 关注列表更新',
            message: notificationContent,
            url: 'https://xueqiu.com/'
        };
    } else {
        log('关注列表无新内容。');
        return null;
    }
}

// ** MODIFIED FUNCTION: Directly opens new tab or switches to existing tab **
async function checkSystemMessageUpdate({ count, hasUnread }, source = 'unknown') {
    const { lastMessageCount = 0, lastSystemMessageActionTime = 0 } = await chrome.storage.local.get(['lastMessageCount', 'lastSystemMessageActionTime']);
    const currentTime = Date.now();
    
    log(`[${source}] 检查系统消息更新 - 当前数量: ${count}, 有未读: ${hasUnread}, 上次数量: ${lastMessageCount}`);
    
    if (hasUnread && count > lastMessageCount) {
        // 防止短时间内重复操作（5秒内）
        if (currentTime - lastSystemMessageActionTime < 5000) {
            log(`[${source}] 检测到新系统消息，但距离上次操作时间过短 (${currentTime - lastSystemMessageActionTime}ms)，跳过操作`);
            return false;
        }
        
        log(`[${source}] 发现新系统消息！旧数量: ${lastMessageCount}, 新数量: ${count}`);
        await chrome.storage.local.set({ 
            lastMessageCount: count,
            lastSystemMessageActionTime: currentTime
        });
        
        const url = 'https://xueqiu.com/center/#/sys-message';
        
        // Check if system message page is already open
        const existingTabs = await chrome.tabs.query({ url: 'https://xueqiu.com/center/*' });
        const systemMessageTab = existingTabs.find(tab => tab.url.includes('#/sys-message'));
        
        if (systemMessageTab) {
            // Switch to existing system message tab
            log(`[${source}] 检测到新系统消息，跳转到已有的系统消息页面: ${systemMessageTab.url}`);
            await chrome.windows.update(systemMessageTab.windowId, { focused: true });
            await chrome.tabs.update(systemMessageTab.id, { active: true });
            
            // Start monitoring for portfolio adjustments on existing tab
            await startSystemMessagePageMonitoring(systemMessageTab.id);
        } else {
            // No existing system message tab, create new one
            log(`[${source}] 检测到新系统消息，打开新的系统消息标签页: ${url}`);
            const newTab = await chrome.tabs.create({ url: url });
            await chrome.windows.update(newTab.windowId, { focused: true });
            
            // Start monitoring for portfolio adjustments on new tab
            await startSystemMessagePageMonitoring(newTab.id);
        }
        
        return true; // Indicate that action was taken
    } else if (!hasUnread && lastMessageCount !== 0) {
        log(`[${source}] 系统消息已被阅读，重置计数器。`);
        await chrome.storage.local.set({ lastMessageCount: 0 });
    } else {
        log(`[${source}] 系统消息无变化。当前数量: ${count}`);
    }
    return false; // No action taken
}

async function startSystemMessagePageMonitoring(tabId) {
    const maxRetries = 3;
    let retryCount = 0;
    
    const attemptMonitoring = async () => {
        try {
            // Ensure content script is injected
            await ensureContentScriptInjected(tabId);
            
            // Optimized wait - minimal delay for faster response
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Send message to start monitoring
            const response = await chrome.tabs.sendMessage(tabId, { type: 'monitorSystemMessagePage' });
            if (response && response.status === 'monitoring_started') {
                log('系统消息页面监控已启动');
                return true;
            } else {
                log(`启动系统消息页面监控失败，尝试次数: ${retryCount + 1}`);
                return false;
            }
        } catch (error) {
            log(`启动系统消息页面监控时出错 (尝试 ${retryCount + 1}): ${error.message}`);
            return false;
        }
    };
    
    while (retryCount < maxRetries) {
        const success = await attemptMonitoring();
        if (success) {
            // 启动主动轮询机制
            startActivePolling(tabId);
            return;
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
            log(`等待 ${retryCount * 1000}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
        }
    }
    
    log('系统消息页面监控启动失败，已达到最大重试次数');
}

// 主动轮询机制 - 解决浏览器节流问题
let pollingIntervals = new Map(); // 存储每个标签页的轮询定时器

async function startActivePolling(tabId) {
    // 如果已经有轮询在运行，先清除
    if (pollingIntervals.has(tabId)) {
        clearInterval(pollingIntervals.get(tabId));
    }
    
    log(`启动标签页 ${tabId} 的主动轮询机制`);
    
    const pollInterval = setInterval(async () => {
        try {
            // 检查标签页是否仍然存在
            const tab = await chrome.tabs.get(tabId).catch(() => null);
            if (!tab) {
                log(`标签页 ${tabId} 已关闭，停止轮询`);
                clearInterval(pollInterval);
                pollingIntervals.delete(tabId);
                return;
            }
            
            // 检查是否是系统消息页面
            if (!tab.url.includes('/center/#/sys-message')) {
                log(`标签页 ${tabId} 已导航到其他页面，停止轮询`);
                clearInterval(pollInterval);
                pollingIntervals.delete(tabId);
                return;
            }
            
            // 主动请求页面数据
            chrome.tabs.sendMessage(tabId, { 
                type: 'requestSystemMessageData' 
            }).then(response => {
                if (response && response.data) {
                    log('主动轮询获取到系统消息数据');
                    checkSystemMessageUpdate(response.data, 'ActivePolling');
                }
            }).catch(error => {
                // 忽略连接错误，可能是页面还在加载
                if (!error.message.includes('Could not establish connection')) {
                    log(`主动轮询通信失败: ${error.message}`);
                }
            });
            
        } catch (error) {
            log(`主动轮询执行失败: ${error.message}`);
        }
    }, 15000); // 每15秒轮询一次
    
    pollingIntervals.set(tabId, pollInterval);
}

// 停止指定标签页的轮询
function stopActivePolling(tabId) {
    if (pollingIntervals.has(tabId)) {
        clearInterval(pollingIntervals.get(tabId));
        pollingIntervals.delete(tabId);
        log(`已停止标签页 ${tabId} 的主动轮询`);
    }
}

// 心跳检测机制 - 确保扩展持续工作
let heartbeatInterval = null;
let lastHeartbeatTime = Date.now();

function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    log('启动心跳检测机制');
    
    heartbeatInterval = setInterval(async () => {
        const now = Date.now();
        lastHeartbeatTime = now;
        
        try {
            // 检查是否有活跃的系统消息标签页
            const tabs = await chrome.tabs.query({
                url: "*://xueqiu.com/center/*"
            });
            
            const systemMessageTabs = tabs.filter(tab => 
                tab.url.includes('/center/#/sys-message')
            );
            
            if (systemMessageTabs.length > 0) {
                log(`心跳检测: 发现 ${systemMessageTabs.length} 个系统消息标签页`);
                
                // 确保每个标签页都有轮询机制
                for (const tab of systemMessageTabs) {
                    if (!pollingIntervals.has(tab.id)) {
                        log(`心跳检测: 为标签页 ${tab.id} 重新启动轮询`);
                        startActivePolling(tab.id);
                    }
                }
            } else {
                log('心跳检测: 未发现活跃的系统消息标签页');
            }
            
            // 清理已关闭标签页的轮询
            const activeTabIds = tabs.map(tab => tab.id);
            for (const [tabId, interval] of pollingIntervals.entries()) {
                if (!activeTabIds.includes(tabId)) {
                    log(`心跳检测: 清理已关闭标签页 ${tabId} 的轮询`);
                    clearInterval(interval);
                    pollingIntervals.delete(tabId);
                }
            }
            
        } catch (error) {
            log(`心跳检测执行失败: ${error.message}`);
        }
    }, 60000); // 每60秒心跳一次
}

// 检查心跳是否正常
function checkHeartbeat() {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - lastHeartbeatTime;
    
    if (timeSinceLastHeartbeat > 120000) { // 超过2分钟没有心跳
        log('检测到心跳异常，重新启动心跳机制');
        startHeartbeat();
    }
}

// 启动心跳检测
startHeartbeat();

// 定期检查心跳状态
setInterval(checkHeartbeat, 30000); // 每30秒检查一次心跳

function createNotification(type, options) {
    const now = Date.now();
    if (now - lastNotificationTimestamp < 2000) {
        log('通知冷却中，跳过本次通知。');
        return;
    }
    lastNotificationTimestamp = now;

    const notificationId = `${type}-${Date.now()}`;
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon.png',
        title: options.title,
        message: options.message,
        priority: 2
    });
    
    chrome.storage.local.set({ [notificationId]: options.url });
    log(`已创建通知: ${options.title}`);
}

function createPortfolioNotification(portfolioName, adjustmentMessage, targetUrl) {
    const now = Date.now();
    if (now - lastNotificationTimestamp < 2000) {
        log('通知冷却中，跳过本次组合调仓通知。');
        return;
    }
    lastNotificationTimestamp = now;

    const notificationId = `portfolio-${Date.now()}`;
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon.png',
        title: '雪球组合调仓提醒',
        message: `${portfolioName} - ${adjustmentMessage}`,
        priority: 2
    });
    
    // Store the target URL for portfolio notifications
    // If targetUrl is provided, use it; otherwise fallback to system message page
    const urlToStore = targetUrl || 'https://xueqiu.com/center/#/sys-message';
    chrome.storage.local.set({ [notificationId]: urlToStore });
    log(`已创建组合调仓通知: ${portfolioName}, 目标URL: ${urlToStore}`);
}

function createPortfolioDetailNotification(portfolioName, adjustmentDetail, messageId) {
    const now = Date.now();
    if (now - lastNotificationTimestamp < 2000) {
        log('通知冷却中，跳过本次组合调仓详情通知。');
        return;
    }
    lastNotificationTimestamp = now;

    const notificationId = `portfolioDetail-${Date.now()}`;
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon.png',
        title: '雪球组合调仓详情',
        message: `${portfolioName} - ${adjustmentDetail}`,
        priority: 2
    });
    
    // Store the system message page URL for portfolio detail notifications
    const urlToStore = 'https://xueqiu.com/center/#/sys-message';
    chrome.storage.local.set({ [notificationId]: urlToStore });
    log(`已创建组合调仓详情通知: ${portfolioName}, 消息ID: ${messageId}`);
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
    const urlData = await chrome.storage.local.get(notificationId);
    const url = urlData[notificationId];

    if (url) {
        // Case 1: System Message Notification - Always open a new tab
        if (notificationId.startsWith('systemMessage')) {
            log(`系统消息通知点击，打开新页面: ${url}`);
            const newTab = await chrome.tabs.create({ url: url });
            await chrome.windows.update(newTab.windowId, { focused: true });
        } 
        // Case 2: Timeline Notification - Focus existing tab and navigate via script
        else if (notificationId.startsWith('timeline')) {
            log(`内容更新通知点击，将通过脚本跳转到首页。`);
            const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*" });
            if (tabs.length > 0) {
                const tabId = tabs[0].id;
                // 1. Focus the window and the tab
                await chrome.windows.update(tabs[0].windowId, { focused: true });
                await chrome.tabs.update(tabId, { active: true });
                // 2. Send a message to the content script to perform a soft navigation
                chrome.tabs.sendMessage(tabId, { type: 'navigateToHome' });
            } else {
                // No existing tab, create a new one
                await chrome.tabs.create({ url: url });
            }
        }
        // Case 3: Portfolio Adjustment Notification - Open the specific portfolio page or system message page
        else if (notificationId.startsWith('portfolio') && !notificationId.startsWith('portfolioDetail')) {
            log(`组合调仓通知点击，跳转到目标页面: ${url}`);
            const tabs = await chrome.tabs.query({ url: url });
            if (tabs.length > 0) {
                // Focus existing tab with the target URL
                const tabId = tabs[0].id;
                await chrome.windows.update(tabs[0].windowId, { focused: true });
                await chrome.tabs.update(tabId, { active: true });
            } else {
                // Create new tab with the target URL
                const newTab = await chrome.tabs.create({ url: url });
                await chrome.windows.update(newTab.windowId, { focused: true });
            }
        }
        // Case 4: Portfolio Detail Notification - Open system message page
        else if (notificationId.startsWith('portfolioDetail')) {
            log(`组合调仓详情通知点击，跳转到系统消息页面: ${url}`);
            const tabs = await chrome.tabs.query({ url: 'https://xueqiu.com/center/*' });
            const systemMessageTab = tabs.find(tab => tab.url.includes('#/sys-message'));
            
            if (systemMessageTab) {
                // Focus existing system message tab
                await chrome.windows.update(systemMessageTab.windowId, { focused: true });
                await chrome.tabs.update(systemMessageTab.id, { active: true });
            } else {
                // Create new system message tab
                const newTab = await chrome.tabs.create({ url: url });
                await chrome.windows.update(newTab.windowId, { focused: true });
            }
        }

        // Clean up the notification regardless of type
        await chrome.notifications.clear(notificationId);
        await chrome.storage.local.remove(notificationId);
    }
});