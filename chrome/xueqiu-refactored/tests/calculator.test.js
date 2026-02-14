import { describe, it, expect } from 'vitest';
import { Calculator } from '../modules/calculator.js';

describe('Calculator', () => {
    const mockStockInfo = {
        '000001': { price: 10.5 },
        '600036': { price: 30.0 }
    };

    it('should calculate market value correctly', () => {
        const holdings = [
            { code: '000001', shares: 100 },
            { code: '600036', shares: 200 }
        ];
        const value = Calculator.calculateMarketValue(holdings, mockStockInfo);
        expect(value).toBe(100 * 10.5 + 200 * 30.0);
    });

    it('should calculate total assets across multiple accounts', () => {
        const accounts = [
            { cash: 1000, holdings: [{ code: '000001', shares: 100 }] },
            { cash: 500, holdings: [{ code: '600036', shares: 50 }] }
        ];
        const total = Calculator.calculateTotalAssets(accounts, mockStockInfo);
        // (1000 + 100 * 10.5) + (500 + 50 * 30.0) = 2050 + 2000 = 4050
        expect(total).toBe(4050);
    });

    it('should calculate profit and ratio correctly', () => {
        const { profit, ratio } = Calculator.calculateProfit(1100, 1000);
        expect(profit).toBe(100);
        expect(ratio).toBe(10);
    });

    it('should handle zero base assets in profit calculation', () => {
        const { profit, ratio } = Calculator.calculateProfit(1100, 0);
        expect(profit).toBe(1100);
        expect(ratio).toBe(0);
    });

    it('should calculate position ratio', () => {
        const ratio = Calculator.calculatePositionRatio(200, 1000);
        expect(ratio).toBe(20);
    });

    it('should handle zero total assets in position ratio', () => {
        const ratio = Calculator.calculatePositionRatio(200, 0);
        expect(ratio).toBe(0);
    });
});
