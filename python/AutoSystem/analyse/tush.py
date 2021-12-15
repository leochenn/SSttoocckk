# -*- coding: utf-8 -*-
import datetime
import time

import tushare as ts
from pandas import DataFrame

# 从excel中导入数据回测一天的分时数据
# 输出图片：买卖点， 一天的买卖收益

# 该类用途：从tushare获取各类型数据

def huiceExcelDayFenShi():
    pass

if __name__ == '__main__':
    curr_time = datetime.datetime.now()

    # ts.set_token('407a9d9db161b2155c58bf72ed534acfad4c684b193b1a521703260d')
    # pro = ts.pro_api()

    ttime = time.strftime('%Y%m%d-%H%M%S', time.localtime())

    # https://blog.csdn.net/qq_43082153/article/details/108663770 get_realtime_quotes
    # code = '110081'
    # # data = ts.get_realtime_quotes(['110081', '123078'])
    # data = ts.get_realtime_quotes(code)
    # if data is None:
    #     print('null')
    # else:
    #     print("获取数据结束" + str(datetime.datetime.now() - curr_time))
    #
    #     df = DataFrame(data)
    #     # df = DataFrame(data[['code', 'name', 'price', 'bid', 'ask', 'volume', 'amount', 'time']])
    #     df.to_excel(str(ttime) + "_" + str(code) + '.xlsx')
    #     print("excel导出结束" + str(datetime.datetime.now() - curr_time))


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


    # 盘后获取当日历史分时, 盘中获取实时的历史分时
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
