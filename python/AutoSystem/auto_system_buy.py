# -*- coding: utf-8 -*-
import datetime
import re
import time

import pyautogui
import log
from cancel_window import CancelWindow
from window_widget import WindowWidget

if __name__ == '__main__':
    curr_time = datetime.datetime.now()
    log.setTag("auto_system")
    log.d('启动')

    windowWidget = WindowWidget()

    # for index in range(10):
    #     log.d('row', WindowWidget.getListviewRows(windowWidget.cancelTabSysListView32))
    #     time.sleep(1)
    #
    # exit()

    buyCode = '110038'
    buyPrice = '116'
    buyCount = '1' # 买入数量  上海1手 = 深圳10张

    windowWidget.bringToFront()

    if not windowWidget.checkLocked():
        shelter = windowWidget.closeTipDlgBeforeOperator()

    log.info('买入')

    if windowWidget.isTabVisible(windowWidget.buyTabHwnd):
        WindowWidget.focusEditCodeAndClear(windowWidget.buyTabCode)
        WindowWidget.setEditText(windowWidget.buyTabCount, buyCount)
        log.info("输入证券数量：" + buyCount)
        pyautogui.typewrite(buyCode)
    else:
        log.info('买入窗口未聚焦')
        WindowWidget.clickBtn(windowWidget.menuBar, 19, 10)
        windowWidget.setEditCountTwice(windowWidget.buyTabCount, buyCount)
        log.d("设置数量", buyCount, '读取数量', WindowWidget.getEditContent(windowWidget.buyTabCount))
        windowWidget.setSellEditCodeTwice(windowWidget.buyTabPrice, buyCode)

    WindowWidget.setEditText(windowWidget.buyTabPrice, buyPrice)
    log.d('设置价格', buyPrice, '读取价格', WindowWidget.getEditContent(windowWidget.buyTabPrice))

    for retry in range(3):
        # 点击买入下单
        # 注意：不能在这里使用clickBtn2
        WindowWidget.clickBtn(windowWidget.buyTabBuyBtn)
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
                        log.d("买入成功", str(datetime.datetime.now() - curr_time))
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