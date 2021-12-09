# -*- coding: utf-8 -*-
import datetime
import re
import time

import pyautogui
import log
from tdxwindow import TdxWindow
from checkoutfile import CheckOutFile
from cancel_window import CancelWindow
from window_widget import WindowWidget

# 检查买入委托状态, 通过读取输出撤单列表进行查找订单号
def checkOutputOrderId(hwnd, tdxwindow):
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


if __name__ == '__main__':
    curr_time = datetime.datetime.now()
    log.setTag("auto_system")

    # 准备工作
    # 1.必须先手动启动通达信窗口，
    # 2.将所有菜单按照顺序进行《手动》切换：买入，卖出，撤单，成交，持仓，不进行该步骤会导致查找窗口失败

    windowWidget = WindowWidget()
    hwnd = windowWidget.hwnd

    buyCode = '113017'
    buyPrice = '100'
    # 买入数量  上海1手 = 深圳10张
    buyCount = '1'

    tdxwindow = TdxWindow(windowWidget)
    tdxwindow.bringToFront()
    locked = tdxwindow.checkWindowLocked()

    # 3.检查是否有提示窗口遮挡，如果刚解锁则不需要判断
    # 实际运行时，为节省时间，该步骤可注释
    if not locked:
        shelter = tdxwindow.checkTipDialogShown()

    cancelWindow = CancelWindow(hwnd, tdxwindow)
    cancelWindow.init()

    # 买入： 执行买入前，先检查当前是否有买入任务
    log.info('开始执行买入')

    # 买入窗口是否聚焦，会影响以下控件的操作
    if windowWidget.isTabVisible(windowWidget.buyTabHwnd):
        tdxwindow.setEditCodeFocus()
        WindowWidget.setEditText(windowWidget.buyTabCount, buyCount)
    else:
        log.info('买入窗口未聚焦')
        # 这里sleep的时间会影响证券代码的成功输入，时间过短会输入失败
        WindowWidget.clickBtn(windowWidget.menuBar, 19, 10)
        tdxwindow.setEditCountTwice(buyCount)

    log.info("输入证券数量：" + buyCount)

    # 设置买入代码
    pyautogui.typewrite(buyCode)

    # 买入价格，可以不用手动设置，填写完证券代码后会自动显示当前买一卖一价格
    WindowWidget.setEditText(windowWidget.buyTabPrice, buyPrice)
    log.d('设置价格', buyPrice, '读取价格', WindowWidget.getEditContent(windowWidget.buyTabPrice))

    # 点击买入下单 todo 检查各项是否填写：刚遇到所有项目已经填写完，提交显示价格未填
    WindowWidget.clickBtn2(windowWidget.buyTabBuyBtn)

    # 通达信可以设置买入委托成功是否弹出提示框，如果设置了提示，则会弹窗显示委托合同号
    if not tdxwindow.checkBuyCommitWithoutSuccessDlg():
        log.d('买入成功')

    # 检查买入委托状态， 通过读取撤单列表行数来进行判断
    cancelWindow.getListCount()