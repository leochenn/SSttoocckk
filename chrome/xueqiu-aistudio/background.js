const ALARM_NAME = 'xueqiuMonitorAlarm';
let lastNotificationTimestamp = 0;

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
        monitorSystemMessages: true,
        interval: 10
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

    if (tabs.length > 0) {
        log('检测到雪球页面，确保闹钟正在运行并使用最新设置。');
        const settings = await getSettings();
        createAlarm(settings.interval);
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
        log('闹钟触发，检查是否在工作时间...');
        if (isWithinTradingHours()) {
            log('在工作时间内，开始检查...');
            await performCheck();
        } else {
            log('非工作时间，跳过本次检查。');
            await updateStatus('paused', '非工作时间');
        }
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
            const notificationOptions = await checkSystemMessageUpdate(message.data);
            if (notificationOptions) {
                log('MutationObserver 检测到更新，创建通知。');
                createNotification('systemMessage', notificationOptions);
            }
        }
    }
    return true;
});

function createAlarm(interval) {
    chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: 0.1,
        periodInMinutes: interval / 60
    });
    log(`闹钟已设置为每 ${interval} 秒触发一次。`);
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
    const morningStart = 9 * 100 + 20; // 920
    const morningEnd = 11 * 100 + 31; // 1131

    // Afternoon session: 1:00 PM to 3:00 PM (inclusive)
    const afternoonStart = 13 * 100 + 0; // 1300
    const afternoonEnd = 15 * 100 + 0; // 1500

    const isMorningSession = currentTime >= morningStart && currentTime <= morningEnd;
    const isAfternoonSession = currentTime >= afternoonStart && currentTime <= afternoonEnd;

    return isMorningSession || isAfternoonSession;
}

async function performCheck() {
    const settings = await getSettings();
    if (!settings.monitorTimeline && !settings.monitorSystemMessages) {
        log('所有监控均已禁用，跳过本次检查。');
        await updateStatus('paused', '所有监控均已禁用');
        return;
    }

    try {
        const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*", status: "complete" });
        if (tabs.length === 0) {
            await updateStatus('error', '未找到已加载完成的雪球页面。');
            log('错误：未找到已加载完成的雪球页面。');
            return;
        }
        
        const tabId = tabs[0].id;
        log(`向页面 ${tabId} 发送检查指令。`);
        
        const response = await chrome.tabs.sendMessage(tabId, {
            type: 'checkForUpdates',
            options: {
                checkTimeline: settings.monitorTimeline,
                checkMessages: settings.monitorSystemMessages
            }
        }).catch(async (error) => {
            log(`与内容脚本通信失败: ${error.message}。尝试重新注入脚本。`);
            await ensureContentScriptInjected(tabId);
            return { error: "脚本无响应，已尝试重新注入，请等待下次检查。" };
        });

        handleContentData(response);
        await updateStatus('running', '检查完成');

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
    let systemMessageNotificationOptions = null;
    let timelineNotificationOptions = null;

    if (data.systemMessages) {
        systemMessageNotificationOptions = await checkSystemMessageUpdate(data.systemMessages);
    }
    if (data.timeline) {
        timelineNotificationOptions = await checkTimelineUpdate(data.timeline);
    }

    // ** PRIORITY LOGIC **
    // If there's a system message, prioritize it and ignore the timeline update.
    if (systemMessageNotificationOptions) {
        log('检测到系统消息更新，优先通知。');
        createNotification('systemMessage', systemMessageNotificationOptions);
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

// ** MODIFIED FUNCTION: Returns notification options instead of creating notification **
async function checkSystemMessageUpdate({ count, hasUnread }) {
    const { lastMessageCount = 0 } = await chrome.storage.local.get('lastMessageCount');
    
    if (hasUnread && count > lastMessageCount) {
        log(`发现新系统消息！旧数量: ${lastMessageCount}, 新数量: ${count}`);
        await chrome.storage.local.set({ lastMessageCount: count });
        
        // Send click command to content script
        const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*" });
        if (tabs.length > 0) {
            //chrome.tabs.sendMessage(tabs[0].id, { type: 'clickSystemMessage' });
        }

        // Return the options object for the notification
        return {
            title: '雪球 - 系统消息',
            message: `您有 ${count} 条新的系统消息`,
            url: 'https://xueqiu.com/center/#/sys-message'
        };
    } else if (!hasUnread && lastMessageCount !== 0) {
        log('系统消息已被阅读，重置计数器。');
        await chrome.storage.local.set({ lastMessageCount: 0 });
    } else {
        log(`系统消息无变化。当前数量: ${count}`);
    }
    return null;
}

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

        // Clean up the notification regardless of type
        await chrome.notifications.clear(notificationId);
        await chrome.storage.local.remove(notificationId);
    }
});