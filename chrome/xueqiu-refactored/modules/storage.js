/**
 * 雪球监控助手 - 存储模块
 * Wrapper for chrome.storage.local to provide a consistent API.
 */
import { CONFIG } from './config.js';

export class StorageService {
    /**
     * 获取当前设置，如果不存在则返回默认值
     */
    static async getSettings() {
        try {
            const result = await chrome.storage.local.get('settings');
            return { ...CONFIG.DEFAULTS.SETTINGS, ...result.settings };
        } catch (error) {
            console.error('Failed to get settings:', error);
            return CONFIG.DEFAULTS.SETTINGS;
        }
    }

    /**
     * 保存设置
     */
    static async saveSettings(settings) {
        return chrome.storage.local.set({ settings });
    }

    /**
     * 更新运行状态
     */
    static async updateStatus(state, message) {
        const status = { state, message };
        await chrome.storage.local.set({ status });
        // 尝试发送消息通知前端，如果失败（如Popup未打开）则忽略
        try {
            await chrome.runtime.sendMessage({ type: CONFIG.MSG_TYPES.STATUS_UPDATE, status });
        } catch (e) {
            // Ignore
        }
        return status;
    }

    static async get(keys) {
        return chrome.storage.local.get(keys);
    }

    static async set(items) {
        return chrome.storage.local.set(items);
    }
    
    static async remove(keys) {
        return chrome.storage.local.remove(keys);
    }
}
