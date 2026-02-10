/**
 * 雪球监控助手 - 日志模块
 */

export const Logger = {
    getTimestamp() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}_`;
    },

    log(message, data = null) {
        const msg = `${this.getTimestamp()} ${message}`;
        if (data) {
            console.log(msg, data);
        } else {
            console.log(msg);
        }
    },

    error(message, error = null) {
        const msg = `${this.getTimestamp()} [ERROR] ${message}`;
        console.error(msg, error || '');
    },

    warn(message, data = null) {
        const msg = `${this.getTimestamp()} [WARN] ${message}`;
        console.warn(msg, data || '');
    }
};
