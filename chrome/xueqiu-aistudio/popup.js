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
        chrome.storage.local.get(['settings', 'status'], (result) => {
            const settings = result.settings || {};
            monitorTimeline.checked = settings.monitorTimeline !== false; // default to true
            monitorSystemMessages.checked = settings.monitorSystemMessages !== false; // default to true
            intervalInput.value = settings.interval || 10;
            
            const status = result.status || { state: 'stopped', message: '等待初始化' };
            updateStatus(status);
            
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
        chrome.storage.local.set({ settings }, () => {
            // Notify background script to update the alarm
            chrome.runtime.sendMessage({ type: 'settingsChanged', settings });
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
                    },
                    {
                        code: 'SZ000002',
                        name: '万科A',
                        showInPopup: false,
                        currentPrice: 18.90,
                        yesterdayPrice: 18.50
                    }
                ]
            };
            loadSelectedStocks(testData);
        }
    }
    
    // 加载选中的股票
    function loadSelectedStocks(portfolioData) {
        console.log('加载股票数据:', portfolioData);
        if (!portfolioData || !portfolioData.watchlist) {
            console.log('没有股票数据或watchlist');
            return;
        }
        
        console.log('watchlist数据:', portfolioData.watchlist);
        const selectedStocks = portfolioData.watchlist.filter(item => {
            if (typeof item === 'string') {
                console.log('跳过字符串格式的股票:', item);
                return false;
            }
            console.log('检查股票:', item, 'showInPopup:', item.showInPopup);
            return item.showInPopup === true;
        });
        
        console.log('选中的股票:', selectedStocks);
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
            stockItem.innerHTML = `
                <span class="stock-name" data-code="${stock.code}">...</span>
                <span class="stock-price" data-code="${stock.code}">...</span>
                <span class="stock-change" data-code="${stock.code}">...</span>
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
        const success = await fetchStockData(codes);
        if (success) {
            updateStockDisplay();
        }
    }
    
    // 获取股票数据
    async function fetchStockData(codes) {
        if (codes.length === 0) return true;
        
        const queryCodes = codes.map(getPrefixedCode).join(',');
        const url = `https://qt.gtimg.cn/q=${queryCodes}`;
        
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const decoder = new TextDecoder('gbk');
            const text = await decoder.decode(await blob.arrayBuffer());
            parseStockData(text);
            return true;
        } catch (error) {
            console.error('获取股票数据失败:', error);
            return false;
        }
    }
    
    // 获取带前缀的股票代码
    function getPrefixedCode(code) {
        const sh_indices = ['000001', '000905', '000852'];
        if (sh_indices.includes(code)) {
            return 'sh' + code;
        }
        
        const firstChar = code.charAt(0);
        if (firstChar === '6' || firstChar === '5' || firstChar === '9') {
            return 'sh' + code;
        }
        return 'sz' + code;
    }
    
    // 解析股票数据
    function parseStockData(text) {
        const lines = text.split('\n');
        lines.forEach(line => {
            if (line.trim() && line.includes('=')) {
                const [varName, dataStr] = line.split('=');
                const code = varName.replace('v_', '').replace('sh', '').replace('sz', '');
                const data = dataStr.replace(/"/g, '').replace(';', '');
                const fields = data.split('~');
                
                if (fields.length > 3) {
                    stockInfoCache[code] = {
                        name: fields[1],
                        price: parseFloat(fields[3]) || 0,
                        change: parseFloat(fields[31]) || 0,
                        changePercent: parseFloat(fields[32]) || 0
                    };
                }
            }
        });
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
                element.textContent = info.price.toFixed(2);
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
            if (message.type === 'statusUpdate') {
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