/**
 * 雪球监控助手 - 心跳与主动轮询模块
 */
import { Logger } from './logger.js';

let heartbeatInterval = null;
let lastHeartbeatTime = Date.now();
const pollingIntervals = new Map(); // 存储每个标签页的轮询定时器

export const Heartbeat = {
    /**
     * 启动心跳检测机制
     */
    start(processCallback) {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        
        Logger.log('启动心跳检测机制');
        heartbeatInterval = setInterval(async () => {
            lastHeartbeatTime = Date.now();
            try {
                // 检查是否有活跃的系统消息标签页
                const tabs = await chrome.tabs.query({ url: "*://xueqiu.com/center/*" });
                const systemMessageTabs = tabs.filter(tab => tab.url.includes('/center/#/sys-message'));
                
                if (systemMessageTabs.length > 0) {
                    Logger.log(`心跳检测: 发现 ${systemMessageTabs.length} 个系统消息标签页`);
                    for (const tab of systemMessageTabs) {
                        if (!pollingIntervals.has(tab.id)) {
                            Logger.log(`心跳检测: 为标签页 ${tab.id} 重新启动轮询`);
                            this.startActivePolling(tab.id, processCallback);
                        }
                    }
                }

                // 清理已关闭标签页的轮询
                const activeTabIds = tabs.map(tab => tab.id);
                for (const [tabId, interval] of pollingIntervals.entries()) {
                    if (!activeTabIds.includes(tabId)) {
                        Logger.log(`心跳检测: 清理已关闭标签页 ${tabId} 的轮询`);
                        clearInterval(interval);
                        pollingIntervals.delete(tabId);
                    }
                }
            } catch (error) {
                Logger.error('心跳检测执行失败', error);
            }
        }, 60000);

        // 每30秒自检心跳状态
        setInterval(() => this.check(processCallback), 30000);
    },

    /**
     * 检查心跳是否异常
     */
    check(processCallback) {
        if (Date.now() - lastHeartbeatTime > 120000) {
            Logger.warn('检测到心跳异常，重新启动心跳机制');
            this.start(processCallback);
        }
    },

    /**
     * 启动针对特定标签页的主动轮询 (解决浏览器节流)
     */
    startActivePolling(tabId, processCallback) {
        if (pollingIntervals.has(tabId)) clearInterval(pollingIntervals.get(tabId));
        
        Logger.log(`启动标签页 ${tabId} 的主动轮询机制`);
        const pollInterval = setInterval(async () => {
            try {
                const tab = await chrome.tabs.get(tabId).catch(() => null);
                if (!tab || !tab.url.includes('/center/#/sys-message')) {
                    this.stopActivePolling(tabId);
                    return;
                }
                
                // 主动请求页面数据
                chrome.tabs.sendMessage(tabId, { type: 'requestSystemMessageData' })
                    .then(response => {
                        if (response?.data && processCallback) {
                            Logger.log('主动轮询获取到系统消息数据');
                            processCallback(response.data, 'ActivePolling');
                        }
                    })
                    .catch(() => { /* 忽略连接错误 */ });
                
            } catch (error) {
                Logger.error(`主动轮询执行失败: ${error.message}`);
            }
        }, 15000);
        
        pollingIntervals.set(tabId, pollInterval);
    },

    /**
     * 停止轮询
     */
    stopActivePolling(tabId) {
        if (pollingIntervals.has(tabId)) {
            clearInterval(pollingIntervals.get(tabId));
            pollingIntervals.delete(tabId);
            Logger.log(`已停止标签页 ${tabId} 的主动轮询`);
        }
    }
};
