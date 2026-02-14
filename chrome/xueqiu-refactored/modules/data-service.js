/**
 * 雪球监控助手 - 数据持久化与服务模块
 * 负责与 localStorage 交互，及导入导出逻辑。
 */

export class DataService {
    static STORAGE_KEY = 'stockPortfolioData';

    static save(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ [this.STORAGE_KEY]: data });
        }
    }

    static load(defaultData) {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        if (!savedData) return defaultData;

        try {
            const data = JSON.parse(savedData);
            // 基础兼容性修复
            if (data.notes === undefined) data.notes = "";
            if (data.settings.isPrivacyMode === undefined) data.settings.isPrivacyMode = false;
            if (data.assetBreakdown === undefined) data.assetBreakdown = [];
            
            // 兼容性处理：将旧的字符串数组格式转换为新的对象格式
            if (data.watchlist && data.watchlist.length > 0) {
                data.watchlist = data.watchlist.map(item => {
                    const obj = typeof item === 'string' ? { code: item, showInPopup: false } : item;
                    if (!obj.alertConfig) {
                        obj.alertConfig = { upperPercent: 0, lowerPercent: 0, enabled: false };
                    }
                    if (!obj.alertState) {
                        obj.alertState = { lastAlertTime: 0, lastAlertPrice: 0 };
                    }
                    return obj;
                });
            }
            return data;
        } catch (e) {
            console.error('Failed to parse saved data:', e);
            return defaultData;
        }
    }

    static export(data) {
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
        a.download = `my_portfolio_backup_${date}-${time}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    static async import(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (importedData.accounts && importedData.settings) {
                        resolve(importedData);
                    } else {
                        reject(new Error('文件格式无效！'));
                    }
                } catch (error) {
                    reject(new Error('导入失败，文件可能已损坏！'));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }
}
