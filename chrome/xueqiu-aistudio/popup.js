/**
 * 雪球监控助手 - Popup 脚本
 */
import { Logger } from './modules/logger.js';
import { Storage } from './modules/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
    const monitorTimeline = document.getElementById('monitorTimeline');
    const monitorSystemMessages = document.getElementById('monitorSystemMessages');
    const intervalInput = document.getElementById('interval');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const openDashboardBtn = document.getElementById('openDashboard');
    const selectedStocksSection = document.getElementById('selectedStocks');
    const stocksList = document.getElementById('stocksList');
    const settingsTitle = document.getElementById('settingsTitle');

    let stockInfoCache = {};
    let stockUpdateInterval;
    let dataRefreshInterval;

    /**
     * 初始化 Popup
     */
    async function init() {
        try {
            const settings = await Storage.getSettings();
            monitorTimeline.checked = settings.monitorTimeline !== false;
            monitorSystemMessages.checked = settings.monitorSystemMessages !== false;
            intervalInput.value = settings.interval || 10;
            
            const status = await Storage.getLastState('status') || { state: 'stopped', message: '等待初始化' };
            updateStatusDisplay(status);
            
            refreshStockData();
            Logger.log('Popup 初始化完成');
        } catch (e) {
            Logger.error('Popup 初始化失败', e);
            // 降级处理
            updateStatusDisplay({ state: 'error', message: '初始化失败' });
        }
    }

    // 执行初始化
    await init();
    
    // 每3秒检查一次本地存储的数据更新（来自投资看板的修改）
    dataRefreshInterval = setInterval(refreshStockData, 3000);

    // 绑定事件
    monitorTimeline.addEventListener('change', saveSettings);
    monitorSystemMessages.addEventListener('change', saveSettings);
    intervalInput.addEventListener('change', saveSettings);
    intervalInput.addEventListener('keyup', saveSettings);

    if (settingsTitle) {
        settingsTitle.addEventListener('click', () => {
            chrome.tabs.create({ url: 'chrome://extensions/' });
        });
    }

    openDashboardBtn.addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('InvestorDashboard/dashboard.html')
        });
    });

    /**
     * 保存设置
     */
    async function saveSettings() {
        const intervalValue = Math.max(3, Math.min(60, parseInt(intervalInput.value, 10) || 10));
        intervalInput.value = intervalValue;

        const settings = {
            monitorTimeline: monitorTimeline.checked,
            monitorSystemMessages: monitorSystemMessages.checked,
            interval: intervalValue,
        };

        await Storage.setLastState('settings', settings);
        
        // 通知 Background 更新闹钟
        chrome.runtime.sendMessage({ type: 'settingsChanged', settings });
        updateStatusDisplay({ state: 'running', message: '设置已保存, 监控运行中...' });
        Logger.log('设置已更新', settings);
    }

    /**
     * 更新状态显示
     */
    function updateStatusDisplay(status) {
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
    
    /**
     * 刷新股票数据
     */
    function refreshStockData() {
        const stockPortfolioData = localStorage.getItem('stockPortfolioData');
        if (stockPortfolioData) {
            try {
                const portfolioData = JSON.parse(stockPortfolioData);
                loadSelectedStocks(portfolioData);
            } catch (error) {
                Logger.error('解析股票数据失败:', error);
            }
        }
    }
    
    /**
     * 加载选中的股票
     */
    function loadSelectedStocks(portfolioData) {
        if (!portfolioData || !portfolioData.watchlist) return;
        
        const selectedStocks = portfolioData.watchlist.filter(item => {
            return item && typeof item === 'object' && item.showInPopup === true;
        });
        
        if (selectedStocks.length === 0) {
            selectedStocksSection.style.display = 'none';
            return;
        }
        
        selectedStocksSection.style.display = 'block';
        renderSelectedStocks(selectedStocks);
        startStockUpdates(selectedStocks);
    }
    
    /**
     * 渲染选中的股票列表
     */
    function renderSelectedStocks(stocks) {
        // 避免重复渲染
        const currentCount = stocksList.children.length;
        if (currentCount !== stocks.length) {
            stocksList.innerHTML = '';
            stocks.forEach(stock => {
                const stockItem = document.createElement('div');
                stockItem.className = 'stock-item';
                stockItem.innerHTML = `
                    <span class="stock-name" data-code="${stock.code}">...</span>
                    <span class="stock-price" data-code="${stock.code}">...</span>
                    <span class="stock-change" data-code="${stock.code}">...</span>
                `;
                stocksList.appendChild(stockItem);
            });
        }
    }
    
    /**
     * 开始股票价格轮询更新
     */
    function startStockUpdates(stocks) {
        if (stockUpdateInterval) clearInterval(stockUpdateInterval);
        
        const update = () => updateStockPrices(stocks);
        update();
        stockUpdateInterval = setInterval(update, 5000);
    }
    
    /**
     * 更新股票价格
     */
    async function updateStockPrices(stocks) {
        const codes = stocks.map(stock => stock.code);
        if (codes.length === 0) return;
        
        const queryCodes = codes.map(code => {
            const sh_indices = ['000001', '000905', '000852'];
            if (sh_indices.includes(code)) return 'sh' + code;
            const firstChar = code.charAt(0);
            return (firstChar === '6' || firstChar === '5' || firstChar === '9') ? 'sh' + code : 'sz' + code;
        }).join(',');

        try {
            const response = await fetch(`https://qt.gtimg.cn/q=${queryCodes}`);
            const buffer = await response.arrayBuffer();
            const text = new TextDecoder('gbk').decode(buffer);
            
            // 解析数据
            text.split('\n').forEach(line => {
                if (!line.includes('=')) return;
                const [varName, dataStr] = line.split('=');
                const code = varName.replace(/[v_shz]/g, '');
                const fields = dataStr.replace(/[";]/g, '').split('~');
                
                if (fields.length > 31) {
                    stockInfoCache[code] = {
                        name: fields[1],
                        price: parseFloat(fields[3]) || 0,
                        changePercent: parseFloat(fields[32]) || 0
                    };
                }
            });
            
            // 更新 DOM
            document.querySelectorAll('.stock-name').forEach(el => {
                const info = stockInfoCache[el.dataset.code];
                if (info) el.textContent = info.name;
            });
            
            document.querySelectorAll('.stock-price, .stock-change').forEach(el => {
                const info = stockInfoCache[el.dataset.code];
                if (!info) return;

                if (el.classList.contains('stock-price')) {
                    el.textContent = info.price.toFixed(2);
                } else {
                    el.textContent = `${info.changePercent > 0 ? '+' : ''}${info.changePercent.toFixed(2)}%`;
                }

                el.classList.remove('positive', 'negative');
                if (info.changePercent > 0) el.classList.add('positive');
                else if (info.changePercent < 0) el.classList.add('negative');
            });

        } catch (error) {
            Logger.error('获取股票数据失败', error);
        }
    }

    /**
     * 监听来自 Background 的状态更新消息
     */
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'statusUpdate') {
            updateStatusDisplay(message.status);
        }
    });
    
    // 清理定时器
    window.addEventListener('beforeunload', () => {
        if (stockUpdateInterval) clearInterval(stockUpdateInterval);
        if (dataRefreshInterval) clearInterval(dataRefreshInterval);
    });
});
