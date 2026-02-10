/**
 * 雪球监控助手 - 全局配置常量
 */

export const CONFIG = {
    // 监控闹钟名称
    ALARM_NAME: 'xueqiuMonitorAlarm',
    
    // NTFY 服务地址
    NTFY_URL: 'http://118.89.62.149:8090/ctrl_pc',
    
    // 默认监控设置
    DEFAULT_SETTINGS: {
        monitorTimeline: true,
        monitorSystemMessages: true,
        interval: 5
    },
    
    // 监控间隔限制（秒）
    INTERVAL: {
        MIN: 5,
        MAX: 8
    },
    
    // 交易时间配置
    TRADING_HOURS: {
        MORNING: { start: 820, end: 1155 },
        AFTERNOON: { start: 1250, end: 1600 }
    },
    
    // 页面地址
    URLS: {
        XUEQIU_HOME: 'https://xueqiu.com/',
        SYSTEM_MESSAGES: 'https://xueqiu.com/center/#/sys-message'
    }
};
