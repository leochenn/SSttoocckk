/**
 * 雪球监控助手 - 仪表盘计算器交互模块
 * 负责处理计算器 Tab 的输入计算逻辑。
 */
import { Calculator } from './calculator.js';

export class DashboardCalculator {
    constructor(options) {
        this.getAppData = options.getAppData;
        this.getStockInfoCache = options.getStockInfoCache;
        this.getManualPrice = options.getManualPrice;
        this.updateUI = options.updateUI;
    }

    performCalculations() {
        const appData = this.getAppData();
        const stockInfoCache = this.getStockInfoCache();
        const manualPrice = this.getManualPrice();

        const totalAssets = Calculator.calculateTotalAssets(appData.accounts, stockInfoCache);
        if (totalAssets === 0) return;

        const selectedCode = document.getElementById('calc-stock-select').value;
        const priceInput = document.getElementById('calc-current-price');
        
        let price = 0;
        if (manualPrice !== null && manualPrice > 0) {
            price = manualPrice;
        } else if (selectedCode) {
            price = stockInfoCache[selectedCode]?.price || 0;
            if (manualPrice === null) {
                priceInput.value = price > 0 ? price.toFixed(3) : '';
            }
        } else if (manualPrice === null) {
            priceInput.value = '';
        }
        
        if (price === 0) return;

        // By Amount
        const targetAmount = parseFloat(document.getElementById('calc-by-amount-input').value) || 0;
        const sharesFromAmount = Math.floor(targetAmount / price);
        const positionFromAmount = Calculator.calculatePositionRatio(targetAmount, totalAssets);
        this.setText('calc-by-amount-shares', sharesFromAmount.toLocaleString());
        this.setText('calc-by-amount-position', positionFromAmount.toFixed(2) + '%');
        
        // By Shares
        const targetShares = parseInt(document.getElementById('calc-by-shares-input').value) || 0;
        const amountFromShares = targetShares * price;
        const positionFromShares = Calculator.calculatePositionRatio(amountFromShares, totalAssets);
        this.setText('calc-by-shares-amount', amountFromShares.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        this.setText('calc-by-shares-position', positionFromShares.toFixed(2) + '%');

        // By Position
        const targetPosition = parseFloat(document.getElementById('calc-by-position-input').value) || 0;
        const amountFromPosition = totalAssets * (targetPosition / 100);
        const sharesFromPosition = Math.floor(amountFromPosition / price);
        this.setText('calc-by-position-amount', amountFromPosition.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        this.setText('calc-by-position-shares', sharesFromPosition.toLocaleString());
        
        this.updatePriceGridFromCurrentPrice(price);
    }

    updatePriceGridFromCurrentPrice(currentPrice) {
        if (currentPrice <= 0) return;
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

    calculateTargetPriceFromPercent(percentInput, currentPrice) {
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

    calculatePercentFromTargetPrice(priceInput, currentPrice) {
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

    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    }
}
