import { CONFIG } from './modules/config.js';
import { Logger } from './modules/logger.js';
import { Notifier } from './modules/notifier.js';
import { Storage } from './modules/storage.js';
import { Scheduler } from './modules/scheduler.js';
import { MonitorCore } from './modules/monitor-core.js';
import { Heartbeat } from './modules/heartbeat.js';

const ALARM_NAME = CONFIG.ALARM_NAME;

// 代理旧的 log 函数以减少修改量，后续可以逐步迁移到 Logger.log
function log(message, data) {
    Logger.log(message, data);
}


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        Scheduler.manageAlarmLifecycle();
    }
});

chrome.tabs.onRemoved.addListener(() => {
    Scheduler.manageAlarmLifecycle();
});

chrome.runtime.onInstalled.addListener(async () => {
    log('插件已安装或更新。');
    const settings = await Storage.getSettings();
    await Storage.setLastState('settings', settings);
    const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*" });
    if (tabs.length > 0) {
        await MonitorCore.ensureContentScriptInjected(tabs[0].id);
    }
    await Scheduler.manageAlarmLifecycle();
});

chrome.runtime.onStartup.addListener(async () => {
    log('浏览器启动。');
    await Scheduler.manageAlarmLifecycle();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
        log('闹钟触发，开始检查...');
        await MonitorCore.performCheck();
        // 在每次闹钟触发并完成检查后，重新安排下一个闹钟，以获得新的随机间隔
        Scheduler.createAlarm();
    }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'settingsChanged') {
        log('设置已更改，正在更新闹钟。');
        await Scheduler.manageAlarmLifecycle();
    }
    else if (message.type === 'proactiveSystemMessageUpdate') {
        log('收到来自 MutationObserver 的主动更新。');
        if (message.data) {
            const actionTaken = await MonitorCore.checkSystemMessageUpdate(message.data, 'MutationObserver');
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
            Notifier.createPortfolioNotification(portfolioName, adjustmentMessage, targetUrl);
        }
    }
    else if (message.type === 'portfolioDetailDetected') {
        log('检测到组合调仓详情。');
        if (message.data && message.data.portfolioName) {
            const { portfolioName, adjustmentDetail, messageId } = message.data;
            log(`组合调仓详情通知: ${portfolioName} - ${adjustmentDetail} (消息ID: ${messageId})`);
            
            // Create Windows notification for portfolio adjustment details
            Notifier.createPortfolioDetailNotification(portfolioName, adjustmentDetail, messageId);
        }
    }
    else if (message.type === 'contentLog') {
        // 处理来自 content script 的日志
        if (message.data) {
            const { level, message: logMessage, data } = message.data;
            if (level === 'error') {
                console.log(`${logMessage} - error !!!!!!`, data);
            } else if (level === 'warn') {
                console.log(`${logMessage} - warn !!!!!!`, data);
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
        const msg = message.message;
        Notifier.sendNtfy(msg);
        
        // 同步发送 Windows 通知
        Notifier.createWindowsNotification('external', {
            title: '雪球助手通知',
            message: msg,
            url: 'https://xueqiu.com/'
        });
        
        sendResponse({ success: true });
        return true;
    }
});

// 启动心跳检测
Heartbeat.start((data, src) => MonitorCore.checkSystemMessageUpdate(data, src));

chrome.notifications.onClicked.addListener(async (notificationId) => {
    const url = await Storage.getLastState(notificationId);

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
        await Storage.removeState(notificationId);
    }
});
