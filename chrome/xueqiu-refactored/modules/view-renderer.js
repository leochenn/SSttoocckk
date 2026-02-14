/**
 * 雪球监控助手 - 视图渲染模块
 * 负责将数据转换为 HTML 并更新 DOM。
 */
import { Calculator } from './calculator.js';

export class ViewRenderer {
    constructor(options) {
        this.getAppData = options.getAppData;
        this.getStockInfoCache = options.getStockInfoCache;
        this.getActiveTabId = options.getActiveTabId;
    }

    renderTabs(containerId) {
        const appData = this.getAppData();
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.querySelectorAll('.account-tab').forEach(tab => tab.remove());
        const staticTabs = container.querySelector('#add-account-btn');
        
        appData.accounts.forEach(account => {
            const tab = document.createElement('button');
            tab.className = 'tab-link account-tab';
            tab.dataset.tab = account.id;
            
            const tabName = document.createElement('span');
            tabName.className = 'tab-name';
            tabName.innerText = account.name;
            tabName.dataset.accountId = account.id;

            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'tab-delete-btn';
            deleteBtn.dataset.accountId = account.id;
            deleteBtn.dataset.name = account.name;
            
            tab.appendChild(tabName);
            tab.appendChild(deleteBtn);
            container.insertBefore(tab, staticTabs);
        });
    }

    renderAccountContents(containerId) {
        const appData = this.getAppData();
        const stockInfoCache = this.getStockInfoCache();
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        appData.accounts.forEach(account => {
            const content = document.createElement('div');
            content.id = account.id;
            content.dataset.tabId = account.id;
            content.className = 'tab-content';
            content.innerHTML = `
                <div class="account-summary">
                    <span>现金: <input type="number" class="cash-input" data-account-id="${account.id}" value="${account.cash}"></span>
                    <span>市值: <span class="market-value">0.00</span></span>
                    <span>总资产: <span class="total-assets">0.00</span></span>
                    <span>仓位: <span class="position-ratio">0.000%</span></span>
                    <span>现金仓位: <span class="cash-position-ratio">0.000%</span></span>
                </div>
                <table class="holdings-table"></table>
                <div class="actions">
                     <select class="add-code-input"></select>
                     <input type="number" class="add-shares-input" placeholder="持有份额">
                     <button class="add-holding-btn" data-account="${account.id}">添加持仓</button>
                </div>`;
            container.appendChild(content);
            
            const selectEl = content.querySelector('.add-code-input');
            selectEl.innerHTML = '<option value="">请从股票池选择</option>';
            appData.watchlist.forEach(item => {
                const code = typeof item === 'string' ? item : item.code;
                const info = stockInfoCache[code] || { name: '...' };
                const option = document.createElement('option');
                option.value = code;
                option.innerText = `${code} ${info.name}`;
                selectEl.appendChild(option);
            });

            this.renderAccountTable(account, content.querySelector('.holdings-table'), stockInfoCache);
        });
    }

    renderAccountTable(account, table, stockInfoCache) {
        const headers = `<thead><tr><th>代码</th><th>名称</th><th>份额</th><th>现价</th><th>市值</th><th>总仓位</th><th>操作</th></tr></thead>`;
        const rows = account.holdings.map(h => {
            const name = stockInfoCache[h.code]?.name || '...';
            return `
            <tr class="holding-row" data-code="${h.code}">
                <td class="code-cell">${h.code}</td>
                <td class="name-cell">${name}</td>
                <td class="shares-cell editable-shares" contenteditable="true" data-account-id="${account.id}" data-code="${h.code}">${h.shares.toLocaleString()}</td>
                <td class="price-cell">...</td>
                <td class="market-value-cell">...</td>
                <td class="total-position-cell">...</td>
                <td><button class="delete-btn delete-holding-btn" data-account-id="${account.id}" data-code="${h.code}">删除</button></td>
            </tr>`;
        }).join('');
        table.innerHTML = headers + `<tbody>${rows}</tbody>`;
    }

