/**
 * 雪球监控助手 - 核心监控逻辑模块
 */
import { CONFIG } from './config.js';
import { Logger } from './logger.js';
import { Storage } from './storage.js';
import { Notifier } from './notifier.js';

export const MonitorCore = {
    /**
     * 确保内容脚本已注入
     */
    async ensureContentScriptInjected(tabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js'],
            });
        } catch (e) {
            Logger.error(`注入脚本到 Tab ${tabId} 失败: ${e.message}`);
        }
    },

    /**
     * 执行一次完整的检查流程
     */
    async performCheck() {
        const settings = await Storage.getSettings();
        if (!settings.monitorTimeline) {
            Logger.log('关注列表监控开关已关闭，跳过本次检查。');
            await Storage.updateStatus('paused', '关注列表监控已禁用');
            return;
        }
        
        try {
            const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*", status: "complete" });
            if (tabs.length === 0) {
                await Storage.updateStatus('error', '未找到已加载完成的雪球页面。');
                Logger.warn('错误：未找到已加载完成的雪球页面。');
                return;
            }
            
            // 寻找包含关注列表的首页标签
            let selectedTab = tabs.find(tab => !tab.url.includes('/center/'));
            if (!selectedTab) {
                selectedTab = tabs[0];
            }
            
            const tabId = selectedTab.id;
            Logger.log(`向页面 ${tabId} 发送刷新并检查指令。`);
            
            const response = await chrome.tabs.sendMessage(tabId, {
                type: 'refreshAndCheckTimeline',
                options: {
                    checkSystemMessages: settings.monitorSystemMessages
                }
            }).catch(async (error) => {
                Logger.warn(`与内容脚本通信失败: ${error.message}。尝试重新注入脚本。`);
                await this.ensureContentScriptInjected(tabId);
                return { error: "脚本无响应，已尝试重新注入，请等待下次检查。" };
            });

            if (response && response.data) {
                await this.handleResponseData(response.data);
                await Storage.updateStatus('running', '关注列表和系统消息检查完成');
            } else {
                await Storage.updateStatus('running', '检查完成，无新内容或系统消息更新');
            }
        } catch (error) {
            Logger.error(`检查过程中发生异常: ${error.message}`);
            await Storage.updateStatus('running', `检查暂中断: ${error.message}`);
        }
    },

    /**
     * 处理来自内容脚本的响应数据
     */
    async handleResponseData(data) {
        const { newContent, systemMessages, error: dataError } = data;
        let notified = false;

        // 只要没有 NO_POSTS 错误，就说明页面加载正常
        if (dataError !== 'NO_POSTS') {
            Notifier.resetNoPostsWarning();
        }

        // 0. 处理特殊错误：未找到帖子
        if (dataError === 'NO_POSTS') {
            Logger.warn('检测结果：未找到任何帖子，可能触发了安全机制。');
            await Storage.updateStatus('running', '待手动验证 (未找到帖子)');
            await Notifier.sendThrottledNoPostsNotification();
        }

        // 1. 处理新内容 (Timeline)
        if (newContent) {
            const message = `雪球有新内容: ${newContent}`;
            Logger.log(`检测到新内容，发送通知: ${newContent.substring(0, 30)}...`);
            await Notifier.sendNtfy(message);
            
            Notifier.createWindowsNotification('timeline', {
                title: '雪球 - 关注列表更新',
                message: newContent.substring(0, 100),
                url: CONFIG.URLS.XUEQIU_HOME
            });
            notified = true;
        }

        // 2. 处理系统消息
        if (systemMessages && systemMessages.count > 0) {
            const lastSystemMessageCount = await Storage.getLastState('lastSystemMessageCount') || 0;
            Logger.log(`系统消息 - 当前未读数: ${systemMessages.count}, 上次记录未读数: ${lastSystemMessageCount}`);

            if (!notified && systemMessages.count !== lastSystemMessageCount) {
                const message = `雪球有 ${systemMessages.count} 条系统消息`;
                Logger.log(`检测到系统消息未读数变化！当前有 ${systemMessages.count} 条系统消息。`);
                await Notifier.sendNtfy(message);
                
                Notifier.createWindowsNotification('systemMessage', {
                    title: '雪球 - 系统消息',
                    message: message,
                    url: CONFIG.URLS.SYSTEM_MESSAGES
                });
                notified = true;
            }
            await Storage.setLastState('lastSystemMessageCount', systemMessages.count);
        } else if (systemMessages && systemMessages.count === 0) {
            await Storage.setLastState('lastSystemMessageCount', 0);
        }
    },

    /**
     * 检查系统消息更新并采取行动 (打开/切换标签)
     */
    async checkSystemMessageUpdate({ count, hasUnread }, source = 'unknown') {
        const states = await Storage.getLastState(['lastMessageCount', 'lastSystemMessageActionTime']);
        const lastMessageCount = states.lastMessageCount || 0;
        const lastSystemMessageActionTime = states.lastSystemMessageActionTime || 0;
        const currentTime = Date.now();
        
        Logger.log(`[${source}] 检查系统消息更新 - 当前数量: ${count}, 有未读: ${hasUnread}, 上次数量: ${lastMessageCount}`);
        
        if (hasUnread && count > lastMessageCount) {
            if (currentTime - lastSystemMessageActionTime < 5000) {
                Logger.log(`[${source}] 检测到新系统消息，但距离上次操作时间过短，跳过操作`);
                return false;
            }
            
            Logger.log(`[${source}] 发现新系统消息！新数量: ${count}`);
            await Storage.setLastState('lastMessageCount', count);
            await Storage.setLastState('lastSystemMessageActionTime', currentTime);
            
            const url = CONFIG.URLS.SYSTEM_MESSAGES;
            const existingTabs = await chrome.tabs.query({ url: 'https://xueqiu.com/center/*' });
            const systemMessageTab = existingTabs.find(tab => tab.url.includes('#/sys-message'));
            
            if (systemMessageTab) {
                await chrome.windows.update(systemMessageTab.windowId, { focused: true });
                await chrome.tabs.update(systemMessageTab.id, { active: true });
            } else {
                await chrome.tabs.create({ url: url });
            }
            return true;
        } else if (!hasUnread && lastMessageCount !== 0) {
            await Storage.setLastState('lastMessageCount', 0);
        }
        return false;
    }
};
