import { describe, it, expect } from 'vitest';
import { MonitorEngine } from '../modules/monitor-engine.js';

describe('MonitorEngine', () => {
    describe('shouldPerformCheck', () => {
        it('should return false when monitorTimeline is disabled', () => {
            const settings = { monitorTimeline: false };
            const result = MonitorEngine.shouldPerformCheck(settings, 1);
            expect(result.shouldCheck).toBe(false);
            expect(result.status).toBe('paused');
        });

        it('should return false when no tabs are open', () => {
            const settings = { monitorTimeline: true };
            const result = MonitorEngine.shouldPerformCheck(settings, 0);
            expect(result.shouldCheck).toBe(false);
            expect(result.message).toBe('等待雪球页面');
        });

        it('should return true when enabled and tabs are open', () => {
            const settings = { monitorTimeline: true };
            const result = MonitorEngine.shouldPerformCheck(settings, 1);
            expect(result.shouldCheck).toBe(true);
            expect(result.status).toBe('running');
        });
    });

    describe('processUpdate', () => {
        it('should detect update when signature changes', () => {
            const current = { signature: 'New', count: 1 };
            const result = MonitorEngine.processUpdate(current, 'Old', 1);
            expect(result.hasUpdate).toBe(true);
            expect(result.signature).toBe('New');
        });

        it('should detect update when count changes', () => {
            const current = { signature: 'Same', count: 2 };
            const result = MonitorEngine.processUpdate(current, 'Same', 1);
            expect(result.hasUpdate).toBe(true);
        });

        it('should not detect update when both are same', () => {
            const current = { signature: 'Same', count: 1 };
            const result = MonitorEngine.processUpdate(current, 'Same', 1);
            expect(result.hasUpdate).toBe(false);
        });
    });

    describe('processSystemMessage', () => {
        it('should detect new system messages', () => {
            const result = MonitorEngine.processSystemMessage(5, 0);
            expect(result.hasUpdate).toBe(true);
            expect(result.count).toBe(5);
        });

        it('should not detect if count is 0', () => {
            const result = MonitorEngine.processSystemMessage(0, 0);
            expect(result.hasUpdate).toBe(false);
        });
    });
});
