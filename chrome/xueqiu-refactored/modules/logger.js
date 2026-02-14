/**
 * 雪球监控助手 - 日志模块
 * Standardized logging utility.
 */

export class Logger {
    constructor(source = 'System') {
        this.source = source;
    }

    _getTimestamp() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    _format(levelLabel, message) {
        return `[${this._getTimestamp()}] [${this.source}] ${levelLabel} ${message}`;
    }

    info(message, data = null) {
        console.log(this._format('🔵 INFO:', message), data || '');
    }

    warn(message, data = null) {
        // 使用 console.log 替代 warn，避免触发扩展管理页报警
        console.log(this._format('🟠 WARN:', message), data || '');
    }

    error(message, error = null) {
        // 使用 console.log 替代 error，避免触发扩展管理页报警
        console.log(this._format('🔴 ERROR:', message), error || '');
    }
}

export const logger = new Logger('Background');
