import { describe, it, expect, beforeEach } from 'vitest';
import { Portfolio } from '../modules/portfolio.js';

describe('Portfolio', () => {
    let data;

    beforeEach(() => {
        data = Portfolio.createDefaultData();
    });

    it('should add a new account', () => {
        Portfolio.addAccount(data, 'Test Account');
        expect(data.accounts).toHaveLength(2);
        expect(data.accounts[1].name).toBe('Test Account');
    });

    it('should delete an account', () => {
        const acc = Portfolio.addAccount(data, 'To Delete');
        Portfolio.deleteAccount(data, acc.id);
        expect(data.accounts).toHaveLength(1);
    });

    it('should add holding to specific account', () => {
        const accId = data.accounts[0].id;
        Portfolio.addHolding(data, accId, { code: '000001', shares: 100, costAmount: 1000 });
        expect(data.accounts[0].holdings).toHaveLength(1);
        expect(data.accounts[0].holdings[0].code).toBe('000001');
    });

    it('should add to watchlist without duplicates', () => {
        Portfolio.addToWatchlist(data, '600036');
        Portfolio.addToWatchlist(data, '600036');
        expect(data.watchlist).toHaveLength(1);
    });

    it('should reorder watchlist correctly', () => {
        Portfolio.addToWatchlist(data, 'A');
        Portfolio.addToWatchlist(data, 'B');
        Portfolio.reorderWatchlist(data, 0, 1);
        expect(data.watchlist[0].code).toBe('B');
        expect(data.watchlist[1].code).toBe('A');
    });
});
