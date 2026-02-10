/**
 * 雪球监控助手 - 存储管理模块
 */
import { CONFIG } from './config.js';
import { Logger } from './logger.js';

export const Storage = {
    /**
     * 获取设置
     */
    async getSettings() {
        const result = await chrome.storage.local.get('settings');
        return result.settings || CONFIG.DEFAULT_SETTINGS;
    },

    /**
     * 更新监控状态
     */
    async updateStatus(state, message) {
        const status = { state, message };
        await chrome.storage.local.set({ status });
        try {
            await chrome.runtime.sendMessage({ type: 'statusUpdate', status });
        } catch (e) {
            // Popup 可能没打开，忽略错误
        }
    },

    /**
     * 获取上次监控状态数据
     */
    async getLastState(keyOrKeys) {
        const result = await chrome.storage.local.get(keyOrKeys);
        if (typeof keyOrKeys === 'string') {
            return result[keyOrKeys];
        }
        return result;
    },

    /**
     * 设置监控状态数据
     */
    async setLastState(key, value) {
        await chrome.storage.local.set({ [key]: value });
    },

    /**
     * 清除特定状态
     */
    async removeState(key) {
        await chrome.storage.local.remove(key);
    }
};
