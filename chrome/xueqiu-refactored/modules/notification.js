/**
 * 雪球监控助手 - 通知服务模块
 * Handles NTFY and Chrome Notifications.
 */
import { CONFIG } from './config.js';
import { logger } from './logger.js';
import { StorageService } from './storage.js';

export class NotificationService {
    static lastNotificationTimestamp = 0;

    /**
     * 发送 NTFY 远程通知
     */
    static async sendNtfy(message) {
        logger.info(`准备向 NTFY 发送通知: ${message}`);
        try {
            const response = await fetch(CONFIG.API.NTFY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: message
            });
            if (response.ok) {
                logger.info('NTFY 通知发送成功！');
            } else {
                logger.warn(`NTFY 通知发送失败: ${response.status}`);
            }
        } catch (error) {
            logger.error(`发送 NTFY 通知时出错:`, error);
        }
    }

    /**
     * 创建 Chrome 桌面通知
     */
    static async createChromeNotification(type, options) {
        const now = Date.now();
        // 2秒冷却时间
        if (now - this.lastNotificationTimestamp < 2000) {
            logger.info('通知冷却中，跳过本次通知。');
            return;
        }
        this.lastNotificationTimestamp = now;

        const notificationId = `${type}-${Date.now()}`;
        
        // 只有在 chrome.notifications API 可用时才创建（防止在非扩展环境测试报错）
        if (chrome && chrome.notifications) {
            chrome.notifications.create(notificationId, {
                type: 'basic',
                iconUrl: 'icons/icon.png', // 确保路径在调用方上下文中有效，或使用绝对路径
                title: options.title,
                message: options.message,
                priority: 2
            });
            
            // 保存通知对应的 URL，以便点击时跳转
            if (options.url) {
                await StorageService.set({ [notificationId]: options.url });
            }
            logger.info(`已创建桌面通知: ${options.title}`);
        }
    }

    /**
     * 发送安全警报（带节流）
     */
    static async sendSecurityAlert() {
        const { isNoPostsWarningSent } = await StorageService.get('isNoPostsWarningSent');
        if (isNoPostsWarningSent) {
            logger.info('未找到帖子警报已发送过，跳过重复提醒。');
            return;
        }
        await StorageService.set({ isNoPostsWarningSent: true });
        const message = '雪球监控提示：未找到任何帖子，可能触发了安全验证，请手动检查。';
        
        await this.sendNtfy(message);
        await this.createChromeNotification('security', {
            title: '雪球安全警报',
            message: message,
            url: CONFIG.API.XUEQIU_BASE
        });
    }

    static async resetSecurityAlert() {
        const { isNoPostsWarningSent } = await StorageService.get('isNoPostsWarningSent');
        if (isNoPostsWarningSent) {
            logger.info('检测到页面内容恢复正常，重置“未找到帖子”警报状态。');
            await StorageService.set({ isNoPostsWarningSent: false });
        }
    }
}
