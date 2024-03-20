import sys
import time
import log
import chlog
import math
import keyboard
import pyautogui
from openpyxl.reader.excel import load_workbook

from cancel_window import CancelWindow
from window_widget import WindowWidget
from threading import Event

# 深市 单位为张，一张等于100元
# 123（创业板）
# 127（主板）
# 128（中小板）

# 读取持仓excel 自动挂单卖出
# 沪市 单位为手，一手等于1000元
# 110（沪市主板）
# 111（沪市主板）
# 113（沪市主板）
# 118（沪市科创板）

# 每只转债持仓为30只
level1_count = 6
level2_count = 8
level3_count = 12

level1_price = 1.0289
level2_price = 1.0388
level3_price = 1.0488

allSellSuccess = 1
windowWidget = None

exit_flag = Event()

# 监听所有按键,按q退出程序
def on_press(key):
    if key.name in ['up', 'down', 'left', 'right']:
        chlog.e('按方向键退出执行', key.name)
        exit_flag.set()  # 设置退出标志

def doSell(name, buyCode, buyCount, buyPrice):
    if exit_flag.is_set() :
        chlog.e('执行退出1')
        sys.exit(0)

    buyCode = str(buyCode)
    buyCount = str(buyCount)
    buyPrice = str(math.floor(buyPrice * 10) / 10)

    chlog.d('卖出', name, buyCode, buyPrice, buyCount)
    time.sleep(0.2)

    if not windowWidget.checkLocked():
        shelter = windowWidget.closeTipDlgBeforeOperator()
        if shelter:
            chlog.e('closeTipDlgBeforeOperator')
            time.sleep(1)

    if not windowWidget.isTabVisible(windowWidget.sellTabHwnd):
        chlog.e('卖出窗口未聚焦')
        WindowWidget.clickBtn(windowWidget.menuBar, 58, 10)
        time.sleep(0.5)

    if windowWidget.isTabVisible(windowWidget.sellTabHwnd):
        WindowWidget.focusEditCodeAndClear(windowWidget.sellTabCode)
        WindowWidget.setEditText(windowWidget.sellTabCount, buyCount)
        readSellCount = WindowWidget.getEditContent(windowWidget.sellTabCount)
        if buyCount != readSellCount:
            chlog.e("输入数量：" + str(buyCount), '读取数量', readSellCount)
        pyautogui.typewrite(buyCode)
    else:
        chlog.e('卖出窗口还是未聚焦')
        exit(0)

    time.sleep(0.2)

    WindowWidget.setEditText(windowWidget.sellTabPrice, buyPrice)
    readSellPrice = WindowWidget.getEditContent(windowWidget.sellTabPrice)
    if buyPrice != readSellPrice:
        chlog.e('输入价格', buyPrice, '读取价格', readSellPrice)

    time.sleep(1)

    if exit_flag.is_set():
        chlog.e('执行退出2')
        sys.exit(0)

    success = None

    for retry in range(2):
        # 点击买入下单
        # 注意：不能在这里使用clickBtn2
        WindowWidget.clickBtn(windowWidget.sellTabSellBtn)
        time.sleep(0.2)

        tipDialogHandle = windowWidget.getTipDlgHwndAfterCommit('卖出交易确认')
        if tipDialogHandle:
            msg = WindowWidget.getTipDlgContent(tipDialogHandle)
            if msg:
                if '股票代码' in msg:
                    # buyOrder = re.findall("\d+", msg)[0]
                    # chlog.d("委托提交成功，点击关闭", buyOrder)
                    btnHwnd = WindowWidget.getTipDlgBtn(tipDialogHandle)
                    time.sleep(0.2)
                    WindowWidget.clickBtn2(btnHwnd)
                    time.sleep(0.2)

                    # 点击后的弹窗
                    tipDialogHandle2 = windowWidget.getTipDlgHwndAfterCommit()
                    if tipDialogHandle2:
                        msg2 = WindowWidget.getTipDlgContent(tipDialogHandle2)
                        if '合同号' not in msg2:
                            chlog.e("本次交易操作失败\n", msg2)

                        btnHwnd2 = WindowWidget.getTipDlgBtn(tipDialogHandle2)
                        time.sleep(0.2)
                        WindowWidget.clickBtn2(btnHwnd2)
                        success = 1
                        time.sleep(0.2)
                    else:
                        chlog.e('获取委托后的弹窗句柄失败!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')

                    # 提交失败

                    # 检查委托状态， 通过读取撤单列表行数来进行判断
                    # cancelWindow = CancelWindow(windowWidget)
                    # success = cancelWindow.getListCount()
                    # if success:
                    #     log.d("卖出成功", str(datetime.datetime.now() - curr_time))
                else:
                    chlog.e('委托失败', msg)
            else:
                chlog.e('异常：委托对话框内容为空')
            break
        else:
            if retry == 2:
                raise Exception('异常：未弹出委托对话框')
            chlog.e('异常：未弹出委托对话框, 重试下单!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')

    if not success:
        allSellSuccess = 0
    chlog.d("--------------------------------")

