/**
 * 雪球监控助手 - 通知模块
 */
import { CONFIG } from './config.js';
import { Logger } from './logger.js';
import { Storage } from './storage.js';

let lastNotificationTimestamp = 0;
let isNoPostsWarningSent = false;

export const Notifier = {
    /**
     * 发送 NTFY 网络通知
     */
    async sendNtfy(message) {
        Logger.log(`准备向 NTFY 发送通知: ${message}`);
        try {
            const response = await fetch(CONFIG.NTFY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: message
            });
            if (response.ok) {
                Logger.log('NTFY 通知发送成功！');
            } else {
                Logger.warn(`NTFY 通知发送失败: ${response.status} - ${response.statusText}`);
            }
        } catch (error) {
            Logger.error(`发送 NTFY 通知时出错:`, error);
        }
    },

    /**
     * 创建 Windows 系统通知
     */
    createWindowsNotification(type, options) {
        const now = Date.now();
        // 通知冷却：2秒
        if (now - lastNotificationTimestamp < 2000) {
            Logger.log('通知冷却中，跳过本次通知。');
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
        
        // 存储通知对应的 URL
        Storage.setLastState(notificationId, options.url);
        Logger.log(`已创建通知: ${options.title}`);
    },

    /**
     * 发送组合调仓通知
     */
    createPortfolioNotification(portfolioName, adjustmentMessage, targetUrl) {
        this.createWindowsNotification('portfolio', {
            title: '雪球组合调仓提醒',
            message: `${portfolioName} - ${adjustmentMessage}`,
            url: targetUrl || CONFIG.URLS.SYSTEM_MESSAGES
        });
    },

    /**
     * 发送组合调仓详情通知
     */
    createPortfolioDetailNotification(portfolioName, adjustmentDetail, messageId) {
        this.createWindowsNotification('portfolioDetail', {
            title: '雪球组合调仓详情',
            message: `${portfolioName} - ${adjustmentDetail}`,
            url: CONFIG.URLS.SYSTEM_MESSAGES
        });
    },

    /**
     * 发送“未找到帖子”警报（带节流）
     */
    async sendThrottledNoPostsNotification() {
        if (isNoPostsWarningSent) {
            Logger.log('未找到帖子警报已发送过，跳过重复提醒。');
            return;
        }
        isNoPostsWarningSent = true;
        const message = '雪球监控提示：未找到任何帖子，可能触发了安全验证，请手动检查。';
        
        await this.sendNtfy(message);
        this.createWindowsNotification('security', {
            title: '雪球安全警报',
            message: message,
            url: CONFIG.URLS.XUEQIU_HOME
        });
    },

    /**
     * 重置“未找到帖子”状态
     */
    resetNoPostsWarning() {
        if (isNoPostsWarningSent) {
            Logger.log('重置“未找到帖子”警报状态。');
            isNoPostsWarningSent = false;
        }
    },

    /**
     * 获取当前警报状态
     */
    getNoPostsWarningStatus() {
        return isNoPostsWarningSent;
    }
};
