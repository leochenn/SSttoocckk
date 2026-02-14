/**
 * 雪球监控助手 - 股票服务模块
 * Handles fetching and parsing stock data from Tencent API.
 */
import { CONFIG } from './config.js';

export class StockService {
    /**
     * 获取带市场前缀的代码 (e.g., 000001 -> sz000001)
     */
    static getPrefixedCode(code) {
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

    /**
     * 从腾讯接口批量获取股票数据
     * @param {string[]} codes - 股票代码数组 (e.g. ['000001', '600036'])
     * @returns {Promise<Object>} - Key为股票代码，Value为股票信息对象
     */
    static async fetchStockData(codes) {
        if (!codes || codes.length === 0) return {};

        const queryCodes = codes.map(this.getPrefixedCode).join(',');
        const url = `${CONFIG.API.TENCENT_STOCK_BASE}${queryCodes}`;

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            // 腾讯接口返回 GBK 编码，需解码
            const decoder = new TextDecoder('gbk');
            const text = await decoder.decode(await blob.arrayBuffer());
            return this._parseStockData(text);
        } catch (error) {
            console.error('获取股票数据失败:', error);
            return {};
        }
    }

    /**
     * 解析腾讯接口返回的原始文本
     */
    static _parseStockData(text) {
        const stockInfo = {};
        const lines = text.split('\n');
        
        lines.forEach(line => {
            if (line.trim() && line.includes('=')) {
                const [varName, dataStr] = line.split('=');
                // varName like "v_sh000001" or "v_sz000001"
                const code = varName.replace('v_', '').replace('sh', '').replace('sz', '');
                const data = dataStr.replace(/"/g, '').replace(';', '');
                const fields = data.split('~');
                
                // 简单的校验，确保字段足够
                if (fields.length > 30) {
                    const price = parseFloat(fields[3]) || 0;
                    stockInfo[code] = {
                        name: fields[1],
                        code: code,
                        currentPrice: price,
                        price: price, // Alias for backward compatibility with dashboard.js
                        yesterdayPrice: parseFloat(fields[4]) || 0,
                        openPrice: parseFloat(fields[5]) || 0,
                        highPrice: parseFloat(fields[33]) || 0,
                        lowPrice: parseFloat(fields[34]) || 0,
                        change: parseFloat(fields[31]) || 0,
                        changePercent: parseFloat(fields[32]) || 0,
                        updateTime: fields[30]
                    };
                }
            }
        });
        
        return stockInfo;
    }
}
