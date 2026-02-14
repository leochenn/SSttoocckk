import { CONFIG } from './modules/config.js';
import { logger } from './modules/logger.js';
import { StorageService } from './modules/storage.js';
import { NotificationService } from './modules/notification.js';
import { MonitorEngine } from './modules/monitor-engine.js';
import { AlertEngine } from './modules/alert-engine.js';
import { StockService } from './modules/stock.js';

/**
 * 确保内容脚本已注入
 */
async function ensureContentScriptInjected(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js'],
        });
        logger.info(`已尝试重新注入脚本到 Tab ${tabId}`);
    } catch (e) {
        logger.error(`注入脚本到 Tab ${tabId} 失败: ${e.message}`);
    }
}

/**
 * 创建随机间隔闹钟
 */
function createAlarm(minIntervalSeconds = CONFIG.ALARM.MIN_INTERVAL, maxIntervalSeconds = CONFIG.ALARM.MAX_INTERVAL) {
    const randomIntervalSeconds = Math.floor(Math.random() * (maxIntervalSeconds - minIntervalSeconds + 1)) + minIntervalSeconds;
    chrome.alarms.clear(CONFIG.ALARM.NAME); 
    chrome.alarms.create(CONFIG.ALARM.NAME, {
        delayInMinutes: randomIntervalSeconds / 60 
    });
    logger.info(`闹钟已设置为将在 ${randomIntervalSeconds} 秒后触发。`);
}

/**
 * 管理闹钟生命周期（启动/停止）
 */
async function manageAlarmLifecycle() {
    const tabs = await chrome.tabs.query({ url: CONFIG.API.XUEQIU_BASE + "*" });
    const settings = await StorageService.getSettings();
    const decision = MonitorEngine.shouldPerformCheck(settings, tabs.length);

    if (!decision.shouldCheck) {
        logger.info(`${decision.message}，停止闹钟。`);
        chrome.alarms.clear(CONFIG.ALARM.NAME);
        await StorageService.updateStatus(decision.status, decision.message);
        return;
    }

    logger.info('检测到雪球页面，且关注列表监控已启用，确保闹钟正在运行。');
    createAlarm(settings.interval, settings.interval + 3);
    
    const result = await StorageService.get('status');
    if (result.status && result.status.message === '等待雪球页面') {
        await StorageService.updateStatus('running', '监控已启动');
    }
}

/**
 * 执行监控检查
 */
async function performCheck() {
    const settings = await StorageService.getSettings();
    const tabs = await chrome.tabs.query({ url: CONFIG.API.XUEQIU_BASE + "*", status: "complete" });
    const decision = MonitorEngine.shouldPerformCheck(settings, tabs.length);

    if (!decision.shouldCheck) {
        logger.info(`${decision.message}，跳过本次检查。`);
        await StorageService.updateStatus(decision.status, decision.message);
        return;
    }
    
    try {
        // 优先排除 /center/ 等子页面，尽量选首页
        let selectedTab = tabs.find(tab => !tab.url.includes('/center/'));
        if (!selectedTab) {
            selectedTab = tabs[0];
        }
        
        const tabId = selectedTab.id;
        logger.info(`向页面 ${tabId} 发送刷新并检查指令。`);
        
        // 发送消息给 content script
        let response;
        try {
            response = await chrome.tabs.sendMessage(tabId, {
                type: CONFIG.MSG_TYPES.CHECK_TIMELINE,
                options: {
                    checkSystemMessages: settings.monitorSystemMessages
                }
            });
        } catch (error) {
            logger.warn(`与内容脚本通信失败: ${error.message}。尝试重新注入脚本。`);
            await ensureContentScriptInjected(tabId);
            return { error: "脚本无响应，已尝试重新注入，请等待下次检查。" };
        }

        if (response && response.data) {
            const { newContent, systemMessages, error: dataError } = response.data;
            let notified = false;

            // 处理错误状态 (考虑 dataError 或 newContent 中的错误)
            const actualError = dataError || (newContent && newContent.error);

            if (actualError === CONFIG.ERRORS.NO_POSTS) {
                logger.warn('检测结果：未找到任何帖子，可能触发了安全机制。');
                await StorageService.updateStatus('running', '待手动验证 (未找到帖子)');
                await NotificationService.sendSecurityAlert();
            } else {
                await NotificationService.resetSecurityAlert();
            }

            // 处理新内容
            const timelineResult = await StorageService.get('lastTimelineContent');
            const storedTimeline = timelineResult.lastTimelineContent || { signature: '', count: 0 };
            const timelineUpdate = MonitorEngine.processUpdate(newContent, storedTimeline.signature, storedTimeline.count);

            if (timelineUpdate.hasUpdate) {
                const message = `雪球有新内容: ${timelineUpdate.signature}`;
                logger.info(`检测到新内容，发送通知: ${timelineUpdate.signature.substring(0, 30)}...`);
                await NotificationService.sendNtfy(message);
                
                await NotificationService.createChromeNotification('timeline', {
                    title: '雪球 - 关注列表更新',
                    message: timelineUpdate.signature.substring(0, 100),
                    url: CONFIG.API.XUEQIU_BASE
                });
                await StorageService.set({ lastTimelineContent: newContent });
                notified = true;
            }

            // 处理系统消息
            if (systemMessages) {
                const sysResult = await StorageService.get('lastSystemMessageCount');
                const lastCount = sysResult.lastSystemMessageCount || 0;
                const sysUpdate = MonitorEngine.processSystemMessage(systemMessages.count, lastCount);

                if (sysUpdate.hasUpdate && !notified) {
                    const message = `雪球有 ${sysUpdate.count} 条系统消息`;
                    logger.info(`检测到系统消息未读数变化！当前有 ${sysUpdate.count} 条系统消息。`);
                    await NotificationService.sendNtfy(message);
                    
                    await NotificationService.createChromeNotification('systemMessage', {
                        title: '雪球 - 系统消息',
                        message: message,
                        url: CONFIG.API.XUEQIU_MESSAGE
                    });
                    notified = true;
                }
                await StorageService.set({ lastSystemMessageCount: systemMessages.count });
            }
            
            await StorageService.updateStatus('running', '关注列表和系统消息检查完成');
        } else {
            await StorageService.updateStatus('running', '检查完成，无新内容或系统消息更新');
        }

        // 无论雪球内容是否更新，都执行一次股价预警检查
        await checkStockAlerts();
    } catch (error) {
        logger.error(`检查过程中发生异常: ${error.message}`, error);
        await StorageService.updateStatus('running', `检查暂中断: ${error.message}`);
    }
}

