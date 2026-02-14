/**
 * 雪球监控助手 - 核心配置模块
 * Centralized configuration for the extension.
 */

export const CONFIG = {
    // 服务接口
    API: {
        NTFY_URL: 'http://118.89.62.149:8090/ctrl_pc',
        XUEQIU_BASE: 'https://xueqiu.com/',
        XUEQIU_MESSAGE: 'https://xueqiu.com/center/#/sys-message',
        TENCENT_STOCK_BASE: 'https://qt.gtimg.cn/q='
    },

    // 默认设置
    DEFAULTS: {
        SETTINGS: {
            monitorTimeline: true,
            monitorSystemMessages: true,
            interval: 5 // 默认间隔（秒）
        },
        STATUS: {
            state: 'stopped',
            message: '初始化中...'
        }
    },

    // 告警与调度
    ALARM: {
        NAME: 'xueqiuMonitorAlarm',
        MIN_INTERVAL: 5,
        MAX_INTERVAL: 8
    },

    // 错误代码
    ERRORS: {
        NO_POSTS: 'NO_POSTS',
        NO_CONTENT: 'NO_CONTENT_DESCRIPTION'
    },

    // 消息类型
    MSG_TYPES: {
        SETTINGS_CHANGED: 'settingsChanged',
        CONTENT_LOG: 'contentLog',
        CHECK_TIMELINE: 'refreshAndCheckTimeline',
        NAVIGATE_HOME: 'navigateToHome',
        STATUS_UPDATE: 'statusUpdate'
    },

    // 页面选择器
    SELECTORS: {
        FOLLOW_TAB_CONTAINER: '.home-timeline-tabs .sticky-content-fixed',
        STATUS_LIST: '.status-list',
        TIMELINE_ITEM: '.status-list article.timeline__item',
        POST_CONTENT: '.timeline__item__content .content--description',
        USER_NAME: '.user-name',
        LOADING_INDICATORS: '.status-list .loading, .status-list .loading-icon, .status-list .loading-text',
        SYSTEM_MSG_ITEM: 'li[data-analytics-data*="系统消息"]'
    }
};
