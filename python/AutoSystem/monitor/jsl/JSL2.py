import datetime
import os
import time
import requests
import json
import csv
import tushare as ts
from pandas import DataFrame

# https://blog.csdn.net/geofferysun/article/details/114640013

# 计算每只转债历史均值：波动浮度，日均成交量，日均涨跌，近一周，俩周，一个月的涨跌幅度，成交量等等
def getCloseData(item, data_folder):
    code = str(item['bond_id'])
    name = str(item['bond_nm'])
    code = str(item['stock_id'])
    name = str(item['stock_nm'])


    if str(item['price_tips']) == '待上市':
        print('待上市：' + code + '_' + name)
        return

    # https://mp.weixin.qq.com/s/XoyACntxEXX3ZEqvECUbBg  get_k_data说明
    data = ts.get_k_data(code, autype='qfq')
    # 该接口用于获取实时的价格，不适合收盘使用；收盘应该使用get_k_data 可以获取历史k线数据
    # data = ts.get_realtime_quotes_kzz(code)

    exit()
    if data is None:
        print('Error get!!! code:' + code + ", name:" + name)
        return

    file_path = data_folder + '\\' + code + '_' + name + '.xlsx'

    if os.path.exists(file_path):
        return

    print('save:' + code + '_' + name)

    df = DataFrame(data)
    df.to_excel(file_path)

if __name__ == '__main__':
    curr_time = datetime.datetime.now()

    json_data = None
    with open('20211215-收盘后数据.json', 'r', encoding='utf8')as fp:
        json_data = json.load(fp)

    if json_data is None or len(json_data) == 0:
        raise Exception('数据为空')

    date = str(time.strftime('%Y-%m-%d', time.localtime()))

    data_folder = 'stock_close_data' + '\\' + date
    if not os.path.exists(data_folder):
        os.makedirs(data_folder)

    list = json_data['data']
    print('共有数据：' + str(len(list)))

    for item in list:
        getCloseData(item, data_folder)

    print('end! cost:' + str(datetime.datetime.now() - curr_time))
