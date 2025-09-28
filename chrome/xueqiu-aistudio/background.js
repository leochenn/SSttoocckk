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
    // Also send to popup if it's open
    chrome.runtime.sendMessage({ type: 'statusUpdate', status }).catch(() => {});
}

// Extension installation or update
chrome.runtime.onInstalled.addListener(async () => {
    log('插件已安装或更新。');
    const settings = await getSettings();
    await chrome.storage.local.set({ settings });
    createAlarm(settings.interval);
    await updateStatus('running', '监控已启动');
    
    // Refresh existing Xueqiu tabs to inject content script
    const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/" });
    if (tabs.length > 0) {
        log(`找到 ${tabs.length} 个雪球页面，将进行刷新。`);
        chrome.tabs.reload(tabs[0].id);
    }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
        log('闹钟触发，开始检查...');
        await performCheck();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'settingsChanged') {
        log('设置已更改，正在更新闹钟。');
        createAlarm(message.settings.interval);
    } else if (message.type === 'contentData') {
        handleContentData(message.data);
    }
});

function createAlarm(interval) {
    chrome.alarms.create(ALARM_NAME, {
        periodInMinutes: interval / 60
    });
    log(`闹钟已设置为每 ${interval} 秒触发一次。`);
}

async function performCheck() {
    const settings = await getSettings();
    if (!settings.monitorTimeline && !settings.monitorSystemMessages) {
        log('所有监控均已禁用，跳过本次检查。');
        await updateStatus('paused', '所有监控均已禁用');
        return;
    }

    try {
        const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/" });
        if (tabs.length === 0) {
            await updateStatus('error', '未找到雪球页面，无法监控。');
            log('错误：未找到打开的雪球页面。');
            return;
        }
        
        const tabId = tabs[0].id;
        log(`向页面 ${tabId} 发送检查指令。`);
        chrome.tabs.sendMessage(tabId, {
            type: 'checkForUpdates',
            options: {
                checkTimeline: settings.monitorTimeline,
                checkMessages: settings.monitorSystemMessages
            }
        });
        await updateStatus('running', '正在检查...');

    } catch (error) {
        log(`检查过程中发生错误: ${error.message}`);
        await updateStatus('error', `检查出错: ${error.message}`);
    }
}

async function handleContentData(data) {
    log('收到来自内容脚本的数据。');
    if (data.timeline) {
        await checkTimelineUpdate(data.timeline);
    }
    if (data.systemMessages) {
        await checkSystemMessageUpdate(data.systemMessages);
    }
}

async function checkTimelineUpdate({ user, time, content }) {
    const postId = `${user}-${time}-${content.substring(0, 20)}`;
    const { lastPostId } = await chrome.storage.local.get('lastPostId');

    if (!lastPostId) {
        log(`首次运行，设置基准帖子ID: ${postId}`);
        await chrome.storage.local.set({ lastPostId: postId });
    } else if (lastPostId !== postId) {
        log(`发现新内容！旧ID: ${lastPostId}, 新ID: ${postId}`);
        await chrome.storage.local.set({ lastPostId: postId });
        const notificationContent = `${user}: ${content.substring(0, 20)}...`;
        createNotification('timeline', {
            title: '雪球 - 关注列表更新',
            message: notificationContent,
            url: 'https://xueqiu.com/'
        });
    } else {
        log('关注列表无新内容。');
    }
}

async function checkSystemMessageUpdate({ count, hasUnread }) {
    const { lastMessageCount = 0 } = await chrome.storage.local.get('lastMessageCount');
    
    if (hasUnread && count > lastMessageCount) {
        log(`发现新系统消息！旧数量: ${lastMessageCount}, 新数量: ${count}`);
        await chrome.storage.local.set({ lastMessageCount: count });
        createNotification('systemMessage', {
            title: '雪球 - 系统消息',
            message: `您有 ${count} 条新的系统消息`,
            url: 'https://xueqiu.com/center/#/sys-message'
        });
        // Send message to content script to click the element
        const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/" });
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'clickSystemMessage' });
        }
    } else if (!hasUnread && lastMessageCount !== 0) {
        // User read the messages, so reset our count
        log('系统消息已被阅读，重置计数器。');
        await chrome.storage.local.set({ lastMessageCount: 0 });
    } else {
        log(`系统消息无变化。当前数量: ${count}`);
    }
}


function createNotification(type, options) {
    const now = Date.now();
    if (now - lastNotificationTimestamp < 5000) { // 5 second cooldown
        log('通知冷却中，跳过本次通知。');
        return;
    }
    lastNotificationTimestamp = now;

    const notificationId = `${type}-${Date.now()}`;
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: options.title,
        message: options.message,
        priority: 2
    });
    
    // Store URL for click handler
    chrome.storage.local.set({ [notificationId]: options.url });
    log(`已创建通知: ${options.title}`);
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
    const urlData = await chrome.storage.local.get(notificationId);
    const url = urlData[notificationId];
    if (url) {
        const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*" });
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true, url: url });
            chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
            chrome.tabs.create({ url: url });
        }
        chrome.notifications.clear(notificationId);
        chrome.storage.local.remove(notificationId);
    }
});