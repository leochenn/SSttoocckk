import { describe, it, expect, vi } from 'vitest';
import { StockService } from '../modules/stock.js';

describe('StockService', () => {
    describe('getPrefixedCode', () => {
        it('should return sh prefix for 000001 (special index)', () => {
            expect(StockService.getPrefixedCode('000001')).toBe('sh000001');
        });

        it('should return sh prefix for codes starting with 6', () => {
            expect(StockService.getPrefixedCode('600036')).toBe('sh600036');
        });

        it('should return sz prefix for other codes', () => {
            expect(StockService.getPrefixedCode('000651')).toBe('sz000651');
        });
    });

    describe('fetchStockData', () => {
        it('should fetch and parse stock data correctly', async () => {
            const mockResponse = `v_sz000001="1~平安银行~000001~10.50~10.40~10.45~45678~34567~45678~10.50~15~10.30~10.00~10.80~3000~4000~5000~6000~7000~8000~9000~2000~1000~0000~500~2.5~4.5~6.7~1.2~2.3~20231027153000~0.10~0.96~10.55~10.33~...";`;
            
            // Mock TextDecoder to handle utf-8 even when 'gbk' is requested in test
            const OriginalTextDecoder = global.TextDecoder;
            global.TextDecoder = class extends OriginalTextDecoder {
                constructor(encoding) {
                    super('utf-8'); // Force utf-8 for mock data
                }
            };

            global.fetch = vi.fn().mockResolvedValue({
                blob: async () => ({
                    arrayBuffer: async () => new TextEncoder().encode(mockResponse)
                })
            });

            const data = await StockService.fetchStockData(['000001']);
            
            expect(data['000001']).toBeDefined();
            expect(data['000001'].name).toBe('平安银行');
            expect(data['000001'].currentPrice).toBe(10.50);
            expect(data['000001'].change).toBe(0.10);
            expect(data['000001'].changePercent).toBe(0.96);
        });

        it('should handle empty input', async () => {
            const data = await StockService.fetchStockData([]);
            expect(data).toEqual({});
        });
    });
});
