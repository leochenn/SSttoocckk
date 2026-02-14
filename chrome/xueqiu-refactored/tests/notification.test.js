import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../modules/notification.js';
import { CONFIG } from '../modules/config.js';

describe('NotificationService', () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({ ok: true });
        global.chrome = {
            notifications: {
                create: vi.fn()
            },
            storage: {
                local: {
                    get: vi.fn().mockResolvedValue({}),
                    set: vi.fn()
                }
            }
        };
        // Reset cooling timestamp
        NotificationService.lastNotificationTimestamp = 0;
    });

    it('sendNtfy should post message to configured URL', async () => {
        const testMsg = 'Test Message';
        await NotificationService.sendNtfy(testMsg);

        expect(global.fetch).toHaveBeenCalledWith(
            CONFIG.API.NTFY_URL,
            expect.objectContaining({
                method: 'POST',
                body: testMsg
            })
        );
    });

    it('createChromeNotification should respect cooling period', async () => {
        await NotificationService.createChromeNotification('test', { title: 'T1', message: 'M1' });
        await NotificationService.createChromeNotification('test', { title: 'T2', message: 'M2' });

        expect(global.chrome.notifications.create).toHaveBeenCalledTimes(1);
    });

    it('sendSecurityAlert should throttle alert if already sent', async () => {
        // First call - should send
        global.chrome.storage.local.get.mockResolvedValue({ isNoPostsWarningSent: false });
        await NotificationService.sendSecurityAlert();
        
        expect(global.fetch).toHaveBeenCalled();
        expect(global.chrome.storage.local.set).toHaveBeenCalledWith({ isNoPostsWarningSent: true });

        // Reset mock for next call
        vi.clearAllMocks();
        global.chrome.storage.local.get.mockResolvedValue({ isNoPostsWarningSent: true });
        
        // Second call - should skip
        await NotificationService.sendSecurityAlert();
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
