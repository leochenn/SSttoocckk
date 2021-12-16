import datetime
import os
import time
import requests
import json
import csv
import tushare as ts
from pandas import DataFrame


# 1.登录集思录后打开网页 https://www.jisilu.cn/web/data/cb/list
# 2.再打开网页 https://www.jisilu.cn/webapi/cb/list_new/

def get_dat():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36",
    }

    newUrl = "https://www.jisilu.cn/data/cbnew/cb_list/?___jsl=LST___t=1584777951900"
    # 最简单的爬虫请求.也可以加上headers字段，防止部分网址的反爬虫机制
    response = requests.get(newUrl)
    # 当爬取的界面需要用户名密码登录时候，构建的请求需要包含auth字段
    data = response.content.decode("utf-8")
    dat = json.loads(data)

    # 所有数据
    lst_data = []
    for one in dat['rows']:
        # 每一条数据
        lst_dat = []
        # 转债id
        id = one["id"]
        dat_cell = one["cell"]

        # 转债名称
        name = dat_cell['bond_nm']
        # 股票名称
        stock_nm = dat_cell['stock_nm']
        # 现价
        price = dat_cell['price']
        # 溢价率
        premium_rt = dat_cell['premium_rt']
        # 评级
        rating_cd = dat_cell['rating_cd']
        # 回售触发价
        put_convert_price = dat_cell['put_convert_price']
        # 强赎触发价
        force_redeem_price = dat_cell['force_redeem_price']
        # 剩余时间
        last_time = dat_cell['year_left']
        # 双低
        dblow = dat_cell['dblow']
        # 剩余规模
        curr_iss_amt = dat_cell['curr_iss_amt']
        # 成交额
        volume = dat_cell['volume']
        # 换手率
        turnover_rt = dat_cell['turnover_rt']
        # 到期收益
        ytm_rt_tax = dat_cell['ytm_rt_tax']
        # 下修次数
        adj_cnt = dat_cell['adj_cnt']
        # 统计日期
        tjrq = datetime.date.today().__format__('%Y-%m-%d')

        lst_dat.append(id)
        lst_dat.append(name)
        lst_dat.append(stock_nm)
        lst_dat.append(price)
        lst_dat.append(premium_rt)
        lst_dat.append(rating_cd)
        lst_dat.append(put_convert_price)
        lst_dat.append(force_redeem_price)
        lst_dat.append(last_time)
        lst_dat.append(dblow)
        lst_dat.append(curr_iss_amt)
        lst_dat.append(volume)
        lst_dat.append(turnover_rt)
        lst_dat.append(ytm_rt_tax)
        lst_dat.append(adj_cnt)
        lst_dat.append(tjrq)

        lst_data.append(lst_dat)
    return lst_data

def wirte_csv(data):
    # 1. 创建文件对象
    tjrq2 = datetime.date.today().__format__('%Y-%m-%d')
    c_name = "可转债" + tjrq2 + ".csv"
    f = open(c_name, 'w', encoding='gbk', newline='')
    # 2. 基于文件对象构建 csv写入对象
    csv_writer = csv.writer(f)
    # 3. 构建列表头
    csv_writer.writerow(["代 码", "转债名称", "股票名称", "现 价", "溢价率", "评级",
                         "回售触发价", "强赎触发价", "剩余年限", "双低", "剩余规模", "成交额", "换手率", "到期收益", "下修次数", "统计日期"])
    # 4. 写入csv文件内容
    for dat in data:
        csv_writer.writerow(dat)
    # 5. 关闭文件
    f.close()

# 可转债属于沪市 1 深市 2
def checkKzzBelong(code):
    # 沪主板 600开头股票
    if str(code).startswith('110'):
        return 1

    # 沪主板 601开头股票
    if str(code).startswith('1130'):
        return 1

    # 沪主板 603开头股票
    if str(code).startswith('1135'):
        return 1

    # 沪主板 603开头股票
    if str(code).startswith('1136'):
        return 1

    # 沪主板 605开头股票
    if str(code).startswith('111'):
        return 1

    # 沪科创板
    if str(code).startswith('118'):
        return 1

    # 深主板 00开头股票
    if str(code).startswith('127'):
        return 2

    # 深主板 00开头股票
    if str(code).startswith('128'):
        return 2

    # 深主板 300开头股票
    if str(code).startswith('123'):
        return 2

# 盘后获取当日历史分时, 盘中获取实时的历史分时
def downloadFensiData(item, data_folder):
    code = str(item['bond_id'])
    name = str(item['bond_nm'])

    if str(item['price_tips']) == '待上市':
        print('待上市：' + code + '_' + name)
        return

    data = None
    belong = checkKzzBelong(code)
    if belong == 1:
        print('沪市转债：' + code + '_' + name)
        data = ts.get_today_ticks(code)
    elif belong == 2:
        print('深市转债：' + code + '_' + name)
        data = ts.get_today_ticks_sz(code)

    if data is None:
        print('Error download!!! code:' + code + ", name:" + name)
        return

    file_path = data_folder + '\\' + code + '_' + name + '.xlsx'

    if os.path.exists(file_path):
        return

    df = DataFrame(data)
    df.to_excel(file_path)

    time.sleep(0.01)

def test(data_folder):
    code = '111000'
    data = ts.get_today_ticks(code)
    file_path = data_folder + '\\' + code + '_' + '起帆转债' + '.xlsx'
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

    data_folder = 'kzz_fenshi_data' + '\\' + date
    if not os.path.exists(data_folder):
        os.makedirs(data_folder)

    list = json_data['data']
    print('共有数据：' + str(len(list)))

    for item in list:
        downloadFensiData(item, data_folder)

    print('end! cost:' + str(datetime.datetime.now() - curr_time))
