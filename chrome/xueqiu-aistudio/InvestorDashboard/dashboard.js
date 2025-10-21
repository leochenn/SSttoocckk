document.addEventListener('DOMContentLoaded', function() {
    
    const getDefaultData = () => ({
        accounts: [{
            id: 'acc' + Date.now(),
            name: '初始账户',
            cash: 0,
            holdings: []
        }],
        watchlist: [
            {code: "000001", showInPopup: false}, {code: "399006", showInPopup: false}, 
            {code: "399300", showInPopup: false}, {code: "000905", showInPopup: false}, 
            {code: "000852", showInPopup: false}, {code: "512890", showInPopup: false}, 
            {code: "399986", showInPopup: false}, {code: "603323", showInPopup: false}, 
            {code: "002807", showInPopup: false}
        ],
        settings: {
            totalCost: 0,
            yesterdayAssets: 0,
            isPrivacyMode: false // 1. 新增隐私模式状态
        },
        ytdData: {
            "000001": 3351.76, "399006": 2141.6, "399300": 3934.91, "000905": 5725.73,
            "000852": 5957.72, "512890": 1.124, "399986": 7119.56, "603323": 4.65, "002807": 4.15
        },
        assetBreakdown: [],
        notes: "这是一个备注区域，您可以在这里记录任何信息。"
    });

    let appData = getDefaultData();
    let stockInfoCache = {};
    let activeTabId = null;
    let refreshInterval;
    let manualPrice = null; // 添加手动价格变量

    async function init() {
        loadDataFromLocalStorage();
        setupEventListeners();
        await fetchAllStockDataAndUpdateUI(); 
        renderAll();
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(fetchAllStockDataAndUpdateUI, 1500);
    }

    function saveDataToLocalStorage() {
        localStorage.setItem('stockPortfolioData', JSON.stringify(appData));
    }

    function loadDataFromLocalStorage() {
        const savedData = localStorage.getItem('stockPortfolioData');
        if (savedData) {
            appData = JSON.parse(savedData);
        } else {
            appData = getDefaultData();
        }
        if (appData.notes === undefined) appData.notes = "";
        if (appData.settings.isPrivacyMode === undefined) appData.settings.isPrivacyMode = false;
        if (appData.assetBreakdown === undefined) appData.assetBreakdown = [];
        
        // 兼容性处理：将旧的字符串数组格式转换为新的对象格式
        if (appData.watchlist && appData.watchlist.length > 0 && typeof appData.watchlist[0] === 'string') {
            appData.watchlist = appData.watchlist.map(code => ({
                code: code,
                showInPopup: false
            }));
        }
        
        activeTabId = appData.accounts.length > 0 ? appData.accounts[0].id : 'tab-watchlist';
    }

    function setupEventListeners() {
        document.body.addEventListener('click', handleGlobalClick);
        document.body.addEventListener('change', handleGlobalChange);
        document.body.addEventListener('blur', handleGlobalBlur, true);
        // 新增：为计算器添加专用的事件监听
        const calculatorTab = document.getElementById('tab-calculator');
        calculatorTab.addEventListener('input', function(e) {
            if (e.target.id === 'calc-current-price') {
                const inputValue = parseFloat(e.target.value);
                manualPrice = !isNaN(inputValue) && inputValue > 0 ? inputValue : null;
            }
            performCalculations();
        });
        calculatorTab.addEventListener('change', performCalculations); // 监听select变化
    }
    
    function getPrefixedCode(code) {
        // Rule 1: Special indices that look like SZ stocks but are SH, based on VBA logic.
        const sh_indices = ['000001', '000905', '000852'];
        if (sh_indices.includes(code)) {
            return 'sh' + code;
        }

        // Rule 2: General rules based on starting characters.
        const firstChar = code.charAt(0);
        if (firstChar === '6' || firstChar === '5' || firstChar === '9') { // SSE Stocks, Funds, B-shares
            return 'sh' + code;
        }
        // For SZSE, any other numeric start is likely correct.
        // This covers 0 (main), 3 (ChiNext), 1 (funds), 2 (B-shares) etc.
        // It also correctly handles SZSE indices like 399xxx.
        return 'sz' + code;
    }

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

    let lastTimeDigits = null;

    function initializeTimeDigits() {
        const timeElement = document.getElementById('last-update-time');
        const digits = timeElement.querySelectorAll('.time-digit');
        
        digits.forEach(digit => {
            if (!digit.querySelector('.digit-container')) {
                digit.innerHTML = '<div class="digit-container"><div class="digit-value current">0</div></div>';
            }
        });
    }

    function updateTimeWithAnimation(newTimeText) {
        // 解析时间字符串，提取各个数字
        const timeMatch = newTimeText.match(/(\d{2})时 (\d{2})分 (\d{2})秒/);
        if (!timeMatch) return;
        
        const [, hours, minutes, seconds] = timeMatch;
        const newDigits = {
            h1: hours[0],
            h2: hours[1],
            m1: minutes[0],
            m2: minutes[1],
            s1: seconds[0],
            s2: seconds[1]
        };
        
        // 初始化数字容器（如果还没有）
        initializeTimeDigits();
        
        // 如果是第一次更新，直接设置值
        if (!lastTimeDigits) {
            Object.keys(newDigits).forEach(position => {
                updateDigit(position, newDigits[position], false);
            });
            lastTimeDigits = newDigits;
            return;
        }
        
        // 比较新旧值，只对变化的数字执行动画
        Object.keys(newDigits).forEach(position => {
            if (lastTimeDigits[position] !== newDigits[position]) {
                updateDigit(position, newDigits[position], true);
            }
        });
        
        lastTimeDigits = newDigits;
    }

    function updateDigit(position, newValue, animate = true) {
        const digitElement = document.querySelector(`[data-position="${position}"]`);
        if (!digitElement) return;
        
        const container = digitElement.querySelector('.digit-container');
        if (!container) return;
        
        if (!animate) {
            // 直接更新，不使用动画
            container.innerHTML = `<div class="digit-value current">${newValue}</div>`;
            return;
        }
        
        // 清理所有旧的非current元素
        const oldElements = container.querySelectorAll('.digit-value:not(.current)');
        oldElements.forEach(el => el.remove());
        
        const currentValueElement = container.querySelector('.digit-value.current');
        
        // 如果当前值已经是目标值，不需要动画
        if (currentValueElement && currentValueElement.textContent === newValue) {
            return;
        }
        
        // 创建新的数字元素
        const newValueElement = document.createElement('div');
        newValueElement.className = 'digit-value slide-in-down';
        newValueElement.textContent = newValue;
        container.appendChild(newValueElement);
        
        // 开始动画
        requestAnimationFrame(() => {
            if (currentValueElement) {
                currentValueElement.classList.add('slide-out-up');
                currentValueElement.classList.remove('current');
            }
            
            requestAnimationFrame(() => {
                newValueElement.classList.remove('slide-in-down');
                newValueElement.classList.add('current');
            });
        });
        
        // 清理旧元素
        setTimeout(() => {
            // 清理所有非current的元素
            const elementsToRemove = container.querySelectorAll('.digit-value:not(.current)');
            elementsToRemove.forEach(el => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
        }, 350);
    }

    async function fetchAllStockDataAndUpdateUI() {
        const allCodes = new Set();
        // 处理新的watchlist数据结构
        appData.watchlist.forEach(item => {
            const code = typeof item === 'string' ? item : item.code;
            allCodes.add(code);
        });
        appData.accounts.forEach(acc => acc.holdings.forEach(h => allCodes.add(h.code)));
        Object.keys(appData.ytdData).forEach(code => allCodes.add(code));
        const success = await fetchStockData(Array.from(allCodes));
        if (success) {
            const now = new Date();
            const timeText = `${now.getHours().toString().padStart(2, '0')}时 ${now.getMinutes().toString().padStart(2, '0')}分 ${now.getSeconds().toString().padStart(2, '0')}秒`;
            updateTimeWithAnimation(timeText);
        }
        updateDynamicValues();
    }
    
    function updateDynamicValues() {
        let totalMarketValue = 0;
        let totalCash = 0;
        appData.accounts.forEach(acc => {
            totalCash += acc.cash;
            acc.holdings.forEach(h => {
                const info = stockInfoCache[h.code] || { price: 0 };
                totalMarketValue += h.shares * info.price;
            });
        });
        const totalAssets = totalMarketValue + totalCash;

        appData.accounts.forEach(account => {
            account.holdings.forEach(h => {
                const info = stockInfoCache[h.code] || { price: 0 };
                const marketValue = h.shares * info.price;
                const totalPositionRatio = totalAssets > 0 ? `${Math.round((marketValue / totalAssets * 100) * 1000) / 1000}%` : '0.000%';
                const row = document.querySelector(`#${account.id} .holding-row[data-code="${h.code}"]`);
                if (row) {
                    updateCell(row, '.name-cell', info.name || '...');
                    updateCell(row, '.price-cell', (Math.round(info.price * 1000) / 1000).toString());
                    updateCell(row, '.market-value-cell', marketValue.toFixed(2));
                    updateCell(row, '.total-position-cell', totalPositionRatio);
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
        
        // 更新总持仓tab中的现价和相关数据
        updateTotalHoldingsValues(totalAssets);
        updateNetAssetCalculation();
        
        renderDashboard();
    }
    
    function renderAll() {
        renderTabs();
        renderAccountContents();
        renderWatchlist();
        renderTotalHoldings();
        renderAssetBreakdown();
        renderNotes();
        renderCalculator(); // 新增：渲染计算器
        setActiveTab();
        updateDynamicValues();
    }
    
    async function handleGlobalClick(e) {
        const target = e.target;
    
        // BUG修复：优先处理最具体的点击目标——Tab上的删除按钮
        if (target.matches('.tab-delete-btn')) {
            if (confirm('确定要删除吗？')) {
                deleteAccount(target.dataset.accountId, target.dataset.name);
            }
            return; // 停止事件继续传播，防止触发Tab切换
        }
    
        // 阻止在编辑状态下的点击触发tab切换
        if (target.matches('.tab-name') && target.isContentEditable) {
            return;
        }
    
        // 处理Tab切换
        if (target.closest('.tab-link')) {
            activeTabId = target.closest('.tab-link').dataset.tab;
            setActiveTab();
            return;
        }
    
        // 处理其余的点击事件
        if (target.id === 'toggle-privacy-btn') {
            appData.settings.isPrivacyMode = !appData.settings.isPrivacyMode;
            saveDataToLocalStorage();
            renderDashboard();
            return;
        }
        if (target.id === 'add-account-btn') addAccount();

        if (target.id === 'settle-btn') settleDailyAssets();
        if (target.id === 'export-data-btn') exportData();
        if (target.id === 'import-data-btn') document.getElementById('import-file-input').click();
        if (target.id === 'add-btn-watchlist') await addStockToWatchlist();
        if (target.matches('.add-holding-btn')) await addHolding(target.dataset.account);
        if (target.id === 'calc-reset-price-btn') resetManualPrice();
        if (target.id === 'add-breakdown-btn') addAssetBreakdown();
        if (target.matches('.delete-btn')) { // 只处理表格内的删除按钮
            if (confirm('确定要删除吗？')) {
                if (target.matches('.delete-holding-btn')) deleteHolding(target.dataset.accountId, target.dataset.code);
                if (target.matches('.delete-watchlist-btn')) deleteFromWatchlist(target.dataset.code);
                if (target.matches('.delete-breakdown-btn')) deleteAssetBreakdown(target.dataset.breakdownId);
            }
        }
    }

    function handleGlobalChange(e) {
        const target = e.target;
        if (target.matches('.cash-input')) updateAccountCash(target.dataset.accountId, target.value);
        if (target.matches('.ytd-price-input-watchlist')) updateYtdPrice(target.dataset.code, target.value);
        if (target.id === 'import-file-input') importData(e);
        if (target.id === 'notes-textarea') updateNotes(target.value);
        // 价格网格输入框事件
        if (target.matches('.grid-percent-input')) calculateTargetPriceFromPercent(target);
        if (target.matches('.grid-price-input')) calculatePercentFromTargetPrice(target);
        // 处理显示勾选框变化
        if (target.matches('.show-in-popup-checkbox')) updateShowInPopup(target.dataset.code, target.checked);
    }
    
    function handleGlobalBlur(e) {
        const target = e.target;
        // 监听tab名称的失焦事件以更新账户名
        if (target.matches('.tab-name')) updateAccountName(target.dataset.accountId, target.innerText);
        if (target.id === 'summary-total-cost') updateTotalCost(target.innerText);
        if (target.id === 'summary-yesterday-assets') updateYesterdayAssets(target.innerText);
        if (target.matches('.editable-shares')) {
            const { accountId, code } = target.dataset;
            const account = appData.accounts.find(a => a.id === accountId);
            const holding = account?.holdings.find(h => h.code === code);
            const newShares = parseInt(target.innerText.replace(/,/g, ''), 10);

            if (holding && !isNaN(newShares) && newShares >= 0) {
                if (holding.shares !== newShares) {
                    holding.shares = newShares;
                    // When shares change, recalculate costAmount based on current price
                    const info = stockInfoCache[holding.code] || { price: 0 };
                    holding.costAmount = newShares * info.price;
                    saveDataToLocalStorage();
                    // 重新渲染总持仓表格以确保数据完全同步
                    renderTotalHoldings();
                    updateDynamicValues();
                }
                target.innerText = holding.shares.toLocaleString();
            } else if (holding) {
                target.innerText = holding.shares.toLocaleString();
            }
        }
        if (target.matches('.editable-breakdown-description')) {
            const { breakdownId } = target.dataset;
            updateAssetBreakdownDescription(breakdownId, target.innerText);
        }
        if (target.matches('.editable-breakdown-amount')) {
            const { breakdownId } = target.dataset;
            const newAmount = parseFloat(target.innerText.replace(/,/g, ''));
            if (!isNaN(newAmount)) {
                updateAssetBreakdownAmount(breakdownId, newAmount);
                target.innerText = newAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                const item = appData.assetBreakdown.find(b => b.id === breakdownId);
                if (item) {
                    target.innerText = item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
            }
        }
    }
    
    // --- 具体功能实现 ---
    function addAccount() {
        const name = prompt("请输入新账户的名称：", `账户${appData.accounts.length + 1}`);
        if (name) {
            const newAccount = { id: 'acc' + Date.now(), name, cash: 0, holdings: [] };
            appData.accounts.push(newAccount);
            activeTabId = newAccount.id;
            saveDataToLocalStorage();
            renderAll();
        }
    }
    function deleteAccount(accountId, name) {
        appData.accounts = appData.accounts.filter(acc => acc.id !== accountId);
        if (activeTabId === accountId) activeTabId = 'tab-total';
        saveDataToLocalStorage();
        renderAll();
    }
    async function addHolding(accountId) {
        const container = document.getElementById(accountId);
        // 2. 从下拉列表获取代码
        const code = container.querySelector('.add-code-input').value;
        const shares = parseInt(container.querySelector('.add-shares-input').value);
        
        // 校验
        if (!code) { alert('请选择一只股票。'); return; }
        if (isNaN(shares) || shares <= 0) { alert('请输入有效的持有份额。'); return; }
        
        const info = stockInfoCache[code];
        if (!info || !info.price) { alert(`无法获取 ${code} 的价格信息，请稍后重试。`); return; }

        const account = appData.accounts.find(a => a.id === accountId);
        if (account) {
            // 2. 自动计算持仓金额
            const costAmount = shares * info.price;
            account.holdings.push({ code, shares, costAmount });
            saveDataToLocalStorage();
            await fetchAllStockDataAndUpdateUI();
            renderAll();
        }
    }
    function deleteHolding(accountId, code) {
        const account = appData.accounts.find(a => a.id === accountId);
        if(account) {
            account.holdings = account.holdings.filter(h => h.code !== code);
            saveDataToLocalStorage();
            renderAll();
        }
    }
    async function addStockToWatchlist() {
        const input = document.getElementById('add-code-watchlist');
        const code = input.value.trim();
        const existingCodes = appData.watchlist.map(item => typeof item === 'string' ? item : item.code);
        if (code.length === 6 && !existingCodes.includes(code)) {
            appData.watchlist.push({code: code, showInPopup: false});
            input.value = '';
            saveDataToLocalStorage();
            await fetchAllStockDataAndUpdateUI();
            renderAll();
        }
    }
    function deleteFromWatchlist(code) {
        appData.watchlist = appData.watchlist.filter(item => {
            const itemCode = typeof item === 'string' ? item : item.code;
            return itemCode !== code;
        });
        saveDataToLocalStorage();
        renderAll();
    }
    function updateAccountName(accountId, newName) { const account = appData.accounts.find(a => a.id === accountId); if (account && account.name !== newName) { account.name = newName; saveDataToLocalStorage(); renderAll(); } }
    function updateNotes(newNotes) { appData.notes = newNotes; saveDataToLocalStorage(); }
    function updateYtdPrice(code, newPrice) { appData.ytdData[code] = parseFloat(newPrice) || 0; saveDataToLocalStorage(); updateDynamicValues(); }
    function updateAccountCash(accountId, cash) { const account = appData.accounts.find(a => a.id === accountId); if(account) { account.cash = parseFloat(cash) || 0; saveDataToLocalStorage(); renderTotalHoldings(); updateDynamicValues(); } }
    function updateTotalCost(costText) { const newCost = parseFloat(costText.replace(/,/g, '')); if (!isNaN(newCost)) { appData.settings.totalCost = newCost; saveDataToLocalStorage(); updateDynamicValues(); } }
    function updateYesterdayAssets(assetsText) { const newAssets = parseFloat(assetsText.replace(/,/g, '')); if (!isNaN(newAssets)) { appData.settings.yesterdayAssets = newAssets; saveDataToLocalStorage(); updateDynamicValues(); } }
    
    function updateShowInPopup(code, showInPopup) {
        const item = appData.watchlist.find(item => {
            const itemCode = typeof item === 'string' ? item : item.code;
            return itemCode === code;
        });
        if (item) {
            if (typeof item === 'string') {
                // 如果还是旧格式，转换为新格式
                const index = appData.watchlist.indexOf(item);
                appData.watchlist[index] = {code: item, showInPopup: showInPopup};
            } else {
                item.showInPopup = showInPopup;
            }
            saveDataToLocalStorage();
        }
    }
    
    function addAssetBreakdown() {
        const descInput = document.getElementById('add-breakdown-description');
        const amountInput = document.getElementById('add-breakdown-amount');
        const description = descInput.value.trim();
        const amount = parseFloat(amountInput.value);
        
        if (!description) { alert('请输入描述。'); return; }
        if (isNaN(amount)) { alert('请输入有效的金额。'); return; }
        
        const newBreakdown = {
            id: 'breakdown' + Date.now(),
            description: description,
            amount: amount
        };
        
        appData.assetBreakdown.push(newBreakdown);
        descInput.value = '';
        amountInput.value = '';
        saveDataToLocalStorage();
        renderAssetBreakdown();
        updateNetAssetCalculation();
    }
    
    function deleteAssetBreakdown(breakdownId) {
        appData.assetBreakdown = appData.assetBreakdown.filter(item => item.id !== breakdownId);
        saveDataToLocalStorage();
        renderAssetBreakdown();
        updateNetAssetCalculation();
    }
    
    function updateAssetBreakdownDescription(breakdownId, newDescription) {
        const item = appData.assetBreakdown.find(b => b.id === breakdownId);
        if (item && item.description !== newDescription) {
            item.description = newDescription;
            saveDataToLocalStorage();
        }
    }
    
    function updateAssetBreakdownAmount(breakdownId, newAmount) {
        const item = appData.assetBreakdown.find(b => b.id === breakdownId);
        const amount = parseFloat(newAmount);
        if (item && !isNaN(amount) && item.amount !== amount) {
            item.amount = amount;
            saveDataToLocalStorage();
            updateNetAssetCalculation();
        }
    }
    
    // --- 渲染函数 ---
    function renderAccountContents() {
        const container = document.getElementById('accounts-content-container');
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
                     <!-- 2. 修改为下拉列表 -->
                     <select class="add-code-input"></select>
                     <input type="number" class="add-shares-input" placeholder="持有份额">
                     <!-- 2. 移除持仓金额输入框 -->
                     <button class="add-holding-btn" data-account="${account.id}">添加持仓</button>
                </div>`;
            container.appendChild(content);
            
            // 2. 填充下拉列表
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

            renderAccountTable(account);
        });
    }

    function renderAccountTable(account) {
        const table = document.querySelector(`#${account.id} .holdings-table`);
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
            </tr>
        `}).join('');
        table.innerHTML = headers + `<tbody>${rows}</tbody>`;
    }

    function renderWatchlist() {
        const table = document.getElementById('watchlist-table');
        const headers = `<thead><tr><th>代码</th><th>名称</th><th>现价</th><th>今日涨跌</th><th>年初股价</th><th>今年涨跌</th><th>显示</th><th>操作</th></tr></thead>`;
        const rows = appData.watchlist.map((item, index) => {
            const code = typeof item === 'string' ? item : item.code;
            const showInPopup = typeof item === 'string' ? false : item.showInPopup;
            const ytdPrice = appData.ytdData[code] || '';
            const name = stockInfoCache[code]?.name || '...';
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
                <td><input type="checkbox" class="show-in-popup-checkbox" data-code="${code}" ${showInPopup ? 'checked' : ''}></td>
                <td><button class="delete-btn delete-watchlist-btn" data-code="${code}">删除</button></td>
            </tr>`;
        }).join('');
        table.innerHTML = headers + `<tbody>${rows}</tbody>`;
        
        // 为新渲染的行添加拖拽事件监听器
        setupWatchlistDragEvents();
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
    
    // --- Calculator Functions ---
    function getTotalAssets() {
        let totalMarketValue = 0;
        let totalCash = 0;
        appData.accounts.forEach(acc => {
            totalCash += acc.cash;
            acc.holdings.forEach(h => {
                const info = stockInfoCache[h.code] || { price: 0 };
                totalMarketValue += h.shares * info.price;
            });
        });
        return totalMarketValue + totalCash;
    }

    function renderCalculator() {
        const selectEl = document.getElementById('calc-stock-select');
        const currentVal = selectEl.value;
        // Clear old options but keep the placeholder
        while (selectEl.options.length > 1) {
            selectEl.remove(1);
        }
        // Populate with new options
        appData.watchlist.forEach(item => {
            const code = typeof item === 'string' ? item : item.code;
            const info = stockInfoCache[code] || { name: '...' };
            const option = document.createElement('option');
            option.value = code;
            option.innerText = `${code} ${info.name}`;
            selectEl.appendChild(option);
        });
        selectEl.value = currentVal; // Restore previous selection if still exists
    }

    function resetManualPrice() {
        manualPrice = null;
        performCalculations();
    }

    function performCalculations() {
        const totalAssets = getTotalAssets();
        if (totalAssets === 0) return; 

        const selectedCode = document.getElementById('calc-stock-select').value;
        const priceInput = document.getElementById('calc-current-price');
        
        // 获取价格：优先使用手动输入的价格，否则使用实时价格
        let price = 0;
        if (manualPrice !== null && manualPrice > 0) {
            price = manualPrice;
        } else if (selectedCode) {
            price = stockInfoCache[selectedCode]?.price || 0;
            // 只有在没有手动价格时才更新输入框
            if (manualPrice === null) {
                priceInput.value = price > 0 ? price.toFixed(3) : '';
            }
        } else {
            // 没有选择交易标的时，清空价格输入框（如果没有手动价格）
            if (manualPrice === null) {
                priceInput.value = '';
            }
        }
        
        if (price === 0) return;

        // Calculation 1: By Amount
        const targetAmount = parseFloat(document.getElementById('calc-by-amount-input').value) || 0;
        const sharesFromAmount = Math.floor(targetAmount / price);
        const positionFromAmount = (targetAmount / totalAssets * 100);
        document.getElementById('calc-by-amount-shares').innerText = sharesFromAmount.toLocaleString();
        document.getElementById('calc-by-amount-position').innerText = positionFromAmount.toFixed(2) + '%';
        
        // Calculation 2: By Shares
        const targetShares = parseInt(document.getElementById('calc-by-shares-input').value) || 0;
        const amountFromShares = targetShares * price;
        const positionFromShares = (amountFromShares / totalAssets * 100);
        document.getElementById('calc-by-shares-amount').innerText = amountFromShares.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('calc-by-shares-position').innerText = positionFromShares.toFixed(2) + '%';

        // Calculation 3: By Position
        const targetPosition = parseFloat(document.getElementById('calc-by-position-input').value) || 0;
        const amountFromPosition = totalAssets * (targetPosition / 100);
        const sharesFromPosition = Math.floor(amountFromPosition / price);
        document.getElementById('calc-by-position-amount').innerText = amountFromPosition.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('calc-by-position-shares').innerText = sharesFromPosition.toLocaleString();
        
        // Calculation 4: Price Grid - 更新目标价输入框
        updatePriceGridFromCurrentPrice(price);
    }

    // --- 价格网格计算函数 ---
    function updatePriceGridFromCurrentPrice(currentPrice) {
        if (currentPrice <= 0) return;
        
        // 根据当前价格和涨幅计算目标价
        document.querySelectorAll('.grid-percent-input').forEach(input => {
            const percent = parseFloat(input.value) || 0;
            const row = input.dataset.row;
            const type = input.dataset.type;
            const priceInput = document.querySelector(`.grid-price-input[data-row="${row}"][data-type="${type}"]`);
            
            if (priceInput) {
                const targetPrice = currentPrice * (1 + percent / 100);
                priceInput.value = targetPrice.toFixed(3);
            }
        });
    }

    function calculateTargetPriceFromPercent(percentInput) {
        const currentPrice = getCurrentPrice();
        if (currentPrice <= 0) return;
        
        const percent = parseFloat(percentInput.value) || 0;
        const row = percentInput.dataset.row;
        const type = percentInput.dataset.type;
        const priceInput = document.querySelector(`.grid-price-input[data-row="${row}"][data-type="${type}"]`);
        
        if (priceInput) {
            const targetPrice = currentPrice * (1 + percent / 100);
            priceInput.value = targetPrice.toFixed(3);
        }
    }

    function calculatePercentFromTargetPrice(priceInput) {
        const currentPrice = getCurrentPrice();
        if (currentPrice <= 0) return;
        
        const targetPrice = parseFloat(priceInput.value) || 0;
        if (targetPrice <= 0) return;
        
        const row = priceInput.dataset.row;
        const type = priceInput.dataset.type;
        const percentInput = document.querySelector(`.grid-percent-input[data-row="${row}"][data-type="${type}"]`);
        
        if (percentInput) {
            const percent = ((targetPrice - currentPrice) / currentPrice) * 100;
            percentInput.value = percent.toFixed(1);
        }
    }

    function getCurrentPrice() {
        const priceInput = document.getElementById('calc-current-price');
        const selectedCode = document.getElementById('calc-stock-select').value;
        
        let price = 0;
        if (manualPrice !== null && manualPrice > 0) {
            price = manualPrice;
        } else if (selectedCode) {
            price = stockInfoCache[selectedCode]?.price || 0;
        }
        
        return price;
    }

    // --- 剩余工具函数 (无变化) ---
    function parseStockData(responseText) { const lines = responseText.split(';\n'); lines.forEach(line => { if (line.trim() === '') return; const parts = line.split('~'); if (parts.length > 10) { const code = parts[2]; stockInfoCache[code] = { name: parts[1], price: parseFloat(parts[3]), changePercent: parseFloat(parts[32]), }; } }); }
    function settleDailyAssets() { 
        if (confirm("确定要进行每日结算吗？这会将当前的'实时资产'覆盖'昨日资产'。")) { 
            // 直接计算实时资产，避免从DOM读取（可能受隐私模式影响）
            let totalMarketValue = 0;
            let totalCash = 0;
            appData.accounts.forEach(acc => {
                totalCash += acc.cash;
                acc.holdings.forEach(h => {
                    const info = stockInfoCache[h.code] || { price: 0 };
                    totalMarketValue += h.shares * info.price;
                });
            });
            const realtimeAssets = totalMarketValue + totalCash;
            
            appData.settings.yesterdayAssets = realtimeAssets; 
            saveDataToLocalStorage(); 
            renderAll(); 
            alert('结算成功！'); 
        } 
    }
    function exportData() { 
        const dataStr = JSON.stringify(appData, null, 2); 
        const blob = new Blob([dataStr], {type: "application/json"}); 
        const url = URL.createObjectURL(blob); 
        const a = document.createElement('a'); 
        a.href = url; 
        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
        a.download = `my_portfolio_backup_${date}-${time}.json`; 
        a.click(); 
        URL.revokeObjectURL(url); 
    }
    function importData(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async function(e) { try { const importedData = JSON.parse(e.target.result); if (importedData.accounts && importedData.settings) { if (confirm("导入新数据将覆盖当前所有数据，确定要继续吗？")) { appData = importedData; activeTabId = appData.accounts.length > 0 ? appData.accounts[0].id : 'tab-total'; saveDataToLocalStorage(); await fetchAllStockDataAndUpdateUI(); renderAll(); alert('数据导入成功！'); } } else { alert('文件格式无效！'); } } catch (error) { alert('导入失败，文件可能已损坏！'); } finally { event.target.value = ''; } }; reader.readAsText(file); }
    function renderAssetBreakdown() {
        const table = document.getElementById('asset-breakdown-table');
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
        updateNetAssetCalculation();
    }
    
    function updateNetAssetCalculation() {
        let totalMarketValue = 0;
        let totalCash = 0;
        appData.accounts.forEach(acc => {
            totalCash += acc.cash;
            acc.holdings.forEach(h => {
                const info = stockInfoCache[h.code] || { price: 0 };
                totalMarketValue += h.shares * info.price;
            });
        });
        const totalAssets = totalMarketValue + totalCash;
        
        const totalDeductions = appData.assetBreakdown.reduce((sum, item) => sum + item.amount, 0);
        const personalNetAssets = totalAssets - totalDeductions;
        
        const isPrivacy = appData.settings.isPrivacyMode;
        const privacyText = '******';
        
        document.getElementById('total-assets-display').innerText = isPrivacy ? privacyText : totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('total-deductions-display').innerText = isPrivacy ? privacyText : totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('personal-net-assets-display').innerText = isPrivacy ? privacyText : personalNetAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        const netAssetEl = document.getElementById('personal-net-assets-display');
        netAssetEl.className = `value ${personalNetAssets > 0 ? 'positive' : (personalNetAssets < 0 ? 'negative' : '')}`;
    }
    
    function renderNotes() { document.getElementById('notes-textarea').value = appData.notes || ''; }
    function renderTabs() { 
        const container = document.getElementById('tabs-container'); 
        container.querySelectorAll('.account-tab').forEach(tab => tab.remove()); 
        const staticTabs = container.querySelector('#add-account-btn'); 
        appData.accounts.forEach(account => { 
            const tab = document.createElement('button'); 
            tab.className = 'tab-link account-tab'; 
            tab.dataset.tab = account.id; 
            
            // 创建用于显示和编辑名称的span
            const tabName = document.createElement('span');
            tabName.className = 'tab-name';
            tabName.innerText = account.name;
            tabName.dataset.accountId = account.id;

            // 创建用于删除的按钮
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'tab-delete-btn';
            deleteBtn.dataset.accountId = account.id;
            deleteBtn.dataset.name = account.name;
            
            tab.appendChild(tabName);
            tab.appendChild(deleteBtn);
            
            container.insertBefore(tab, staticTabs); 
        }); 
    }
    function renderTotalHoldings() {
        const allHoldings = {};
        let totalCash = 0;
        appData.accounts.forEach(acc => {
            totalCash += acc.cash;
            acc.holdings.forEach(h => {
                if (!allHoldings[h.code]) {
                    allHoldings[h.code] = { code: h.code, shares: 0 };
                }
                // BUG修复：强制将份额转换为数字再进行累加，防止因数据类型问题导致的计算错误
                allHoldings[h.code].shares += Number(h.shares) || 0;
            });
        });
    
        let totalMarketValue = 0;
        Object.values(allHoldings).forEach(h => {
            const info = stockInfoCache[h.code] || { price: 0 };
            totalMarketValue += h.shares * info.price;
        });
    
        const totalAssets = totalMarketValue + totalCash;
        const table = document.getElementById('total-holdings-table');
        const headers = `<thead><tr><th>代码</th><th>名称</th><th>总份额</th><th>现价</th><th>总市值</th><th>仓位</th></tr></thead>`;
    
        const rows = Object.values(allHoldings).map(h => {
            const info = stockInfoCache[h.code] || { name: '...', price: 0 };
            const marketValue = h.shares * info.price;
            const positionRatio = totalAssets > 0 ? `${Math.round((marketValue / totalAssets * 100) * 1000) / 1000}%` : '0.000%';
            return `<tr><td>${h.code}</td><td>${info.name}</td><td>${h.shares.toLocaleString()}</td><td>${(Math.round(info.price * 1000) / 1000).toString()}</td><td>${marketValue.toFixed(2)}</td><td>${positionRatio}</td></tr>`;
        }).join('');
    
        const cashPositionRatio = totalAssets > 0 ? `${Math.round((totalCash / totalAssets * 100) * 1000) / 1000}%` : '0.000%';
        const footer = `<tfoot><tr><td>--</td><td><b>总现金</b></td><td>--</td><td>--</td><td><b>${totalCash.toFixed(2)}</b></td><td><b>${cashPositionRatio}</b></td></tr></tfoot>`;
    
        table.innerHTML = headers + `<tbody>${rows}</tbody>` + footer;
    }
    
    function updateTotalHoldingsValues(totalAssets) {
        // 计算所有持仓的汇总数据
        const allHoldings = {};
        let totalCash = 0;
        appData.accounts.forEach(acc => {
            totalCash += acc.cash;
            acc.holdings.forEach(h => {
                if (!allHoldings[h.code]) {
                    allHoldings[h.code] = { code: h.code, shares: 0 };
                }
                allHoldings[h.code].shares += Number(h.shares) || 0;
            });
        });
        
        // 动态更新总持仓表格中的现价、市值和仓位
        const table = document.getElementById('total-holdings-table');
        if (table) {
            Object.values(allHoldings).forEach(h => {
                const info = stockInfoCache[h.code] || { name: '...', price: 0 };
                const marketValue = h.shares * info.price;
                const positionRatio = totalAssets > 0 ? `${Math.round((marketValue / totalAssets * 100) * 1000) / 1000}%` : '0.000%';
                
                // 查找对应的行
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const codeCell = row.cells[0];
                    if (codeCell && codeCell.textContent === h.code) {
                        // 更新名称
                        if (row.cells[1]) row.cells[1].textContent = info.name || '...';
                        // 更新总份额 - 这是关键修复
                        if (row.cells[2]) row.cells[2].textContent = h.shares.toLocaleString();
                        // 更新现价
                        if (row.cells[3]) row.cells[3].textContent = (Math.round(info.price * 1000) / 1000).toString();
                        // 更新总市值
                        if (row.cells[4]) row.cells[4].textContent = marketValue.toFixed(2);
                        // 更新仓位
                        if (row.cells[5]) row.cells[5].textContent = positionRatio;
                    }
                });
            });
            
            // 更新现金行的总额和仓位比例
            const cashPositionRatio = totalAssets > 0 ? `${Math.round((totalCash / totalAssets * 100) * 1000) / 1000}%` : '0.000%';
            const footerRow = table.querySelector('tfoot tr');
            if (footerRow) {
                // 更新现金总额（第4列）
                if (footerRow.cells[4]) {
                    footerRow.cells[4].innerHTML = `<b>${totalCash.toFixed(2)}</b>`;
                }
                // 更新现金仓位比例（第5列）
                if (footerRow.cells[5]) {
                    footerRow.cells[5].innerHTML = `<b>${cashPositionRatio}</b>`;
                }
            }
        }
    }
    
    function setActiveTab() { 
        document.querySelectorAll('.tab-link').forEach(tab => {
            const isActive = tab.dataset.tab === activeTabId;
            tab.classList.toggle('active', isActive);

            // 动态设置当前激活的账户tab名称为可编辑状态
            if (tab.classList.contains('account-tab')) {
                const tabName = tab.querySelector('.tab-name');
                if (tabName) {
                    tabName.contentEditable = isActive;
                }
            }
        }); 
        document.querySelectorAll('.tab-content').forEach(content => content.classList.toggle('active', content.id === activeTabId || content.dataset.tabId === activeTabId)); 
    }
    function updateAccountSummary(accountId, totalAssets) {
        const account = appData.accounts.find(a => a.id === accountId);
        if (!account) return;
        let accountMarketValue = 0;
        account.holdings.forEach(h => {
            const info = stockInfoCache[h.code] || { price: 0 };
            accountMarketValue += h.shares * info.price;
        });
        const summary = document.querySelector(`#${accountId} .account-summary`);
        const accountTotalAssets = accountMarketValue + account.cash;
        if(summary) {
            summary.querySelector('.market-value').innerText = accountMarketValue.toFixed(2);
            summary.querySelector('.total-assets').innerText = accountTotalAssets.toFixed(2);
            const positionRatio = totalAssets > 0 ? `${Math.round((accountMarketValue / totalAssets * 100) * 1000) / 1000}%` : '0.000%';
            summary.querySelector('.position-ratio').innerText = positionRatio;
            const cashPositionRatio = totalAssets > 0 ? `${Math.round((account.cash / totalAssets * 100) * 1000) / 1000}%` : '0.000%';
            summary.querySelector('.cash-position-ratio').innerText = cashPositionRatio;
        }
    }
    
    function renderDashboard() {
        const isPrivacy = appData.settings.isPrivacyMode;
        const privacyText = '******';
        
        const privacyBtn = document.getElementById('toggle-privacy-btn');
        if (privacyBtn) {
            privacyBtn.innerText = isPrivacy ? '显示' : '隐藏';
        }

        let totalMarketValue = 0; let totalCash = 0; let totalCostAmount = 0;
        appData.accounts.forEach(acc => {
            totalCash += acc.cash;
            acc.holdings.forEach(h => {
                const info = stockInfoCache[h.code];
                totalMarketValue += h.shares * (info ? info.price : 0);
                totalCostAmount += h.costAmount;
            });
        });

        const realtimeAssets = totalMarketValue + totalCash;
        const yesterdayAssets = appData.settings.yesterdayAssets;
        const todayPl = realtimeAssets - yesterdayAssets;
        const todayPlRatio = yesterdayAssets > 0 ? (todayPl / yesterdayAssets * 100) : 0;
        const totalCost = appData.settings.totalCost;
        const ytdPl = (totalCost > 0 || totalCostAmount > 0) ? (realtimeAssets - totalCost) : 0;
        const ytdPlRatio = totalCost > 0 ? (ytdPl / totalCost * 100) : 0;

        document.getElementById('summary-realtime-assets').innerText = isPrivacy ? privacyText : realtimeAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        const yesterdayAssetsEl = document.getElementById('summary-yesterday-assets');
        if (document.activeElement !== yesterdayAssetsEl) {
            yesterdayAssetsEl.innerText = isPrivacy ? privacyText : yesterdayAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        
        const totalCostEl = document.getElementById('summary-total-cost');
        if (document.activeElement !== totalCostEl) {
            totalCostEl.innerText = isPrivacy ? privacyText : totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        
        const todayPlEl = document.getElementById('summary-today-pl');
        todayPlEl.innerText = isPrivacy ? privacyText : `${todayPl.toFixed(2)} (${todayPlRatio.toFixed(2)}%)`;
        todayPlEl.className = `value ${todayPl > 0 ? 'positive' : (todayPl < 0 ? 'negative' : '')}`;
        
        const ytdPlEl = document.getElementById('summary-ytd-pl');
        ytdPlEl.innerText = isPrivacy ? privacyText : `${ytdPl.toFixed(2)} (${ytdPlRatio.toFixed(2)}%)`;
        ytdPlEl.className = `value ${ytdPl > 0 ? 'positive' : (ytdPl < 0 ? 'negative' : '')}`;
    }

    // --- 拖拽排序功能 ---
    let dragState = {
        draggedElement: null,
        draggedIndex: -1,
        longPressTimer: null,
        isDragging: false,
        startY: 0,
        startX: 0
    };

    function setupWatchlistDragEvents() {
        const rows = document.querySelectorAll('.watchlist-row');
        rows.forEach(row => {
            // 移除旧的事件监听器（如果有）
            row.removeEventListener('mousedown', handleMouseDown);
            row.removeEventListener('touchstart', handleTouchStart);
            
            // 添加新的事件监听器
            row.addEventListener('mousedown', handleMouseDown);
            row.addEventListener('touchstart', handleTouchStart, { passive: false });
        });
    }

    function handleMouseDown(e) {
        // 如果点击的是删除按钮或输入框，不处理拖拽
        if (e.target.matches('.delete-btn, .ytd-price-input-watchlist')) return;
        
        startLongPress(e.currentTarget, e.clientX, e.clientY);
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    function handleTouchStart(e) {
        // 如果点击的是删除按钮或输入框，不处理拖拽
        if (e.target.matches('.delete-btn, .ytd-price-input-watchlist')) return;
        
        const touch = e.touches[0];
        startLongPress(e.currentTarget, touch.clientX, touch.clientY);
        
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
    }

    function startLongPress(element, x, y) {
        dragState.startX = x;
        dragState.startY = y;
        
        // 清除之前的定时器
        if (dragState.longPressTimer) {
            clearTimeout(dragState.longPressTimer);
        }
        
        // 设置长按定时器（500ms）
        dragState.longPressTimer = setTimeout(() => {
            activateDragMode(element);
        }, 500);
        
        // 添加长按视觉反馈
        element.classList.add('long-press-active');
    }

    function activateDragMode(element) {
        dragState.isDragging = true;
        dragState.draggedElement = element;
        dragState.draggedIndex = parseInt(element.dataset.index);
        
        element.classList.remove('long-press-active');
        element.classList.add('dragging');
        element.draggable = true;
        
        // 添加拖拽事件监听器
        element.addEventListener('dragstart', handleDragStart);
        element.addEventListener('dragend', handleDragEnd);
        
        // 为所有行添加拖拽目标事件
        const allRows = document.querySelectorAll('.watchlist-row');
        allRows.forEach(row => {
            row.addEventListener('dragover', handleDragOver);
            row.addEventListener('drop', handleDrop);
        });
    }

    function handleMouseMove(e) {
        if (dragState.longPressTimer && !dragState.isDragging) {
            const deltaX = Math.abs(e.clientX - dragState.startX);
            const deltaY = Math.abs(e.clientY - dragState.startY);
            
            // 如果移动距离超过阈值，取消长按
            if (deltaX > 10 || deltaY > 10) {
                cancelLongPress();
            }
        }
    }

    function handleTouchMove(e) {
        if (dragState.longPressTimer && !dragState.isDragging) {
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - dragState.startX);
            const deltaY = Math.abs(touch.clientY - dragState.startY);
            
            // 如果移动距离超过阈值，取消长按
            if (deltaX > 10 || deltaY > 10) {
                cancelLongPress();
            }
        }
        
        if (dragState.isDragging) {
            e.preventDefault();
        }
    }

    function handleMouseUp() {
        if (dragState.isDragging) {
            cleanupDragState();
        } else {
            cancelLongPress();
            cleanupDragEvents();
        }
    }

    function handleTouchEnd() {
        if (dragState.isDragging) {
            cleanupDragState();
        } else {
            cancelLongPress();
            cleanupDragEvents();
        }
    }

    function cancelLongPress() {
        if (dragState.longPressTimer) {
            clearTimeout(dragState.longPressTimer);
            dragState.longPressTimer = null;
        }
        
        // 移除长按视觉反馈
        const activeElement = document.querySelector('.long-press-active');
        if (activeElement) {
            activeElement.classList.remove('long-press-active');
        }
        
        // 如果还没有进入拖拽模式，重置拖拽状态
        if (!dragState.isDragging) {
            dragState.draggedElement = null;
            dragState.draggedIndex = -1;
        }
    }

    function cleanupDragEvents() {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    }

    function handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const targetRow = e.currentTarget;
        if (targetRow === dragState.draggedElement) return;
        
        // 清除所有拖拽样式
        document.querySelectorAll('.drag-over, .drag-over-bottom').forEach(el => {
            el.classList.remove('drag-over', 'drag-over-bottom');
        });
        
        // 确定插入位置
        const rect = targetRow.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        if (e.clientY < midY) {
            targetRow.classList.add('drag-over');
        } else {
            targetRow.classList.add('drag-over-bottom');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        
        const targetRow = e.currentTarget;
        const targetIndex = parseInt(targetRow.dataset.index);
        
        if (targetRow === dragState.draggedElement) return;
        
        // 确定插入位置
        const rect = targetRow.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midY;
        
        // 计算新的索引位置
        let newIndex = targetIndex;
        if (!insertBefore) {
            newIndex = targetIndex + 1;
        }
        
        // 调整索引（考虑移除原元素的影响）
        if (dragState.draggedIndex < newIndex) {
            newIndex--;
        }
        
        // 更新watchlist数组
        reorderWatchlist(dragState.draggedIndex, newIndex);
        
        // 清理拖拽状态
        cleanupDragState();
    }

    function handleDragEnd() {
        cleanupDragState();
    }

    function cleanupDragState() {
        // 清除所有拖拽相关样式，包括长按状态
        document.querySelectorAll('.dragging, .drag-over, .drag-over-bottom, .long-press-active').forEach(el => {
            el.classList.remove('dragging', 'drag-over', 'drag-over-bottom', 'long-press-active');
        });
        
        // 清除长按定时器
        if (dragState.longPressTimer) {
            clearTimeout(dragState.longPressTimer);
        }
        
        // 移除拖拽事件监听器
        const allRows = document.querySelectorAll('.watchlist-row');
        allRows.forEach(row => {
            row.draggable = false;
            row.removeEventListener('dragstart', handleDragStart);
            row.removeEventListener('dragend', handleDragEnd);
            row.removeEventListener('dragover', handleDragOver);
            row.removeEventListener('drop', handleDrop);
        });
        
        // 清理全局事件监听器
        cleanupDragEvents();
        
        // 重置拖拽状态
        dragState = {
            draggedElement: null,
            draggedIndex: -1,
            longPressTimer: null,
            isDragging: false,
            startY: 0,
            startX: 0
        };
    }

    function reorderWatchlist(fromIndex, toIndex) {
        // 创建新的watchlist数组
        const newWatchlist = [...appData.watchlist];
        
        // 移除原位置的元素
        const [movedItem] = newWatchlist.splice(fromIndex, 1);
        
        // 插入到新位置
        newWatchlist.splice(toIndex, 0, movedItem);
        
        // 更新数据
        appData.watchlist = newWatchlist;
        
        // 保存到localStorage
        saveDataToLocalStorage();
        
        // 重新渲染自选股池
        renderWatchlist();
        
        // 更新其他相关UI（如计算器的下拉列表）
        renderCalculator();
    }

    init();
});