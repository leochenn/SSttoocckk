# -*- coding: utf-8 -*-
import datetime
import re
import time

import pyautogui
import win32gui
import log
from tdxwindow import TdxWindow
from checkoutfile import CheckOutFile

if __name__ == '__main__':
    curr_time = datetime.datetime.now()
    log.setTag("auto_system")

    # 准备工作
    # 1.必须先手动启动通达信窗口，
    # 2.将所有菜单按照顺序进行《手动》切换：买入，卖出，撤单，成交，持仓，不进行该步骤会导致查找窗口失败

    buyCode = '113017'
    buyPrice = '100'
    # 买入数量  上海1手 = 深圳10张
    buyCount = '1'

    # 找到通达信窗口
    # hwnd = win32gui.FindWindow('Afx:400000:b:10003:6:1146010b', None) 类名启动后会变
    windowTitle = '通达信网上交易V6 杭州营业部 曾蕾'
    hwnd = win32gui.FindWindow(None, windowTitle)
    if not hwnd:
        log.info('未启动通达信')
        exit()

    # 1.通达信前置
    log.info('通达信自动交易系统启动')
    tdxwindow = TdxWindow(hwnd)
    tdxwindow.bringToFront()

    # 2.是否是锁定状态
    locked = tdxwindow.checkWindowLocked()

    # 3.检查是否有提示窗口遮挡，如果刚解锁则不需要判断
    # 实际运行时，为节省时间，该步骤可注释
    if not locked:
        shelter = tdxwindow.checkTipDialogShown(1)

    # 买入： 执行买入前，先检查当前是否有买入任务
    log.info('开始执行买入')

    # 买入窗口是否聚焦，会影响以下控件的操作
    buyWindowInvisible = 0
    if tdxwindow.isBuyWindowVisible():
        tdxwindow.setEditCodeFocus()
    else:
        log.info('买入窗口未聚焦')
        tdxwindow.clickBuyBar()
        buyWindowInvisible = 1

    # 设置买入数量,这里有先后顺序关系，必须等买入数量先成功输入，不被清空才输入代码，
    # 因为代码控件无法读取，无法确定是否输入成功
    tdxwindow.setEditCount(buyCount, buyWindowInvisible)
    # 设置买入代码
    pyautogui.typewrite(buyCode)
    # 买入价格，可以不用手动设置，填写完证券代码后会自动显示当前买一卖一价格
    tdxwindow.setEditPrice(buyPrice)
    # 点击买入下单 todo 检查各项是否填写：刚遇到所有项目已经填写完，提交显示价格未填
    tdxwindow.clickBuyBtn()
    # 检查买入委托状态
    buyOrder = None
    for timeIndex in range(100):
        buyOrder = tdxwindow.checkBuyCommit()
        time.sleep(0.001)
        if buyOrder:
            break

    if buyOrder:
        # 委托已提交,合同号是771786
        if '合同号是' in buyOrder:
            buyOrder = re.findall("\d+", buyOrder)[0]
            log.info('买入委托成功:' + buyOrder)

            checkOutFile = CheckOutFile(hwnd, tdxwindow)
            checkOutFile.checkBuyOrderState(buyOrder)
        else:
            log.info('买入委托失败:' + buyOrder)
    else:
        log.info('买入委托出现异常,未弹出委托成弹窗')
