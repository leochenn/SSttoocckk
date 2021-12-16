import datetime
import os
import time
import requests
import json
import csv
import tushare as ts
from pandas import DataFrame

def getCloseData(item, data_folder):
    code = str(item['bond_id'])
    name = str(item['bond_nm'])

    if str(item['price_tips']) == '待上市':
        print('待上市：' + code + '_' + name)
        return

    # 实时分笔, 描述当天全天交易情况，最高最低 成交等等
    data = ts.get_realtime_quotes_kzz(code)
    if data is None:
        print('Error get!!! code:' + code + ", name:" + name)
        return

    exit()

if __name__ == '__main__':
    curr_time = datetime.datetime.now()

    json_data = None
    with open('20211215-收盘后数据.json', 'r', encoding='utf8')as fp:
        json_data = json.load(fp)

    if json_data is None or len(json_data) == 0:
        raise Exception('数据为空')

    date = str(time.strftime('%Y-%m-%d', time.localtime()))

    data_folder = 'kzz_stock_close_data' + '\\' + date
    if not os.path.exists(data_folder):
        os.makedirs(data_folder)

    list = json_data['data']
    print('共有数据：' + str(len(list)))

    for item in list:
        getCloseData(item, data_folder)

    print('end! cost:' + str(datetime.datetime.now() - curr_time))
