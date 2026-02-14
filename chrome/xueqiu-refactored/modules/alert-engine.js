/**
 * 雪球监控助手 - 预警判定引擎
 */

export class AlertEngine {
    /**
     * 检查单只股票是否触发预警
     * @param {Object} stock - 股票实时数据 (来自 StockService)
     * @param {Object} config - 预警配置 (alertConfig)
     * @param {Object} state - 预警状态 (alertState)
     * @returns {Object|null} - 触发时返回 { message, newState }，否则返回 null
     */
    static checkAlert(stock, config, state) {
        if (!config || !config.enabled) return null;

        const { currentPrice, changePercent, name, code } = stock;
        const { upperPercent, lowerPercent } = config;
        const lastAlertTime = state?.lastAlertTime || 0;
        const lastAlertPrice = state?.lastAlertPrice || 0;
        const now = Date.now();

        let triggerType = null;
        let message = '';

        // 判定是否达到阈值
        if (upperPercent > 0 && changePercent >= upperPercent) {
            triggerType = 'UPPER';
            message = `🚀 【${name}】大涨 ${changePercent}%，突破预警线 ${upperPercent}%！当前价: ${currentPrice}`;
        } else if (lowerPercent < 0 && changePercent <= lowerPercent) {
            triggerType = 'LOWER';
            message = `📉 【${name}】大跌 ${changePercent}%，跌破预警线 ${lowerPercent}%！当前价: ${currentPrice}`;
        }

        if (!triggerType) return null;

        // 节流逻辑：1小时冷却时间，除非价格变动超过 1% (相对上次报警价)
        const cooldownMs = 60 * 60 * 1000;
        const isOutsideCooldown = (now - lastAlertTime) > cooldownMs;
        
        let isPriceMovedSignificantly = true;
        if (lastAlertPrice > 0) {
            const priceDiffPercent = Math.abs((currentPrice - lastAlertPrice) / lastAlertPrice) * 100;
            isPriceMovedSignificantly = priceDiffPercent >= 1.0;
        }

        if (isOutsideCooldown || isPriceMovedSignificantly) {
            return {
                message,
                newState: {
                    lastAlertTime: now,
                    lastAlertPrice: currentPrice
                }
            };
        }

        return null;
    }
}
