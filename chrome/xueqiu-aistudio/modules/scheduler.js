/**
 * 雪球监控助手 - 调度模块
 */
import { CONFIG } from './config.js';
import { Logger } from './logger.js';
import { Storage } from './storage.js';
import { MonitorCore } from './monitor-core.js';

export const Scheduler = {
    /**
     * 创建随机间隔闹钟
     */
    createAlarm(minSeconds = CONFIG.INTERVAL.MIN, maxSeconds = CONFIG.INTERVAL.MAX) {
        const randomIntervalSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
        chrome.alarms.clear(CONFIG.ALARM_NAME); 
        chrome.alarms.create(CONFIG.ALARM_NAME, {
            delayInMinutes: randomIntervalSeconds / 60 
        });
        Logger.log(`闹钟已设置为将在 ${randomIntervalSeconds} 秒后触发。`);
    },

    /**
     * 判断是否在交易时间内
     */
    isWithinTradingHours() {
        const now = new Date();
        const day = now.getDay(); // 0 (Sunday) to 6 (Saturday)
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // 周末不交易
        if (day === 0 || day === 6) {
            return false;
        }

        const currentTime = hours * 100 + minutes;

        // 早盘
        const isMorning = currentTime >= CONFIG.TRADING_HOURS.MORNING.start && 
                         currentTime <= CONFIG.TRADING_HOURS.MORNING.end;
        // 午盘
        const isAfternoon = currentTime >= CONFIG.TRADING_HOURS.AFTERNOON.start && 
                           currentTime <= CONFIG.TRADING_HOURS.AFTERNOON.end;

        return isMorning || isAfternoon;
    },

    /**
     * 管理闹钟生命周期
     */
    async manageAlarmLifecycle() {
        const tabs = await chrome.tabs.query({ url: "https://xueqiu.com/*" });
        const settings = await Storage.getSettings();

        if (!settings.monitorTimeline) {
            Logger.log('关注列表监控开关已关闭，停止闹钟。');
            chrome.alarms.clear(CONFIG.ALARM_NAME);
            await Storage.updateStatus('paused', '关注列表监控已禁用');
            return;
        }

        if (tabs.length > 0) {
            Logger.log('检测到雪球页面，且关注列表监控已启用，确保闹钟正在运行。');
            this.createAlarm();
            
            const status = await Storage.getLastState('status');
            if (status && status.message === '等待雪球页面') {
                await Storage.updateStatus('running', '监控已启动');
            }
            
            // 尝试对第一个标签页注入
            await MonitorCore.ensureContentScriptInjected(tabs[0].id);
        } else {
            Logger.log('未检测到雪球页面，停止闹钟。');
            chrome.alarms.clear(CONFIG.ALARM_NAME);
            await Storage.updateStatus('paused', '等待雪球页面');
        }
    }
};
