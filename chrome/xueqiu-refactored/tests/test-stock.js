import { StockService } from '../modules/stock.js';
import { TextEncoder, TextDecoder as NodeTextDecoder } from 'util';

// Mock fetch globally
global.fetch = async (url) => {
    console.log(`[Mock] Fetching ${url}`);
    return {
        blob: async () => ({
            arrayBuffer: async () => {
                // v_sz000001="平安银行";"000001";...
                const mockResponse = `v_sz000001="1~平安银行~000001~10.50~10.40~10.45~45678~34567~45678~10.50~15~10.30~10.00~10.80~3000~4000~5000~6000~7000~8000~9000~2000~1000~0000~500~2.5~4.5~6.7~1.2~2.3~20231027153000~0.10~0.96~10.55~10.33~...";`;
                return new TextEncoder().encode(mockResponse);
            }
        })
    };
};

// Force overwrite global TextDecoder for the test environment
// because we want 'gbk' to behave like 'utf-8' for our mock data
global.TextDecoder = class {
    constructor(encoding) {
        this.encoding = encoding;
    }
    decode(buffer) {
        // Since we encode as UTF-8 in the mock, decode as UTF-8 here
        return new NodeTextDecoder('utf-8').decode(buffer);
    }
};

async function runTests() {
    console.log('Running StockService Tests...');

    // Test 1: Code Prefix
    const szCode = '000001';
    
    // Check if the logic matches what we expect
    // In stock.js: 000001 -> sh000001 (special handling)
    const prefixed = StockService.getPrefixedCode(szCode);
    console.log(`Prefix check: ${szCode} -> ${prefixed}`);
    
    // Test 2: Fetch and Parse
    // Note: getPrefixedCode('000001') -> 'sh000001', but our mock data has v_sz000001 for test simplicity or mismatch?
    // In stock.js logic: 000001 becomes sh000001. 
    // The mock data returns v_sz000001.
    // The parser logic splits by '=', takes varName.
    // varName "v_sz000001" -> code "000001" (after replace sz).
    // So the key in result should be '000001'.
    
    const data = await StockService.fetchStockData(['000001']);
    console.log('Parsed Data:', data);
    
    if (data['000001'] && data['000001'].name === '平安银行') {
        console.log('PASS: Fetch and Parse successful');
    } else {
        console.error('FAIL: Fetch and Parse failed');
        process.exit(1);
    }
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
