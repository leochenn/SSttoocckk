import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from '../modules/storage.js';
import { CONFIG } from '../modules/config.js';

describe('StorageService', () => {
    beforeEach(() => {
        // Mock chrome.storage.local
        global.chrome = {
            storage: {
                local: {
                    get: vi.fn(),
                    set: vi.fn(),
                    remove: vi.fn()
                }
            },
            runtime: {
                sendMessage: vi.fn()
            }
        };
    });

    it('getSettings should return merged default and stored settings', async () => {
        const storedSettings = { monitorTimeline: false };
        global.chrome.storage.local.get.mockResolvedValue({ settings: storedSettings });

        const settings = await StorageService.getSettings();
        
        expect(settings.monitorTimeline).toBe(false);
        expect(settings.interval).toBe(CONFIG.DEFAULTS.SETTINGS.interval);
    });

    it('updateStatus should save status and send message', async () => {
        await StorageService.updateStatus('running', 'All good');

        expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
            status: { state: 'running', message: 'All good' }
        });
        expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
            type: CONFIG.MSG_TYPES.STATUS_UPDATE,
            status: { state: 'running', message: 'All good' }
        });
    });
});
