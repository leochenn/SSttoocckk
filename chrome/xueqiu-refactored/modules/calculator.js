/**
 * 雪球监控助手 - 核心计算模块
 * 负责所有资产、盈亏和仓位的数学计算，不依赖于 DOM。
 */

export class Calculator {
    /**
     * 计算账户总市值
     * @param {Array} holdings - 持仓数组 [{code, shares}]
     * @param {Object} stockInfoCache - 股票信息缓存 {code: {price}}
     */
    static calculateMarketValue(holdings, stockInfoCache) {
        return holdings.reduce((total, h) => {
            const info = stockInfoCache[h.code] || { price: 0 };
            return total + (Number(h.shares) || 0) * (info.price || 0);
        }, 0);
    }

    /**
     * 计算总资产
     * @param {Array} accounts - 账户数组 [{cash, holdings}]
     * @param {Object} stockInfoCache - 股票信息缓存
     */
    static calculateTotalAssets(accounts, stockInfoCache) {
        return accounts.reduce((total, acc) => {
            const marketValue = this.calculateMarketValue(acc.holdings, stockInfoCache);
            return total + (Number(acc.cash) || 0) + marketValue;
        }, 0);
    }

    /**
     * 计算盈亏及比例
     * @param {number} currentAssets - 当前总资产
     * @param {number} baseAssets - 基准资产（如昨日资产或总成本）
     */
    static calculateProfit(currentAssets, baseAssets) {
        const profit = currentAssets - baseAssets;
        const ratio = baseAssets > 0 ? (profit / baseAssets) * 100 : 0;
        return { profit, ratio };
    }

    /**
     * 计算仓位比例
     * @param {number} partValue - 部分资产价值
     * @param {number} totalAssets - 总资产
     */
    static calculatePositionRatio(partValue, totalAssets) {
        if (totalAssets <= 0) return 0;
        return (partValue / totalAssets) * 100;
    }
}
