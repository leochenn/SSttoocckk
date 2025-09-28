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

chrome.runtime.onInstalled.addListener(async () => {
    log('插件已安装或更新。');
    const settings = await getSettings();
    await chrome.storage.local.set({ settings });
    const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*" });
    if (tabs.length > 0) {
        await ensureContentScriptInjected(tabs[0].id);
    }
    createAlarm(settings.interval);
    await updateStatus('running', '监控已启动');
});

chrome.runtime.onStartup.addListener(async () => {
    log('浏览器启动。');
    const settings = await getSettings();
    createAlarm(settings.interval);
    await updateStatus('running', '监控已启动');
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
    if (data.timeline) {
        await checkTimelineUpdate(data.timeline);
    }
    if (data.systemMessages) {
        await checkSystemMessageUpdate(data.systemMessages);
    }
}

async function checkTimelineUpdate({ user, content }) {
    // Create a stable ID based on user and the first 20 characters of content.
    const newPostId = `${user}-${content.substring(0, 20)}`;
    const { lastPostId } = await chrome.storage.local.get('lastPostId');

    if (!lastPostId) {
        log(`首次运行，设置基准帖子ID: ${newPostId}`);
        await chrome.storage.local.set({ lastPostId: newPostId });
    } else if (lastPostId !== newPostId) {
        log(`发现新内容！旧ID: ${lastPostId}, 新ID: ${newPostId}`);
        await chrome.storage.local.set({ lastPostId: newPostId });
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
    // ... (This function is unchanged) ...
    const { lastMessageCount = 0 } = await chrome.storage.local.get('lastMessageCount');
    
    if (hasUnread && count > lastMessageCount) {
        log(`发现新系统消息！旧数量: ${lastMessageCount}, 新数量: ${count}`);
        await chrome.storage.local.set({ lastMessageCount: count });
        createNotification('systemMessage', {
            title: '雪球 - 系统消息',
            message: `您有 ${count} 条新的系统消息`,
            url: 'https://xueqiu.com/center/#/sys-message'
        });
        const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*" });
        if (tabs.length > 0) {
            // chrome.tabs.sendMessage(tabs[0].id, { type: 'clickSystemMessage' });
        }
    } else if (!hasUnread && lastMessageCount !== 0) {
        log('系统消息已被阅读，重置计数器。');
        await chrome.storage.local.set({ lastMessageCount: 0 });
    } else {
        log(`系统消息无变化。当前数量: ${count}`);
    }
}

function createNotification(type, options) {
    const now = Date.now();
    if (now - lastNotificationTimestamp < 5000) {
        //log('通知冷却中，跳过本次通知。');
        //return;
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
        const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*" });
        if (tabs.length > 0) {
            await chrome.tabs.update(tabs[0].id, { active: true, url: url });
            await chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
            await chrome.tabs.create({ url: url });
        }
        await chrome.notifications.clear(notificationId);
        await chrome.storage.local.remove(notificationId);
    }
});