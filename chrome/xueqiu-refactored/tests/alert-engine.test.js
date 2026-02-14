import { describe, it, expect, vi } from 'vitest';
import { AlertEngine } from '../modules/alert-engine.js';

describe('AlertEngine', () => {
    const mockStock = {
        name: '腾讯控股',
        code: '00700',
        currentPrice: 400.0,
        changePercent: 2.5
    };

    const mockConfig = {
        upperPercent: 2.0,
        lowerPercent: -2.0,
        enabled: true
    };

    const mockState = {
        lastAlertTime: 0,
        lastAlertPrice: 0
    };

    it('should trigger alert when price breaks upper limit', () => {
        const result = AlertEngine.checkAlert(mockStock, mockConfig, mockState);
        expect(result).not.toBeNull();
        expect(result.message).toContain('突破预警线 2%');
        expect(result.newState.lastAlertPrice).toBe(400.0);
    });

    it('should trigger alert when price drops below lower limit', () => {
        const downStock = { ...mockStock, currentPrice: 380.0, changePercent: -3.0 };
        const result = AlertEngine.checkAlert(downStock, mockConfig, mockState);
        expect(result).not.toBeNull();
        expect(result.message).toContain('跌破预警线 -2%');
    });

    it('should not trigger alert if disabled', () => {
        const disabledConfig = { ...mockConfig, enabled: false };
        const result = AlertEngine.checkAlert(mockStock, disabledConfig, mockState);
        expect(result).toBeNull();
    });

    it('should not trigger alert if threshold not reached', () => {
        const normalStock = { ...mockStock, changePercent: 1.0 };
        const result = AlertEngine.checkAlert(normalStock, mockConfig, mockState);
        expect(result).toBeNull();
    });

    it('should throttle alerts within cooldown period if price change is small', () => {
        const now = Date.now();
        const stateWithRecentAlert = {
            lastAlertTime: now - 1000, // 1 second ago
            lastAlertPrice: 398.0
        };
        
        // Price moved from 398 to 400 (0.5%), should be throttled
        const result = AlertEngine.checkAlert(mockStock, mockConfig, stateWithRecentAlert);
        expect(result).toBeNull();
    });

    it('should NOT throttle if price change is significant even within cooldown', () => {
        const now = Date.now();
        const stateWithRecentAlert = {
            lastAlertTime: now - 1000,
            lastAlertPrice: 350.0 // Price moved from 350 to 400 (14%)
        };
        
        const result = AlertEngine.checkAlert(mockStock, mockConfig, stateWithRecentAlert);
        expect(result).not.toBeNull();
        expect(result.newState.lastAlertPrice).toBe(400.0);
    });

    it('should trigger after cooldown regardless of price change', () => {
        const now = Date.now();
        const stateWithOldAlert = {
            lastAlertTime: now - (3601 * 1000), // > 1 hour ago
            lastAlertPrice: 399.9
        };
        
        const result = AlertEngine.checkAlert(mockStock, mockConfig, stateWithOldAlert);
        expect(result).not.toBeNull();
    });
});
