import datetime

import requests
import json
import csv


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

# 1.登录集思录后打开网页 https://www.jisilu.cn/web/data/cb/list
# 2.再打开网页 https://www.jisilu.cn/webapi/cb/list_new/
def getFromJsonFile():
    # os.system('"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" https://www.jisilu.cn/webapi/cb/list_new/')

    json_data = None
    with open('jsl20211215-2.json', 'r', encoding='utf8')as fp:
        json_data = json.load(fp)

    list = json_data['data']
    print("count:" + str(len(list)))

    # {
    # 'bond_id': '113634',
    # 'bond_nm': '珀莱转债',
    # 'bond_py': 'blzz',
    # 'price': 100,
    # 'increase_rt': 0,
    # 'stock_id': '603605',
    # 'stock_nm': '珀莱雅',
    # 'stock_py': 'bly',
    # 'sprice': 205.83,
    # 'sincrease_rt': 0.65,
    # 'pb': 15.81,
    # 'convert_price': 195.98,
    # 'convert_value': 105.03,
    # 'convert_dt': 181,
    # 'premium_rt': -4.79,
    # 'dblow': 95.21,
    # 'adjust_condition': '15/30  85%',
    # 'sw_cd': '220304',
    # 'market_cd': 'shmb',
    # 'btype': 'C',
    # 'list_dt': None,
    # 'qflag2': 'N',
    # 'owned': 0,
    # 'hold': 0,
    # 'bond_value': None,
    # 'rating_cd': 'AA',
    # 'option_value': None,
    # 'put_convert_price': 137.19,
    # 'force_redeem_price': 254.77,
    # 'convert_amt_ratio': 1.8,
    # 'fund_rt': None,
    # 'short_maturity_dt': '27-12-07',
    # 'year_left': 5.981,
    # 'curr_iss_amt': 7.517,
    # 'volume': 0,
    # 'svolume': 4255.22,
    # 'turnover_rt': 0,
    # 'ytm_rt': 3.16,
    # 'put_ytm_rt': None,
    # 'notes': None,
    # 'noted': 0,
    # 'bond_nm_tip': '',
    # 'redeem_icon': '',
    # 'last_time': None,
    # 'qstatus': '00',
    # 'margin_flg': 'R',
    # 'sqflag': 'Y',
    # 'pb_flag': 'N',
    # 'adj_cnt': 0,
    # 'adj_scnt': 0,
    # 'convert_price_valid': 'Y',
    # 'convert_price_tips': '',
    # 'convert_cd_tip': '未到转股期；2022-06-14 开始转股',
    # 'ref_yield_info': '',
    # 'adjusted': 'N',
    # 'orig_iss_amt': 7.517,
    # 'price_tips': '待上市',
    # 'redeem_dt': None,
    # 'real_force_redeem_price': None,
    # 'option_tip': ''
    # }

    print(list[0])


    lst_data = []
    for one in list['rows']:
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

    print(lst_data)



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

if __name__ == '__main__':
    getFromJsonFile()
    # wirte_csv(data)

    print()