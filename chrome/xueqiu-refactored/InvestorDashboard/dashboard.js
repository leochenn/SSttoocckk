import { StockService } from '../modules/stock.js';
import { Calculator } from '../modules/calculator.js';
import { Portfolio } from '../modules/portfolio.js';
import { DragDropManager } from '../modules/drag-drop-manager.js';
import { UIAnimator } from '../modules/ui-animator.js';
import { DataService } from '../modules/data-service.js';
import { DashboardCalculator } from '../modules/dashboard-calculator.js';
import { ViewRenderer } from '../modules/view-renderer.js';

document.addEventListener('DOMContentLoaded', function() {
    
    const getDefaultData = () => Portfolio.createDefaultData();

    let appData = getDefaultData();
    let stockInfoCache = {};
    let activeTabId = null;
    let refreshInterval;
    let manualPrice = null;

    const uiAnimator = new UIAnimator();
    const dragDropManager = new DragDropManager({
        selector: '.watchlist-row',
        onReorder: (from, to) => reorderWatchlist(from, to)
    });
    const dashboardCalculator = new DashboardCalculator({
        getAppData: () => appData,
        getStockInfoCache: () => stockInfoCache,
        getManualPrice: () => manualPrice
    });
    const viewRenderer = new ViewRenderer({
        getAppData: () => appData,
        getStockInfoCache: () => stockInfoCache,
        getActiveTabId: () => activeTabId
    });

    async function init() {
        loadDataFromLocalStorage();
        setupEventListeners();
        await fetchAllStockDataAndUpdateUI(); 
        renderAll();
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(fetchAllStockDataAndUpdateUI, 1500);
    }

    function saveDataToLocalStorage() {
        DataService.save(appData);
    }

    function loadDataFromLocalStorage() {
        appData = DataService.load(getDefaultData());
        activeTabId = appData.accounts.length > 0 ? appData.accounts[0].id : 'tab-watchlist';
    }

    function setupEventListeners() {
        document.body.addEventListener('click', handleGlobalClick);
        document.body.addEventListener('change', handleGlobalChange);
        document.body.addEventListener('blur', handleGlobalBlur, true);
        
        const calculatorTab = document.getElementById('tab-calculator');
        if (calculatorTab) {
            calculatorTab.addEventListener('input', function(e) {
                if (e.target.id === 'calc-current-price') {
                    const inputValue = parseFloat(e.target.value);
                    manualPrice = !isNaN(inputValue) && inputValue > 0 ? inputValue : null;
                }
                performCalculations();
            });
            calculatorTab.addEventListener('change', performCalculations);
        }

        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((message) => {
                if (message.type === 'PORTFOLIO_UPDATED') {
                    appData = message.data;
                    updateDynamicValues();
                }
            });
        }
    }

    async function fetchStockData(codes) {
        if (codes.length === 0) return true;
        try {
            const data = await StockService.fetchStockData(codes);
            Object.assign(stockInfoCache, data);
            return true;
        } catch (error) {
            console.error('获取股票数据失败:', error);
            return false;
        }
    }

    async function fetchAllStockDataAndUpdateUI() {
        const allCodes = new Set();
        appData.watchlist.forEach(item => {
            const code = typeof item === 'string' ? item : item.code;
            allCodes.add(code);
        });
        appData.accounts.forEach(acc => acc.holdings.forEach(h => allCodes.add(h.code)));
        Object.keys(appData.ytdData).forEach(code => allCodes.add(code));
        
        const success = await fetchStockData(Array.from(allCodes));
        if (success) {
            const now = new Date();
            const timeText = `${now.getHours().toString().padStart(2, '0')}时${now.getMinutes().toString().padStart(2, '0')}分${now.getSeconds().toString().padStart(2, '0')}秒`;
            uiAnimator.updateTimeWithAnimation(timeText);
        }
        updateDynamicValues();
    }
    
    function updateDynamicValues() {
        const totalAssets = Calculator.calculateTotalAssets(appData.accounts, stockInfoCache);

        appData.accounts.forEach(account => {
            account.holdings.forEach(h => {
                const info = stockInfoCache[h.code] || { price: 0 };
                const marketValue = h.shares * info.price;
                const row = document.querySelector(`#${account.id} .holding-row[data-code="${h.code}"]`);
                if (row) {
                    updateCell(row, '.name-cell', info.name || '...');
                    updateCell(row, '.price-cell', (Math.round(info.price * 1000) / 1000).toString());
                    updateCell(row, '.market-value-cell', marketValue.toFixed(2));
                    updateCell(row, '.total-position-cell', `${Calculator.calculatePositionRatio(marketValue, totalAssets).toFixed(3)}%`);
                }
            });
            updateAccountSummary(account.id, totalAssets);
        });

        appData.watchlist.forEach(item => {
            const code = typeof item === 'string' ? item : item.code;
            const info = stockInfoCache[code] || { name: '...', price: 0, changePercent: 0 };
            const ytdPrice = appData.ytdData[code];
            const ytdChange = ytdPrice && info.price > 0 ? (info.price - ytdPrice) / ytdPrice * 100 : 'N/A';
            const row = document.querySelector(`#watchlist-table .watchlist-row[data-code="${code}"]`);
            if(row) {
                updateCell(row, '.name-cell', info.name || '...');
                updateCell(row, '.price-cell', (Math.round(info.price * 1000) / 1000).toString(), info.changePercent);
                updateCell(row, '.change-percent-cell', `${info.changePercent.toFixed(2)}%`, info.changePercent);
                updateCell(row, '.ytd-change-cell', typeof ytdChange === 'number' ? `${ytdChange.toFixed(2)}%` : 'N/A', ytdChange);
            }
        });
        
        viewRenderer.renderTotalHoldings('total-holdings-table');
        viewRenderer.updateNetAssetCalculation();
        viewRenderer.renderDashboard();
    }

    function renderAll() {
        viewRenderer.renderTabs('tabs-container');
        viewRenderer.renderAccountContents('accounts-content-container');
        viewRenderer.renderWatchlist('watchlist-table');
        setupWatchlistDragEvents();
        viewRenderer.renderTotalHoldings('total-holdings-table');
        viewRenderer.renderAssetBreakdown('asset-breakdown-table');
        document.getElementById('notes-textarea').value = appData.notes || '';
        renderCalculator();
        viewRenderer.setActiveTab();
        updateDynamicValues();
    }

    function setupWatchlistDragEvents() {
        dragDropManager.init();
    }

    function reorderWatchlist(fromIndex, toIndex) {
        Portfolio.reorderWatchlist(appData, fromIndex, toIndex);
        saveDataToLocalStorage();
        viewRenderer.renderWatchlist('watchlist-table');
        setupWatchlistDragEvents();
        renderCalculator();
    }

    function updateCell(row, selector, value, numericValueForClass) {
        const cell = row.querySelector(selector);
        if(cell) {
            cell.innerText = value;
            if (numericValueForClass !== undefined) {
                cell.className = `${selector.substring(1)} ${numericValueForClass > 0 ? 'positive' : (numericValueForClass < 0 ? 'negative' : '')}`;
            }
        }
    }

    async function handleGlobalClick(e) {
        const target = e.target;
        if (target.matches('.tab-delete-btn')) {
            if (confirm('确定要删除吗？')) {
                Portfolio.deleteAccount(appData, target.dataset.accountId);
                if (activeTabId === target.dataset.accountId) activeTabId = 'tab-total';
                saveDataToLocalStorage();
                renderAll();
            }
            return;
        }
        if (target.matches('.tab-name') && target.isContentEditable) return;
        if (target.closest('.tab-link')) {
            activeTabId = target.closest('.tab-link').dataset.tab;
            viewRenderer.setActiveTab();
            return;
        }
        if (target.id === 'toggle-privacy-btn') {
            appData.settings.isPrivacyMode = !appData.settings.isPrivacyMode;
            saveDataToLocalStorage();
            viewRenderer.renderDashboard();
            return;
        }
        if (target.id === 'add-account-btn') {
            const name = prompt("请输入新账户的名称：", `账户${appData.accounts.length + 1}`);
            if (name) {
                const newAccount = Portfolio.addAccount(appData, name);
                activeTabId = newAccount.id;
                saveDataToLocalStorage();
                renderAll();
            }
        }
        if (target.id === 'settle-btn') {
            if (confirm("确定要进行每日结算吗？")) { 
                appData.settings.yesterdayAssets = Calculator.calculateTotalAssets(appData.accounts, stockInfoCache);
                saveDataToLocalStorage(); 
                renderAll(); 
                alert('结算成功！'); 
            }
        }
        if (target.id === 'export-data-btn') DataService.export(appData);
        if (target.id === 'import-data-btn') document.getElementById('import-file-input').click();
        if (target.id === 'add-btn-watchlist') {
            const input = document.getElementById('add-code-watchlist');
            const code = input.value.trim();
            if (code.length === 6 && Portfolio.addToWatchlist(appData, code)) {
                input.value = '';
                saveDataToLocalStorage();
                await fetchAllStockDataAndUpdateUI();
                renderAll();
            }
        }
        if (target.matches('.add-holding-btn')) {
            const accountId = target.dataset.account;
            const container = document.getElementById(accountId);
            const code = container.querySelector('.add-code-input').value;
            const shares = parseInt(container.querySelector('.add-shares-input').value);
            if (!code || isNaN(shares) || shares <= 0) { alert('请输入有效信息。'); return; }
            const info = stockInfoCache[code];
            if (!info || !info.price) { alert('无法获取价格信息。'); return; }
            if (Portfolio.addHolding(appData, accountId, { code, shares, costAmount: shares * info.price })) {
                saveDataToLocalStorage();
                await fetchAllStockDataAndUpdateUI();
                renderAll();
            }
        }
        if (target.id === 'calc-reset-price-btn') { manualPrice = null; performCalculations(); }
        if (target.id === 'add-breakdown-btn') {
            const descInput = document.getElementById('add-breakdown-description');
            const amountInput = document.getElementById('add-breakdown-amount');
            const amount = parseFloat(amountInput.value);
            if (descInput.value && !isNaN(amount)) {
                appData.assetBreakdown.push({ id: 'breakdown' + Date.now(), description: descInput.value.trim(), amount });
                descInput.value = ''; amountInput.value = '';
                saveDataToLocalStorage();
                renderAll();
            }
        }
        if (target.matches('.delete-btn')) {
            if (confirm('确定要删除吗？')) {
                if (target.matches('.delete-holding-btn')) Portfolio.deleteHolding(appData, target.dataset.accountId, target.dataset.code);
                if (target.matches('.delete-watchlist-btn')) Portfolio.removeFromWatchlist(appData, target.dataset.code);
                if (target.matches('.delete-breakdown-btn')) appData.assetBreakdown = appData.assetBreakdown.filter(item => item.id !== target.dataset.breakdownId);
                saveDataToLocalStorage();
                renderAll();
            }
        }
    }

    function handleGlobalChange(e) {
        const target = e.target;
        if (target.matches('.cash-input')) {
            const account = appData.accounts.find(a => a.id === target.dataset.accountId);
            if(account) { account.cash = parseFloat(target.value) || 0; saveDataToLocalStorage(); updateDynamicValues(); }
        }
        if (target.matches('.ytd-price-input-watchlist')) {
            appData.ytdData[target.dataset.code] = parseFloat(target.value) || 0;
            saveDataToLocalStorage(); updateDynamicValues();
        }
        if (target.id === 'import-file-input') {
            const file = e.target.files[0];
            if (!file) return;
            DataService.import(file).then(importedData => {
                if (confirm("导入新数据将覆盖当前所有数据，确定要继续吗？")) {
                    appData = importedData;
                    activeTabId = appData.accounts.length > 0 ? appData.accounts[0].id : 'tab-total';
                    saveDataToLocalStorage();
                    fetchAllStockDataAndUpdateUI().then(() => renderAll());
                    alert('数据导入成功！');
                }
            }).catch(err => alert(err.message)).finally(() => e.target.value = '');
        }
        if (target.id === 'notes-textarea') { appData.notes = target.value; saveDataToLocalStorage(); }
        if (target.matches('.grid-percent-input')) dashboardCalculator.calculateTargetPriceFromPercent(target, getCurrentPrice());
        if (target.matches('.grid-price-input')) dashboardCalculator.calculatePercentFromTargetPrice(target, getCurrentPrice());
        if (target.matches('.show-in-popup-checkbox')) {
            const item = appData.watchlist.find(item => (typeof item === 'string' ? item : item.code) === target.dataset.code);
            if (item) {
                if (typeof item === 'string') {
                    const idx = appData.watchlist.indexOf(item);
                    appData.watchlist[idx] = {code: item, showInPopup: target.checked};
                } else item.showInPopup = target.checked;
                saveDataToLocalStorage();
            }
        }
        if (target.matches('.alert-enabled-checkbox')) {
            const item = appData.watchlist.find(item => (typeof item === 'string' ? item : item.code) === target.dataset.code);
            if (item) {
                if (!item.alertConfig) item.alertConfig = { upperPercent: 0, lowerPercent: 0, enabled: false };
                item.alertConfig.enabled = target.checked;
                saveDataToLocalStorage();
            }
        }
        if (target.matches('.alert-upper-input')) {
            const item = appData.watchlist.find(item => (typeof item === 'string' ? item : item.code) === target.dataset.code);
            if (item) {
                if (!item.alertConfig) item.alertConfig = { upperPercent: 0, lowerPercent: 0, enabled: false };
                item.alertConfig.upperPercent = parseFloat(target.value) || 0;
                saveDataToLocalStorage();
            }
        }
        if (target.matches('.alert-lower-input')) {
            const item = appData.watchlist.find(item => (typeof item === 'string' ? item : item.code) === target.dataset.code);
            if (item) {
                if (!item.alertConfig) item.alertConfig = { upperPercent: 0, lowerPercent: 0, enabled: false };
                item.alertConfig.lowerPercent = parseFloat(target.value) || 0;
                saveDataToLocalStorage();
            }
        }
    }
    
    function handleGlobalBlur(e) {
        const target = e.target;
        if (target.matches('.tab-name')) {
            const account = appData.accounts.find(a => a.id === target.dataset.accountId);
            if (account && account.name !== target.innerText) { account.name = target.innerText; saveDataToLocalStorage(); renderAll(); }
        }
        if (target.id === 'summary-total-cost') {
            const val = parseFloat(target.innerText.replace(/,/g, ''));
            if (!isNaN(val)) { appData.settings.totalCost = val; saveDataToLocalStorage(); updateDynamicValues(); }
        }
        if (target.id === 'summary-yesterday-assets') {
            const val = parseFloat(target.innerText.replace(/,/g, ''));
            if (!isNaN(val)) { appData.settings.yesterdayAssets = val; saveDataToLocalStorage(); updateDynamicValues(); }
        }
        if (target.matches('.editable-shares')) {
            const { accountId, code } = target.dataset;
            const account = appData.accounts.find(a => a.id === accountId);
            const holding = account?.holdings.find(h => h.code === code);
            const newShares = parseInt(target.innerText.replace(/,/g, ''), 10);
            if (holding && !isNaN(newShares) && newShares >= 0) {
                holding.shares = newShares;
                holding.costAmount = newShares * (stockInfoCache[holding.code]?.price || 0);
                saveDataToLocalStorage(); updateDynamicValues();
            }
            if (holding) target.innerText = holding.shares.toLocaleString();
        }
        if (target.matches('.editable-breakdown-description')) {
            const item = appData.assetBreakdown.find(b => b.id === target.dataset.breakdownId);
            if (item) { item.description = target.innerText; saveDataToLocalStorage(); }
        }
        if (target.matches('.editable-breakdown-amount')) {
            const item = appData.assetBreakdown.find(b => b.id === target.dataset.breakdownId);
            const newAmount = parseFloat(target.innerText.replace(/,/g, ''));
            if (item && !isNaN(newAmount)) { item.amount = newAmount; saveDataToLocalStorage(); updateDynamicValues(); }
            if (item) target.innerText = item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }

    function renderCalculator() { dashboardCalculator.performCalculations(); }
    function performCalculations() { dashboardCalculator.performCalculations(); }
    function getCurrentPrice() {
        const selectedCode = document.getElementById('calc-stock-select').value;
        return manualPrice !== null && manualPrice > 0 ? manualPrice : (stockInfoCache[selectedCode]?.price || 0);
    }

    function updateAccountSummary(accountId, totalAssets) {
        const account = appData.accounts.find(a => a.id === accountId);
        if (!account) return;
        const marketValue = Calculator.calculateMarketValue(account.holdings, stockInfoCache);
        const summary = document.querySelector(`#${accountId} .account-summary`);
        if(summary) {
            summary.querySelector('.market-value').innerText = marketValue.toFixed(2);
            summary.querySelector('.total-assets').innerText = (marketValue + account.cash).toFixed(2);
            summary.querySelector('.position-ratio').innerText = `${Calculator.calculatePositionRatio(marketValue, totalAssets).toFixed(3)}%`;
            summary.querySelector('.cash-position-ratio').innerText = `${Calculator.calculatePositionRatio(account.cash, totalAssets).toFixed(3)}%`;
        }
    }

    init();
});