    renderWatchlist(containerId) {
        const appData = this.getAppData();
        const stockInfoCache = this.getStockInfoCache();
        const table = document.getElementById(containerId);
        if (!table) return;

        const headers = `<thead><tr><th>代码</th><th>名称</th><th>现价</th><th>今日涨跌</th><th>年初股价</th><th>今年涨跌</th><th>预警(涨/跌%)</th><th>显示</th><th>操作</th></tr></thead>`;
        const rows = appData.watchlist.map((item, index) => {
            const code = typeof item === 'string' ? item : item.code;
            const showInPopup = typeof item === 'string' ? false : item.showInPopup;
            const ytdPrice = appData.ytdData[code] || '';
            const name = stockInfoCache[code]?.name || '...';
            
            const alertConfig = item.alertConfig || { enabled: false, upperPercent: 0, lowerPercent: 0 };
            const isAlertEnabled = alertConfig.enabled;

            return `
            <tr class="watchlist-row" data-code="${code}" data-index="${index}" draggable="false">
                <td class="code-cell">
                    <div class="drag-hint">长按拖拽</div>
                    ${code}
                </td>
                <td class="name-cell">${name}</td>
                <td class="price-cell">...</td>
                <td class="change-percent-cell">...</td>
                <td><input type="number" class="ytd-price-input-watchlist" data-code="${code}" value="${ytdPrice}" placeholder="手动输入"></td>
                <td class="ytd-change-cell">...</td>
                <td class="alert-config-cell">
                    <input type="checkbox" class="alert-enabled-checkbox" data-code="${code}" ${isAlertEnabled ? 'checked' : ''}>
                    <input type="number" class="alert-upper-input" data-code="${code}" value="${alertConfig.upperPercent}" placeholder="涨%" step="0.1" style="width: 50px;">
                    <input type="number" class="alert-lower-input" data-code="${code}" value="${alertConfig.lowerPercent}" placeholder="跌%" step="0.1" style="width: 50px;">
                </td>
                <td><input type="checkbox" class="show-in-popup-checkbox" data-code="${code}" ${showInPopup ? 'checked' : ''}></td>
                <td><button class="delete-btn delete-watchlist-btn" data-code="${code}">删除</button></td>
            </tr>`;
        }).join('');
        table.innerHTML = headers + `<tbody>${rows}</tbody>`;
    }

    renderTotalHoldings(tableId) {
        const appData = this.getAppData();
        const stockInfoCache = this.getStockInfoCache();
        const table = document.getElementById(tableId);
        if (!table) return;

        const allHoldings = {};
        let totalCash = 0;
        appData.accounts.forEach(acc => {
            totalCash += acc.cash;
            acc.holdings.forEach(h => {
                if (!allHoldings[h.code]) allHoldings[h.code] = { code: h.code, shares: 0 };
                allHoldings[h.code].shares += Number(h.shares) || 0;
            });
        });
    
        const totalAssets = Calculator.calculateTotalAssets(appData.accounts, stockInfoCache);
        const headers = `<thead><tr><th>代码</th><th>名称</th><th>总份额</th><th>现价</th><th>总市值</th><th>仓位</th></tr></thead>`;
    
        const rows = Object.values(allHoldings).map(h => {
            const info = stockInfoCache[h.code] || { name: '...', price: 0 };
            const marketValue = h.shares * info.price;
            const positionRatio = `${Calculator.calculatePositionRatio(marketValue, totalAssets).toFixed(3)}%`;
            return `<tr><td>${h.code}</td><td>${info.name}</td><td>${h.shares.toLocaleString()}</td><td>${(Math.round(info.price * 1000) / 1000).toString()}</td><td>${marketValue.toFixed(2)}</td><td>${positionRatio}</td></tr>`;
        }).join('');
    
        const cashPositionRatio = `${Calculator.calculatePositionRatio(totalCash, totalAssets).toFixed(3)}%`;
        const footer = `<tfoot><tr><td>--</td><td><b>总现金</b></td><td>--</td><td>--</td><td><b>${totalCash.toFixed(2)}</b></td><td><b>${cashPositionRatio}</b></td></tr></tfoot>`;
        table.innerHTML = headers + `<tbody>${rows}</tbody>` + footer;
    }

