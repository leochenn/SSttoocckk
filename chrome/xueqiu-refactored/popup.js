import { StorageService } from './modules/storage.js';
import { StockService } from './modules/stock.js';
import { CONFIG } from './modules/config.js';

document.addEventListener('DOMContentLoaded', () => {
    const monitorTimeline = document.getElementById('monitorTimeline');
    const monitorSystemMessages = document.getElementById('monitorSystemMessages');
    const intervalInput = document.getElementById('interval');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const openDashboardBtn = document.getElementById('openDashboard');
    const selectedStocksSection = document.getElementById('selectedStocks');
    const stocksList = document.getElementById('stocksList');

    let stockInfoCache = {};
    let stockUpdateInterval;
    let dataRefreshInterval;

    // Load settings from storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
        StorageService.getSettings().then((settings) => {
            monitorTimeline.checked = settings.monitorTimeline !== false; // default to true
            monitorSystemMessages.checked = settings.monitorSystemMessages !== false; // default to true
            intervalInput.value = settings.interval || 10;
            
            StorageService.get('status').then((result) => {
                const status = result.status || { state: 'stopped', message: '等待初始化' };
                updateStatus(status);
            });
            
            // 从localStorage读取股票数据
            refreshStockData();
        });
    } else {
        // 浏览器环境下的默认设置
        monitorTimeline.checked = true;
        monitorSystemMessages.checked = true;
        intervalInput.value = 10;
        updateStatus({ state: 'stopped', message: '浏览器预览模式' });
        
        // 从localStorage读取股票数据
        refreshStockData();
    }
    
    // 每3秒检查一次数据更新
    dataRefreshInterval = setInterval(refreshStockData, 3000);

    // Save settings on change
    monitorTimeline.addEventListener('change', saveSettings);
    monitorSystemMessages.addEventListener('change', saveSettings);
    intervalInput.addEventListener('change', saveSettings);
    intervalInput.addEventListener('keyup', saveSettings);

    // Open dashboard button event
    openDashboardBtn.addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('InvestorDashboard/dashboard.html')
        });
    });

    // Settings title click event - open Chrome extensions page
    const settingsTitle = document.getElementById('settingsTitle');
    if (settingsTitle) {
        settingsTitle.addEventListener('click', () => {
            chrome.tabs.create({
                url: 'chrome://extensions/'
            });
        });
    }

    function saveSettings() {
        const intervalValue = Math.max(3, Math.min(60, parseInt(intervalInput.value, 10) || 10));
        intervalInput.value = intervalValue;

        const settings = {
            monitorTimeline: monitorTimeline.checked,
            monitorSystemMessages: monitorSystemMessages.checked,
            interval: intervalValue,
        };
        StorageService.saveSettings(settings).then(() => {
            // Notify background script to update the alarm
            chrome.runtime.sendMessage({ type: CONFIG.MSG_TYPES.SETTINGS_CHANGED, settings });
            updateStatus({ state: 'running', message: '设置已保存, 监控运行中...' });
        });
    }

    function updateStatus(status) {
        statusText.textContent = status.message;
        switch(status.state) {
            case 'running':
                statusIndicator.style.backgroundColor = 'green';
                break;
            case 'paused':
                statusIndicator.style.backgroundColor = 'gray';
                break;
            case 'error':
                statusIndicator.style.backgroundColor = 'red';
                break;
            default:
                statusIndicator.style.backgroundColor = 'gray';
        }
    }
    
    // 刷新股票数据
    function refreshStockData() {
        const stockPortfolioData = localStorage.getItem('stockPortfolioData');
        if (stockPortfolioData) {
            try {
                const portfolioData = JSON.parse(stockPortfolioData);
                loadSelectedStocks(portfolioData);
            } catch (error) {
                console.error('解析股票数据失败:', error);
            }
        } else if (typeof chrome === 'undefined') {
            // 浏览器预览模式下的测试数据
            const testData = {
                watchlist: [
                    {
                        code: 'SZ000001',
                        name: '平安银行',
                        showInPopup: true,
                        currentPrice: 12.45,
                        yesterdayPrice: 12.20
                    },
                    {
                        code: 'SH600036',
                        name: '招商银行',
                        showInPopup: true,
                        currentPrice: 45.67,
                        yesterdayPrice: 46.20
                    }
                ]
            };
            loadSelectedStocks(testData);
        }
    }
    
    // 加载选中的股票
    function loadSelectedStocks(portfolioData) {
        if (!portfolioData || !portfolioData.watchlist) {
            return;
        }
        
        const selectedStocks = portfolioData.watchlist.filter(item => {
            if (typeof item === 'string') return false;
            return item.showInPopup === true;
        });
        
        if (selectedStocks.length === 0) {
            selectedStocksSection.style.display = 'none';
            return;
        }
        
        selectedStocksSection.style.display = 'block';
        renderSelectedStocks(selectedStocks);
        startStockUpdates(selectedStocks);
    }
    
    // 渲染选中的股票
    function renderSelectedStocks(stocks) {
        stocksList.innerHTML = '';
        stocks.forEach(stock => {
            const stockItem = document.createElement('div');
            stockItem.className = 'stock-item';
            // 使用缓存的数据（如果存在）来避免闪烁
            const cache = stockInfoCache[stock.code];
            const name = cache ? cache.name : '...';
            const price = cache ? cache.price.toFixed(2) : '...';
            let changeText = '...';
            let changeClass = 'stock-change';
            
            if (cache) {
                changeText = `${cache.changePercent > 0 ? '+' : ''}${cache.changePercent.toFixed(2)}%`;
                if (cache.changePercent > 0) changeClass += ' positive';
                else if (cache.changePercent < 0) changeClass += ' negative';
            }

            stockItem.innerHTML = `
                <span class="stock-name" data-code="${stock.code}">${name}</span>
                <span class="stock-price ${cache && cache.changePercent > 0 ? 'positive' : (cache && cache.changePercent < 0 ? 'negative' : '')}" data-code="${stock.code}">${price}</span>
                <span class="${changeClass}" data-code="${stock.code}">${changeText}</span>
            `;
            stocksList.appendChild(stockItem);
        });
    }
    
    // 开始股票价格更新
    function startStockUpdates(stocks) {
        if (stockUpdateInterval) {
            clearInterval(stockUpdateInterval);
        }
        
        // 立即更新一次
        updateStockPrices(stocks);
        
        // 每5秒更新一次
        stockUpdateInterval = setInterval(() => {
            updateStockPrices(stocks);
        }, 5000);
    }
    
    // 更新股票价格
    async function updateStockPrices(stocks) {
        const codes = stocks.map(stock => stock.code);
        const data = await StockService.fetchStockData(codes);
        
        // Update cache
        Object.assign(stockInfoCache, data);
        updateStockDisplay();
    }
    
    // 更新股票显示
    function updateStockDisplay() {
        const nameElements = document.querySelectorAll('.stock-name');
        const priceElements = document.querySelectorAll('.stock-price');
        const changeElements = document.querySelectorAll('.stock-change');
        
        nameElements.forEach(element => {
            const code = element.dataset.code;
            const info = stockInfoCache[code];
            if (info) {
                element.textContent = info.name || code;
            }
        });
        
        priceElements.forEach(element => {
            const code = element.dataset.code;
            const info = stockInfoCache[code];
            if (info) {
                element.textContent = info.currentPrice.toFixed(2);
                element.className = 'stock-price';
                if (info.changePercent > 0) {
                    element.classList.add('positive');
                } else if (info.changePercent < 0) {
                    element.classList.add('negative');
                }
            }
        });
        
        changeElements.forEach(element => {
            const code = element.dataset.code;
            const info = stockInfoCache[code];
            if (info) {
                const changeText = `${info.changePercent > 0 ? '+' : ''}${info.changePercent.toFixed(2)}%`;
                element.textContent = changeText;
                element.className = 'stock-change';
                if (info.changePercent > 0) {
                    element.classList.add('positive');
                } else if (info.changePercent < 0) {
                    element.classList.add('negative');
                }
            }
        });
    }

    // Listen for status updates from the background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === CONFIG.MSG_TYPES.STATUS_UPDATE) {
                updateStatus(message.status);
            }
        });
    }
    
    // 页面卸载时清理定时器
    window.addEventListener('beforeunload', () => {
        if (stockUpdateInterval) {
            clearInterval(stockUpdateInterval);
        }
        if (dataRefreshInterval) {
            clearInterval(dataRefreshInterval);
        }
    });
});
