/**
 * 雪球监控助手 - 监控引擎模块
 * 负责监控逻辑的决策和状态管理，不直接操作 Chrome API。
 */
import { CONFIG } from './config.js';

export class MonitorEngine {
    /**
     * 决定是否应该执行检查
     */
    static shouldPerformCheck(settings, tabsCount) {
        if (!settings.monitorTimeline) {
            return { shouldCheck: false, status: 'paused', message: '关注列表监控已禁用' };
        }
        if (tabsCount === 0) {
            return { shouldCheck: false, status: 'paused', message: '等待雪球页面' };
        }
        return { shouldCheck: true, status: 'running', message: '监控正在运行' };
    }

    /**
     * 处理内容更新判断
     */
    static processUpdate(newContent, storedSignature, storedCount) {
        if (!newContent || newContent.error || typeof newContent.signature === 'undefined') {
            return { hasUpdate: false };
        }
        
        if (newContent.signature !== storedSignature || newContent.count !== storedCount) {
            return { hasUpdate: true, signature: newContent.signature };
        }
        return { hasUpdate: false };
    }

    /**
     * 处理系统消息更新判断
     */
    static processSystemMessage(currentCount, lastCount) {
        if (currentCount > 0 && currentCount !== lastCount) {
            return { hasUpdate: true, count: currentCount };
        }
        return { hasUpdate: false };
    }
}
