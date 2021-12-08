# -*- coding: utf-8 -*-
import sys
# sys.path.append('..')
from TdxTrader import TdxTrader

if __name__ == '__main__':
    #创建user, 参数(账号,券商代码),账号目前未使用，券商代码目前支持hbzq, xnzq, axzq
    # 若要添加新通达信支持，请参看tdxtrader.py->47行config变量的配置
    user = TdxTrader('1234','hbzq')
    #当日委托
    print(user.update_order())
    #当日成交
    print(user.update_trade())
    #发单, 参数(合约代码，方向，价格，数量)
    print(user.send_order('600000',0,10,100))
    #撤单,参数指定委托号
    #user.cancel_order('2881')
