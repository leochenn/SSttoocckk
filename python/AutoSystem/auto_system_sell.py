# -*- coding: utf-8 -*-
import datetime
import re

import pyautogui
import log
from cancel_window import CancelWindow
from window_widget import WindowWidget


if __name__ == '__main__':
    curr_time = datetime.datetime.now()
    log.setTag("auto_system")
    log.d('启动')

    # 准备工作
    # 1.必须先手动启动通达信窗口，
    # 2.将所有菜单按照顺序进行《手动》切换：买入，卖出，撤单，成交，持仓，不进行该步骤会导致查找窗口失败

    windowWidget = WindowWidget()

    buyCode = '110038'
    buyPrice = '116.81'
    # 买入数量  上海1手 = 深圳10张
    buyCount = '1'

    windowWidget.bringToFront()

    if not windowWidget.checkLocked():
        shelter = windowWidget.closeTipDlgBeforeOperator()

    log.info('卖出')

    if windowWidget.isTabVisible(windowWidget.sellTabHwnd):
        WindowWidget.focusEditCodeAndClear(windowWidget.sellTabCode)
        WindowWidget.setEditText(windowWidget.sellTabCount, buyCount)
        log.info("输入证券数量：" + buyCount)
        pyautogui.typewrite(buyCode)
    else:
        log.info('卖出窗口未聚焦')
        WindowWidget.clickBtn(windowWidget.menuBar, 58, 10)
        windowWidget.setEditCountTwice(windowWidget.sellTabCount, buyCount)
        log.d("设置数量", buyCount, '读取数量', WindowWidget.getEditContent(windowWidget.sellTabCount))
        windowWidget.setSellEditCodeTwice(windowWidget.sellTabPrice, buyCode)

    WindowWidget.setEditText(windowWidget.sellTabPrice, buyPrice)
    log.d('设置价格', buyPrice, '读取价格', WindowWidget.getEditContent(windowWidget.sellTabPrice))

    for retry in range(2):
        # 点击买入下单
        # 注意：不能在这里使用clickBtn2
        WindowWidget.clickBtn(windowWidget.sellTabSellBtn)
        tipDialogHandle = windowWidget.getTipDlgHwndAfterCommit()
        if tipDialogHandle:
            msg = WindowWidget.getTipDlgContent(tipDialogHandle)
            if msg:
                if '合同号是' in msg:
                    buyOrder = re.findall("\d+", msg)[0]
                    log.d("委托提交成功，点击关闭", buyOrder, str(datetime.datetime.now() - curr_time))
                    btnHwnd = WindowWidget.getTipDlgBtn(tipDialogHandle)
                    WindowWidget.clickBtn2(btnHwnd)

                    # 检查委托状态， 通过读取撤单列表行数来进行判断
                    cancelWindow = CancelWindow(windowWidget)
                    success = cancelWindow.getListCount()
                    if success:
                        log.d("卖出成功", str(datetime.datetime.now() - curr_time))
                else:
                    log.d('委托失败', msg)
            else:
                log.d('异常：委托对话框内容为空')
            break
        else:
            if retry == 2:
                raise Exception('异常：未弹出委托对话框')
            log.d('异常：未弹出委托对话框, 重试下单')

    curr_time_end = datetime.datetime.now()
    log.d("运行完毕", str(curr_time_end - curr_time))