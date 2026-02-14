/**
 * 雪球监控助手 - 投资组合领域逻辑
 * 负责管理账户、持仓、自选股的数据结构变更。
 */

export class Portfolio {
    /**
     * 初始化默认数据
     */
    static createDefaultData() {
        return {
            accounts: [{
                id: 'acc' + Date.now(),
                name: '初始账户',
                cash: 0,
                holdings: []
            }],
            watchlist: [],
            settings: {
                totalCost: 0,
                yesterdayAssets: 0,
                isPrivacyMode: false
            },
            ytdData: {},
            assetBreakdown: [],
            notes: ""
        };
    }

    /**
     * 添加账户
     */
    static addAccount(data, name) {
        const newAccount = {
            id: 'acc' + Date.now() + Math.random().toString(36).substr(2, 5),
            name: name || `账户${data.accounts.length + 1}`,
            cash: 0,
            holdings: []
        };
        data.accounts.push(newAccount);
        return newAccount;
    }

    /**
     * 删除账户
     */
    static deleteAccount(data, accountId) {
        data.accounts = data.accounts.filter(acc => acc.id !== accountId);
    }

    /**
     * 添加持仓
     */
    static addHolding(data, accountId, holding) {
        const account = data.accounts.find(a => a.id === accountId);
        if (account) {
            // 如果已存在相同代码，则合并份额（可选逻辑，目前保持追加）
            account.holdings.push({
                code: holding.code,
                shares: Number(holding.shares),
                costAmount: Number(holding.costAmount)
            });
            return true;
        }
        return false;
    }

    /**
     * 删除持仓
     */
    static deleteHolding(data, accountId, code) {
        const account = data.accounts.find(a => a.id === accountId);
        if (account) {
            account.holdings = account.holdings.filter(h => h.code !== code);
        }
    }

    /**
     * 管理自选股
     */
    static addToWatchlist(data, code) {
        const exists = data.watchlist.some(item => (typeof item === 'string' ? item : item.code) === code);
        if (!exists) {
            data.watchlist.push({ 
                code: code, 
                showInPopup: false,
                alertConfig: {
                    upperPercent: 0,
                    lowerPercent: 0,
                    enabled: false
                },
                alertState: {
                    lastAlertTime: 0,
                    lastAlertPrice: 0
                }
            });
            return true;
        }
        return false;
    }

    static removeFromWatchlist(data, code) {
        data.watchlist = data.watchlist.filter(item => (typeof item === 'string' ? item : item.code) !== code);
    }

    /**
     * 重新排序自选股
     */
    static reorderWatchlist(data, fromIndex, toIndex) {
        const newWatchlist = [...data.watchlist];
        const [movedItem] = newWatchlist.splice(fromIndex, 1);
        newWatchlist.splice(toIndex, 0, movedItem);
        data.watchlist = newWatchlist;
    }
}
