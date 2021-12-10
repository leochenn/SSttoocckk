# -*- coding: utf-8 -*-
import time

import tushare as ts
from pandas import DataFrame
# import pandas

# 407a9d9db161b2155c58bf72ed534acfad4c684b193b1a521703260d
# import tushare

if __name__ == '__main__':
    # ts.set_token('407a9d9db161b2155c58bf72ed534acfad4c684b193b1a521703260d')
    # pro = ts.pro_api()

    ttime = time.strftime("%Y-%m-%d", time.localtime())


    code = '110081'
    data = ts.get_today_ticks(code)
    if data is None:
        print('null')
    else:
        print(data)
        df = DataFrame(data)
        df.to_excel(str(ttime) + "_" + str(code) + '.xlsx')

    code = '123078'
    data = ts.get_today_ticks_sz(code)
    if data is None:
        print('null')
    else:
        print(data)
        df = DataFrame(data)
        df.to_excel(str(ttime) + "_" + str(code) + '.xlsx')


    # 当日历史分时
    # data = ts.get_today_ticks(code)

    # 实时分笔, 描述当天全天交易情况，最高最低 成交等等
    # ts.get_realtime_quotes('000581')

    # 历史分笔,  接口失效
    # data = ts.get_tick_data('110081', '2021-12-09')
    # if data:
    #     print(data)
    #     df = DataFrame(data)
    #     df.to_excel('1.xlsx')


    '''
    #历史分笔 和 当日历史分 返回结果
    time：时间
    price：成交价格
    pchange：涨跌幅
    change：价格变动
    volume：成交手
    amount：成交金额(元)
    type：买卖类型【买盘、卖盘、中性盘】
    '''
