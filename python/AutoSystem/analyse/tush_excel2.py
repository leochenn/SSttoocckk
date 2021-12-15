
import datetime

import matplotlib.pyplot as plt
from openpyxl.reader.excel import load_workbook
from matplotlib.lines import Line2D
import pandas as pd
from pandas import DataFrame,Series


# https://www.cnblogs.com/cycxtz/p/14065556.html
# https://www.cnblogs.com/bilx/p/11644700.html

# 判断买卖结点
# 采用短线均线上穿长线均线为买点
# 采用短线均线下穿长线均线为卖点
def is_dbljx5to10(data, i, mode='buy', j1='MA_5', j2='MA_10'):
    if i < 10:
        return False

    if mode == 'buy':
        if (data.loc[i, j1] > data.loc[i, j2]) & (data.loc[i - 1, j1] < data.loc[i - 1, j2]):
            return True
    else:
        if (data.loc[i, j1] < data.loc[i, j2]) & (data.loc[i - 1, j1] > data.loc[i - 1, j2]):
            return True

    return False

def is_dbljx10to30(data, i, mode='buy', j1='MA_10', j2='MA_30'):
    if i < 30:
        return False

    if mode == 'buy':
        if (data.loc[i, j1] > data.loc[i, j2]) & (data.loc[i - 1, j1] < data.loc[i - 1, j2]):
            return True
    else:
        if (data.loc[i, j1] < data.loc[i, j2]) & (data.loc[i - 1, j1] > data.loc[i - 1, j2]):
            return True

    return False

def is_dbljx10to60(data, i, mode='buy', j1='MA_10', j2='MA_60'):
    if i < 60:
        return False

    if mode == 'buy':
        if (data.loc[i, j1] > data.loc[i, j2]) & (data.loc[i - 1, j1] < data.loc[i - 1, j2]):
            return True
    else:
        if (data.loc[i, j1] < data.loc[i, j2]) & (data.loc[i - 1, j1] > data.loc[i - 1, j2]):
            return True

    return False

if __name__ == '__main__':
    df = pd.read_excel(r'20211213-123078-飞凯\20211213-184146_123078.xlsx', usecols=[1, 2])
    # df.drop(labels='Unnamed: 0', axis=1, inplace=True)

    df['MA_5'] = df['price'].rolling(5).mean()
    df['MA_10'] = df['price'].rolling(10).mean()
    df['MA_30'] = df['price'].rolling(30).mean()
    df['MA_60'] = df['price'].rolling(60).mean()

    # df.to_excel('20211213-184146_123078_ma.xlsx')
    # exit()

    df['b'] = ''
    df['s'] = ''

    l = []
    buy_price = 0
    all = 0
    count = 0
    # 因为比较的是5日线和10日线，所以从第251个开始
    for i in range(60, len(df)):

        # 上涨超过1元，5日下穿10则卖出

        # # 止损（实测效果不佳）
        # if buy_price != 0:
        #      if buy_price - df['price'][i] > 0.15:
        #          sell_price = df['price'][i]
        #          one = sell_price - buy_price
        #          buy_price = 0
        #          all = all + one
        #          count = count + 1
        #          print('sell_index:' + str(i) + ', sell_price:' + str(sell_price) + ', date:' + str(df['time'][i]) + ', 盈亏 ' + str('%.4f' % one) + ', 止损')
        #          continue

        # 判断买卖信号
        if is_dbljx10to60(df, i, 'buy'):
            # 记录买点
            buy_price = df['price'][i]
            count = count + 1
            df.loc[i, 'b'] = buy_price
            print(' buy_index:' + str(i) + ', buy_price:' + str(buy_price) + ', date:' + str(df['time'][i]))
        # 卖出信号
        elif (buy_price != 0) & is_dbljx10to60(df, i, 'sell'):
            # 证券代码 买入索引 卖出索引 买入日期 卖出日期 买入价格 卖出价格
            # 记录下买卖点，清除买点
            sell_price = df['price'][i]
            one = sell_price - buy_price
            buy_price = 0
            all = all + one
            count = count + 1
            df.loc[i, 's'] = sell_price
            print('sell_index:' + str(i) + ', sell_price:' + str(sell_price) + ', date:' + str(df['time'][i]) + ', 盈亏 ' + str('%.4f' % one))

    print('end:' + str('%.4f' % all) + ',' + str(count))

    with pd.ExcelWriter(r'20211213-123078-飞凯\20211213-184146_123078_111.xlsx') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')