    renderAssetBreakdown(tableId) {
        const appData = this.getAppData();
        const table = document.getElementById(tableId);
        if (!table) return;
        const tbody = table.querySelector('tbody');
        
        const rows = appData.assetBreakdown.map(item => {
            return `
            <tr>
                <td class="editable-breakdown-description" contenteditable="true" data-breakdown-id="${item.id}">${item.description}</td>
                <td class="editable-breakdown-amount" contenteditable="true" data-breakdown-id="${item.id}">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td><button class="delete-btn delete-breakdown-btn" data-breakdown-id="${item.id}">删除</button></td>
            </tr>`;
        }).join('');
        tbody.innerHTML = rows;
    }

    setActiveTab() {
        const activeTabId = this.getActiveTabId();
        document.querySelectorAll('.tab-link').forEach(tab => {
            const isActive = tab.dataset.tab === activeTabId;
            tab.classList.toggle('active', isActive);
            if (tab.classList.contains('account-tab')) {
                const tabName = tab.querySelector('.tab-name');
                if (tabName) tabName.contentEditable = isActive;
            }
        }); 
        document.querySelectorAll('.tab-content').forEach(content => content.classList.toggle('active', content.id === activeTabId || content.dataset.tabId === activeTabId));
    }

    renderDashboard() {
        const appData = this.getAppData();
        const stockInfoCache = this.getStockInfoCache();
        const isPrivacy = appData.settings.isPrivacyMode;
        const privacyText = '******';
        
        const privacyBtn = document.getElementById('toggle-privacy-btn');
        if (privacyBtn) privacyBtn.innerText = isPrivacy ? '显示' : '隐藏';

        const realtimeAssets = Calculator.calculateTotalAssets(appData.accounts, stockInfoCache);
        const yesterdayAssets = appData.settings.yesterdayAssets;
        const todayPl = Calculator.calculateProfit(realtimeAssets, yesterdayAssets);
        const totalCost = appData.settings.totalCost;
        const ytdPl = Calculator.calculateProfit(realtimeAssets, totalCost);

        this.updateText('summary-realtime-assets', isPrivacy ? privacyText : realtimeAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        
        const yesterdayAssetsEl = document.getElementById('summary-yesterday-assets');
        if (document.activeElement !== yesterdayAssetsEl) {
            this.updateText('summary-yesterday-assets', isPrivacy ? privacyText : yesterdayAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
        
        const totalCostEl = document.getElementById('summary-total-cost');
        if (document.activeElement !== totalCostEl) {
            this.updateText('summary-total-cost', isPrivacy ? privacyText : totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
        
        this.updateValueAndClass('summary-today-pl', todayPl, isPrivacy);
        this.updateValueAndClass('summary-ytd-pl', ytdPl, isPrivacy);
    }

    updateNetAssetCalculation() {
        const appData = this.getAppData();
        const stockInfoCache = this.getStockInfoCache();
        const totalAssets = Calculator.calculateTotalAssets(appData.accounts, stockInfoCache);
        const totalDeductions = appData.assetBreakdown.reduce((sum, item) => sum + item.amount, 0);
        const personalNetAssets = totalAssets - totalDeductions;
        const isPrivacy = appData.settings.isPrivacyMode;
        const privacyText = '******';
        
        this.updateText('total-assets-display', isPrivacy ? privacyText : totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        this.updateText('total-deductions-display', isPrivacy ? privacyText : totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        
        const netAssetEl = document.getElementById('personal-net-assets-display');
        if (netAssetEl) {
            netAssetEl.innerText = isPrivacy ? privacyText : personalNetAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            netAssetEl.className = `value ${personalNetAssets > 0 ? 'positive' : (personalNetAssets < 0 ? 'negative' : '')}`;
        }
    }

    updateText(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    }

    updateValueAndClass(id, plObj, isPrivacy) {
        const el = document.getElementById(id);
        if (!el) return;
        const privacyText = '******';
        el.innerText = isPrivacy ? privacyText : `${plObj.profit.toFixed(2)} (${plObj.ratio.toFixed(2)}%)`;
        el.className = `value ${plObj.profit > 0 ? 'positive' : (plObj.profit < 0 ? 'negative' : '')}`;
    }
}