/**
 * 检查股价预警
 */
async function checkStockAlerts() {
    try {
        const portfolioResult = await StorageService.get('stockPortfolioData');
        const appData = portfolioResult.stockPortfolioData;
        if (!appData || !appData.watchlist) return;

        const stocksWithAlerts = appData.watchlist.filter(item => 
            item.alertConfig && item.alertConfig.enabled
        );
        
        if (stocksWithAlerts.length === 0) return;

        logger.info(`正在检查 ${stocksWithAlerts.length} 只股票的预警状态...`);
        const codes = stocksWithAlerts.map(item => item.code);
        const stockData = await StockService.fetchStockData(codes);

        let dataChanged = false;
        for (const item of appData.watchlist) {
            if (item.alertConfig && item.alertConfig.enabled && stockData[item.code]) {
                const result = AlertEngine.checkAlert(stockData[item.code], item.alertConfig, item.alertState);
                if (result) {
                    await NotificationService.sendNtfy(result.message);
                    await NotificationService.createChromeNotification('stockAlert', {
                        title: '股价预警',
                        message: result.message
                    });
                    item.alertState = result.newState;
                    dataChanged = true;
                }
            }
        }

        if (dataChanged) {
            await StorageService.set({ stockPortfolioData: appData });
            // 通知看板页面更新（如果开着）
            chrome.runtime.sendMessage({ 
                type: 'PORTFOLIO_UPDATED', 
                data: appData 
            }).catch(() => {});
        }
    } catch (error) {
        logger.error(`执行股价预警检查时出错: ${error.message}`);
    }
}

// --- 事件监听器 ---

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        manageAlarmLifecycle();
    }
});

chrome.tabs.onRemoved.addListener(() => {
    manageAlarmLifecycle();
});

chrome.runtime.onInstalled.addListener(async () => {
    logger.info('插件已安装或更新。');
    const settings = await StorageService.getSettings();
    await StorageService.saveSettings(settings);
    
    const tabs = await chrome.tabs.query({ url: CONFIG.API.XUEQIU_BASE + "*" });
    if (tabs.length > 0) {
        await ensureContentScriptInjected(tabs[0].id);
    }
    await manageAlarmLifecycle();
});

chrome.runtime.onStartup.addListener(async () => {
    logger.info('浏览器启动。');
    await manageAlarmLifecycle();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === CONFIG.ALARM.NAME) {
        logger.info('闹钟触发，开始检查...');
        await performCheck();
        // 获取最新设置来决定下一次间隔
        const settings = await StorageService.getSettings();
        createAlarm(settings.interval, settings.interval + 3);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === CONFIG.MSG_TYPES.SETTINGS_CHANGED) {
        logger.info('设置已更改，正在更新闹钟。');
        manageAlarmLifecycle();
    }
    else if (message.type === CONFIG.MSG_TYPES.CONTENT_LOG) {
        if (message.data) {
            const { level, message: logMessage, data } = message.data;
            // 由 background 的 logger 统一接管输出，确保格式一致
            if (level === 'error') logger.error(logMessage, data);
            else if (level === 'warn') logger.warn(logMessage, data);
            else logger.info(logMessage, data);
        }
    }
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
    const urlData = await StorageService.get(notificationId);
    const url = urlData[notificationId];

    if (url) {
        if (notificationId.startsWith('systemMessage')) {
            logger.info(`系统消息通知点击，打开新页面: ${url}`);
            const newTab = await chrome.tabs.create({ url: url });
            await chrome.windows.update(newTab.windowId, { focused: true });
        } 
        else if (notificationId.startsWith('timeline')) {
            logger.info(`内容更新通知点击，将通过脚本跳转到首页。`);
            const tabs = await chrome.tabs.query({ url: CONFIG.API.XUEQIU_BASE + "*" });
            if (tabs.length > 0) {
                const tabId = tabs[0].id;
                await chrome.windows.update(tabs[0].windowId, { focused: true });
                await chrome.tabs.update(tabId, { active: true });
                // 尝试发送跳转指令，content.js 需要处理 navigateToHome
                chrome.tabs.sendMessage(tabId, { type: CONFIG.MSG_TYPES.NAVIGATE_HOME }).catch(() => {});
            } else {
                await chrome.tabs.create({ url: url });
            }
        }
        else if (notificationId.startsWith('security')) {
            await chrome.tabs.create({ url: url });
        }

        await chrome.notifications.clear(notificationId);
        await StorageService.remove(notificationId);
    }
});