def isSh(code):
    return code.startswith('110') or code.startswith('111') or code.startswith('113') or code.startswith('118')

def sellByCodeAndCount(name, code, count, price):
    rate = 10
    if (isSh(code)):
        rate = 1

    if count < level1_count * rate:
        # 1-5
        doSell(name, code, count, price * level1_price)
    else:
        # 26-30
        if count + 1 > (level1_count * rate + level2_count * rate + level3_count * rate):
            # 卖出6
            doSell(name, code, level1_count * rate, price * level1_price)
            # 卖出8
            doSell(name, code, level2_count * rate, price * level2_price)
            # 卖出12
            doSell(name, code, level3_count * rate, price * level3_price)
        elif count + 1 > (level1_count * rate + level2_count * rate + level3_count * rate) / 2:
            # 13-25
            doSell(name, code, math.floor(count * 0.25 / rate) * rate, price * level1_price)
            doSell(name, code, math.floor(count * 0.25 / rate) * rate, price * level2_price)
            doSell(name, code, math.floor(count * 0.5 / rate) * rate, price * level3_price)
        else:
            # 12-6
            doSell(name, code, math.floor(count * 0.5 / rate) * rate, price * level1_price)
            doSell(name, code, math.floor(count * 0.5 / rate) * rate, price * level3_price)

# 导出挂单列表
def exportList():
    if not windowWidget.isTabVisible(windowWidget.cancelTab):
        chlog.d('撤单窗口未聚焦')
        WindowWidget.clickBtn(windowWidget.menuBar, 96, 10)
        time.sleep(0.5)

    if not windowWidget.isTabVisible(windowWidget.cancelTab):
        chlog.d('撤单窗口还是未聚焦')

    chlog.d('撤单窗口聚焦')

    cancelWindow = CancelWindow(windowWidget)

    count = cancelWindow.getListCount()
    chlog.d('getListCount', count)
    if count:
        cancelWindow.checkBuyOrderState('')
        chlog.d('读取excel')

if __name__ == '__main__':
    log.setTag("xxx")
    chlog.setTag("xxx")

    keyboard.on_press(on_press)

    windowWidget = WindowWidget()
    windowWidget.bringToFront()

    wb = load_workbook(r'C:\Users\Administrator\Desktop\可转债轮动\收盘后的数据整理.xlsx')
    sheetname = wb.sheetnames[0]
    ws = wb[sheetname]
    max_row = ws.max_row + 1
    chlog.e('开始执行', sheetname)

    for row in range(2, max_row):
        zzName = ws.cell(row, 2).value
        if zzName is not None and len(zzName) != 0 and '转' in zzName:
            zzCode = ws.cell(row, 1).value
            zzCode = ''.join([c for c in zzCode if c.isdigit()])
            zzCount = ws.cell(row, 3).value
            zzPrice = ws.cell(row, 5).value

            chlog.e("--------------------------------")
            chlog.d(row, " ", zzName, zzCode, zzPrice, zzCount)
            chlog.d("--------------------------------")
            if zzCode is None or zzCount < 1 or zzPrice < 80:
                chlog.e('错误:代码或数量不合法！！！', zzName, zzCode, zzCount, zzPrice)
            else:
                sellByCodeAndCount(zzName, zzCode, zzCount, zzPrice)
        else:
            chlog.e('非转债', zzName)

    if not allSellSuccess:
        chlog.e('执行结束, 有操作失败的情况！！！')
    else:
        chlog.e('执行结束')
        # 导出撤单列表，对比挂单所有结果是否符合设定，进行检查
        # exportList()