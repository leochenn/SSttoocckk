# -*- coding: utf-8 -*-
import datetime
import re
import sys
import time
import pyautogui
import win32process
import stock.log
import stock.util
import win32api, win32gui, win32con

from stock.nouserd import orderOperator

reload(sys)
sys.setdefaultencoding("utf-8")

# 参考引用
# win32gui 使用
# https://blog.csdn.net/seele52/article/details/17504925/
# 窗口最大化最小化
# https://blog.csdn.net/jr126/article/details/109647187
# 控件可用判断
# http://icool8.cn/2020/08/26/Blog/python/python%E5%85%B3%E4%BA%8E%E6%8C%87%E5%AE%9A%E7%AA%97%E5%8F%A3%E7%9A%84%E6%93%8D%E4%BD%9C/
# pyautogui
# http://www.chenxm.cc/article/266.html
# https://www.codenong.com/cs109484854/

def log(msg):
    stock.log.info(msg)

def logHandleId(msg):
    stock.log("handle id:" + str(msg) + "," + str(hex(msg)))

def clickBuyBar(hwnd):
    # []数组最后一个元素，即就是目标窗体类名，所在的索引(相同类名的集合中的索引，并非父窗口下的索引)  1F0778
    buyBar = stock.util.find_subHandle(hwnd,
                                       [
                                           ('AfxFrameOrView42', 0),  # 80a3e
                                           ('#32770', 0),  # d080c
                                           ('Afx:10000000:3:10003:900010:1002b', 0),  #907a2
                                           ('AfxMDIFrame42', 0),  # a0850
                                           ('AfxWnd42', 1),  # 1e06b8
                                           ('MHPDockBar', 0),  # 7ff022e
                                           ('MHPToolBar', 0)  # 31c0722
                                       ])
    if buyBar > 0:
        left, top, right, bottom = win32gui.GetWindowRect(buyBar)
        # 买入按钮 38*20
        win32api.SetCursorPos([left + 19, top + 10])
        win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        # 这里sleep的时间会影响证券代码的成功输入，时间过短会输入失败
        stock.log("点击.顶部菜单项-买入.控件")
    else:
        stock.log("未找到.顶部菜单项-买入.控件")

def setEditCodeFocus(hwnd):
    editCode = stock.util.find_subHandle(hwnd,
                                         [
                                  ('AfxFrameOrView42', 0),  # 80a3e
                                  ('#32770', 0),  # d080c
                                  ('Afx:10000000:3:10003:900010:1002b', 0),  #
                                  ('AfxMDIFrame42', 0),  # a0850
                                  ('AfxWnd42', 1),  # 1e06b8
                                  ('#32770', 1),  # 1f0778
                                  ('AfxWnd42', 0)  # 40a6c
                              ])
    if editCode > 0:
        left, top, right, bottom = win32gui.GetWindowRect(editCode)
        # 买入按钮 38*20
        win32api.SetCursorPos([left + 40, top + 10])
        win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        time.sleep(0.05)
        pyautogui.press(["backspace","backspace","backspace","backspace","backspace","backspace"])
    else:
        stock.log("未找到.证券代码.控件")

def setEditPrice(hwnd, price):
    editPrice = stock.util.find_subHandle(hwnd,
                                          [
                                              ('AfxFrameOrView42', 0),  # 80a3e
                                              ('#32770', 0),  # d080c
                                              ('Afx:10000000:3:10003:900010:1002b', 0),  #
                                              ('AfxMDIFrame42', 0),  # a0850
                                              ('AfxWnd42', 1),  # 1e06b8
                                              ('#32770', 1),  # 1f0778
                                              ('Edit', 1)  # c07fe
                                          ])
    if editPrice > 0:
        stock.log("找到了.证券价格.控件")
        win32api.SendMessage(editPrice, win32con.WM_SETTEXT, 0, price)
        stock.log("输入证券价格：" + price)

        # 获取edit控件文本
        len = win32gui.SendMessage(editPrice, win32con.WM_GETTEXTLENGTH) + 1
        str_buffer = win32gui.PyMakeBuffer(len)
        win32gui.SendMessage(editPrice, win32con.WM_GETTEXT, len, str_buffer)
        stock.log("读取证券价格：" + str(str_buffer[:-1]).decode('gbk'))
    else:
        stock.log("未找到.证券价格.控件")

def getEidtContent(editCount):
    len = win32gui.SendMessage(editCount, win32con.WM_GETTEXTLENGTH) + 1
    str_buffer = win32gui.PyMakeBuffer(len)
    win32gui.SendMessage(editCount, win32con.WM_GETTEXT, len, str_buffer)
    return str(str_buffer[:-1]).decode('gbk')

# 如果从其他窗口切换到买入窗口，则会清空所有的内容，但是时间不确定，所以用循环方式来实现监控
# 如果设置了内容之后被清空俩次，则进行最后一次设置
def setEditCount(hwnd, count, flag):
    editCount = stock.util.find_subHandle(hwnd,
                                          [
                                   ('AfxFrameOrView42', 0),  # 80a3e
                                   ('#32770', 0),  # d080c
                                   ('Afx:10000000:3:10003:900010:1002b', 0),  #
                                   ('AfxMDIFrame42', 0),  # a0850
                                   ('AfxWnd42', 1),  # 1e06b8
                                   ('#32770', 1),  # 1f0778
                                   ('Edit', 4)  # c07fe
                               ])

    if editCount > 0:
        stock.log("找到了.证券数量.控件")
        if flag == 0:
            win32api.SendMessage(editCount, win32con.WM_SETTEXT, 0, count)
            stock.log("输入证券数量：" + count)
        else:
            win32api.SendMessage(editCount, win32con.WM_SETTEXT, 0, count)
            stock.log("输入证券数量：" + count)
            while True:
                content = getEidtContent(editCount)
                stock.log("读取证券数量：" + content)
                if content:
                    time.sleep(0.01)
                else:
                    win32api.SendMessage(editCount, win32con.WM_SETTEXT, 0, count)
                    stock.log("输入证券数量：" + count)

                    while True:
                        content = getEidtContent(editCount)
                        stock.log("读取证券数量：" + content)
                        if content:
                            time.sleep(0.01)
                        else:
                            win32api.SendMessage(editCount, win32con.WM_SETTEXT, 0, count)
                            stock.log("输入证券数量：" + count)
                            time.sleep(0.01)
                            content = getEidtContent(editCount)
                            stock.log("读取证券数量：" + content)
                            if content:
                                break

                    break
    else:
        stock.log("未找到.证券数量.控件")

def clickBuyBtn(hwnd):
    btnBuy = stock.util.find_subHandle(hwnd,
                                       [
                                           ('AfxFrameOrView42', 0),  # 80a3e
                                           ('#32770', 0),  # d080c
                                           ('Afx:10000000:3:10003:900010:1002b', 0),  #
                                           ('AfxMDIFrame42', 0),  # a0850
                                           ('AfxWnd42', 1),  # 1e06b8
                                           ('#32770', 1),  # 1f0778
                                           ('Button', 0)  # 10076e
                                       ])
    if btnBuy > 0:
        stock.log("找到了.买入下单.控件")

        # # 鼠标左键按下
        win32gui.SendMessage(btnBuy, win32con.WM_LBUTTONDOWN, win32con.MK_LBUTTON, 0)
        # # # 鼠标左键抬起
        win32gui.SendMessage(btnBuy, win32con.WM_LBUTTONUP, win32con.MK_LBUTTON, 0)
        # 也可以通过win32gui.GetWindowRect获取按钮控件的坐标，然后再根据坐标去点击
        stock.log("买入下单.点击")

    else:
        stock.log("未找到.买入下单.控件")

# 判断当前哪个窗口处在IsWindowVisible状态
# 买入窗口：句柄id，2033528，1f0778
# 卖出窗口：句柄id，10292952，9d0ed8
# 撤单窗口：句柄id，461634，70b42
# 成交窗口：句柄id，2099034， 20075a
# 持仓窗口：句柄id，591512，90698
def isBuyWindowVisible(hwnd):
    for index in range(7):
        buyWindowHwnd = stock.util.find_subHandle(hwnd,
                                                  [
                                                           ('AfxFrameOrView42', 0),  # 80a3e
                                                           ('#32770', 0),  # d080c
                                                           ('Afx:10000000:3:10003:900010:1002b', 0),  #
                                                           ('AfxMDIFrame42', 0),  # a0850
                                                           ('AfxWnd42', 1),  # 1e06b8
                                                           ('#32770', index)  # 1f0778
                                                       ])
        if buyWindowHwnd:
            btnHandle = win32gui.FindWindowEx(buyWindowHwnd, 0, 'Button', None)
            title = win32gui.GetWindowText(btnHandle)
            if title != None and title.decode('gbk') == '买入下单':
                IsWindow = win32gui.IsWindow(buyWindowHwnd)
                IsWindowEnabled = win32gui.IsWindowEnabled(buyWindowHwnd)
                IsWindowVisible = win32gui.IsWindowVisible(buyWindowHwnd)
                return IsWindow and IsWindowEnabled and IsWindowVisible
    return 0

# 通过鼠标找到当前句柄
def getHandleByFocus():
    while True:
        point = win32api.GetCursorPos()
        # print(point)
        ddd = win32gui.WindowFromPoint(point)
        stock.util.printWindowInfo(ddd)
        stock.log("句柄：" + str(ddd) + "," + str(hex(ddd)))
        if ddd == 9638090:
            handle = win32gui.FindWindowEx(ddd, 0, 'Button', None)
            stock.log("Button句柄：" + str(handle) + "," + str(hex(handle)))
        time.sleep(1)

# 下单前，检查有没有弹出“提示”弹窗，
def checkTipDialogShownBefore(hwnd):
    thread_id, process_id = win32process.GetWindowThreadProcessId(hwnd)
    windows = []
    win32gui.EnumThreadWindows(thread_id, lambda hwnd, resultList: resultList.append(hwnd), windows)
    for handle in windows:
        className = win32gui.GetClassName(handle)
        title = win32gui.GetWindowText(handle)
        if className == '#32770' and title != None and title.decode('gbk') == '提示':
            stock.log("提示窗口")
            contentHandle = win32gui.FindWindowEx(handle, 0, 'Static', None)
            contentHandle = win32gui.FindWindowEx(handle, contentHandle, 'Static', None)
            if contentHandle:
                title = win32gui.GetWindowText(contentHandle)
                if title != None:
                    stock.log("提示窗口：" + title.decode('gbk'))

            handle = win32gui.FindWindowEx(handle, 0, 'Button', None)
            if handle:
                stock.log("提示窗口：确定按钮点击")
                left, top, right, bottom = win32gui.GetWindowRect(handle)
                win32api.SetCursorPos([left + 19, top + 10])
                win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            return 1
    return 0

# 下单后，检查有没有弹出“提示”弹窗
def checkTipDialogShownAfter(hwnd, code, buyPrice):
    thread_id, process_id = win32process.GetWindowThreadProcessId(hwnd)
    windows = []
    win32gui.EnumThreadWindows(thread_id, lambda hwnd, resultList: resultList.append(hwnd), windows)
    for handle in windows:
        className = win32gui.GetClassName(handle)
        title = win32gui.GetWindowText(handle)
        if className == '#32770' and title != None and title.decode('gbk') == '提示':
            stock.log("提示窗口")

            msg = None

            contentHandle = win32gui.FindWindowEx(handle, 0, 'Static', None)
            contentHandle = win32gui.FindWindowEx(handle, contentHandle, 'Static', None)
            if contentHandle:
                title = win32gui.GetWindowText(contentHandle)
                if title != None:
                    msg = title.decode('gbk')
                    stock.log("提示窗口：" + msg)

            handle = win32gui.FindWindowEx(handle, 0, 'Button', None)
            # 委托已提交, 证券系统返回的原因:
            # 资金余额不足
            # 委托已提交,合同号是771786
            if handle:
                stock.log("提示窗口：确定按钮点击")
                left, top, right, bottom = win32gui.GetWindowRect(handle)
                win32api.SetCursorPos([left + 19, top + 10])
                win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)

                if '合同号是' in msg:
                    order = re.findall("\d+", msg)[0]
                    orderOperator.saveSuccessOrder(order, code, buyPrice)
                    return 1

                return 2

    stock.log("提示窗口未显示")
    return 0

# 获取撤单窗口句柄
def getQuitWindowHandle(hwnd):
    for index in range(7):
        window = stock.util.find_subHandle(hwnd,
                                           [
                                                           ('AfxFrameOrView42', 0),  # 80a3e
                                                           ('#32770', 0),  # d080c
                                                           ('Afx:10000000:3:10003:900010:1002b', 0),  #
                                                           ('AfxMDIFrame42', 0),  # a0850
                                                           ('AfxWnd42', 1),  # 1e06b8
                                                           ('#32770', index)  # 1f0778
                                                       ])
        if window:
            btnHandle = win32gui.FindWindowEx(window, 0, 'Button', None)
            title = win32gui.GetWindowText(btnHandle)
            if title != None and title.decode('gbk') == '撤 单':
                return window
    return 0

def closeNotepad():
    notePad = win32gui.FindWindow('Notepad', None)
    if notePad:
        stock.log("已经打开了notepad")
        win32gui.PostMessage(notePad, win32con.WM_CLOSE, 0, 0)
        stock.log("关闭notepad")
        return 1
    return 0

# 检查有没有弹出“输出”弹窗，撤单和成交输出都是第八个button
def checkOutputTipDialogShown(hwnd):
    thread_id, process_id = win32process.GetWindowThreadProcessId(hwnd)
    windows = []
    win32gui.EnumThreadWindows(thread_id, lambda hwnd, resultList: resultList.append(hwnd), windows)
    for handle in windows:
        className = win32gui.GetClassName(handle)
        title = win32gui.GetWindowText(handle)
        if className == '#32770' and title != None and title.decode('gbk') == '输出':
            stock.log("输出提示窗口")

            # 点击 输出到excel
            # btn = stock_util.find_idxSubHandle(handle, 'Button', 2)
            # if btn:
            #     log("提示窗口：excel点击")
            #     left, top, right, bottom = win32gui.GetWindowRect(btn)
            #     win32api.SetCursorPos([left + 5, top + 5])
            #     win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            # else:
            #     log("未找到excel按钮")

            btn = stock.util.find_idxSubHandle(handle, 'Button', 8)
            if btn:
                stock.log("提示窗口：确定按钮点击")
                win32gui.SendMessage(btn, win32con.WM_LBUTTONDOWN, win32con.MK_LBUTTON, 0)
                win32gui.SendMessage(btn, win32con.WM_LBUTTONUP, win32con.MK_LBUTTON, 0)
                while True:
                    if closeNotepad():
                        break
                    time.sleep(0.001)
            else:
                stock.log("未找到确定按钮点击")
            return 1
    return 0


# 成交和撤单窗口，控件列表完全一致，区分有点困难, 是按照软件启动时的顺序决定的，先启动成交，那就是成交
def clickOutputQuitList(hwnd):
    window = getQuitWindowHandle(hwnd)
    outputBtn = stock.util.find_idxSubHandle(window, 'Button', 7)
    if outputBtn:
        stock.log("找到了.撤单-输出.控件")
        win32gui.SendMessage(outputBtn, win32con.WM_LBUTTONDOWN, win32con.MK_LBUTTON, 0)
        win32gui.SendMessage(outputBtn, win32con.WM_LBUTTONUP, win32con.MK_LBUTTON, 0)
        time.sleep(0.01)
        while True:
            if checkOutputTipDialogShown(hwnd):
                break
            else:
                win32gui.SendMessage(outputBtn, win32con.WM_LBUTTONDOWN, win32con.MK_LBUTTON, 0)
                win32gui.SendMessage(outputBtn, win32con.WM_LBUTTONUP, win32con.MK_LBUTTON, 0)

    else:
        stock.log("未找到.撤单-输出.控件")


# 获取持仓窗口句柄
def getOwnWindowHandle(hwnd):
    for index in range(7):
        window = stock.util.find_subHandle(hwnd,
                                           [
                                                           ('AfxFrameOrView42', 0),  # 80a3e
                                                           ('#32770', 0),  # d080c
                                                           ('Afx:10000000:3:10003:900010:1002b', 0),  #
                                                           ('AfxMDIFrame42', 0),  # a0850
                                                           ('AfxWnd42', 1),  # 1e06b8
                                                           ('#32770', index)  # 1f0778
                                                       ])
        if window:
            btnHandle = win32gui.FindWindowEx(window, 0, 'Button', None)
            title = win32gui.GetWindowText(btnHandle)
            if title != None and title.decode('gbk') == '卖出股票':
                return window
    return 0

# 点击撤单菜单
def clickQuitBar(hwnd):
    # []数组最后一个元素，即就是目标窗体类名，所在的索引(相同类名的集合中的索引，并非父窗口下的索引)  1F0778
    buyBar = stock.util.find_subHandle(hwnd,
                                       [
                                           ('AfxFrameOrView42', 0),  # 80a3e
                                           ('#32770', 0),  # d080c
                                           ('Afx:10000000:3:10003:900010:1002b', 0),  # 907a2
                                           ('AfxMDIFrame42', 0),  # a0850
                                           ('AfxWnd42', 1),  # 1e06b8
                                           ('MHPDockBar', 0),  # 7ff022e
                                           ('MHPToolBar', 0)  # 31c0722
                                       ])
    if buyBar > 0:
        left, top, right, bottom = win32gui.GetWindowRect(buyBar)
        # 买入按钮 38*20 , 俩个按钮间隔6
        win32api.SetCursorPos([left + 96, top + 10])
        win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        stock.log("点击.顶部菜单项-撤单.控件")
    else:
        stock.log("未找到.顶部菜单项-撤单.控件")

# 点击持仓
def clickOwnBar(hwnd):
    # []数组最后一个元素，即就是目标窗体类名，所在的索引(相同类名的集合中的索引，并非父窗口下的索引)  1F0778
    buyBar = stock.util.find_subHandle(hwnd,
                                       [
                                           ('AfxFrameOrView42', 0),  # 80a3e
                                           ('#32770', 0),  # d080c
                                           ('Afx:10000000:3:10003:900010:1002b', 0),  # 907a2
                                           ('AfxMDIFrame42', 0),  # a0850
                                           ('AfxWnd42', 1),  # 1e06b8
                                           ('MHPDockBar', 0),  # 7ff022e
                                           ('MHPToolBar', 0)  # 31c0722
                                       ])
    if buyBar > 0:
        left, top, right, bottom = win32gui.GetWindowRect(buyBar)
        # 买入按钮 38*20 , 俩个按钮间隔6
        win32api.SetCursorPos([left + 166, top + 10])
        win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        stock.log("点击.顶部菜单项-持仓.控件")
    else:
        stock.log("未找到.顶部菜单项-持仓.控件")

if __name__ == '__main__':
    curr_time = datetime.datetime.now()
    stock.log.setTag("mouse")

    # 找到通达信窗口
    # hwnd = win32gui.FindWindow('Afx:400000:b:10003:6:1146010b', None) 类名启动后会变
    windowTitle = '通达信网上交易V6 杭州营业部 曾蕾'.encode('gbk')
    hwnd = win32gui.FindWindow(None, windowTitle)
    if hwnd > 0:
        win32gui.ShowWindow(hwnd, win32con.SW_SHOWNOACTIVATE)
        win32gui.SetActiveWindow(hwnd)
        win32gui.SetForegroundWindow(hwnd)

        # '提示'对话框是否显示
        checkTipDialogShownBefore(hwnd)

        flag = 0
        if isBuyWindowVisible(hwnd):
            stock.log('买入窗口已聚焦')
            # 证券代码清空
            setEditCodeFocus(hwnd)
            flag = 0
        else:
            stock.log('买入窗口未聚焦')
            # 点击菜单栏-买入，证券代码自动聚焦
            clickBuyBar(hwnd)
            flag = 1

        # 输出买入数量  上海1手 = 深圳10张
        setEditCount(hwnd, '1', flag)

        code = '113017'
        pyautogui.typewrite(code)
        stock.log("输入证券代码:" + code)

        # 买入价格，可以不用手动设置，填写完证券代码后会自动显示当前买一卖一价格
        buyPrice = '100'
        setEditPrice(hwnd, buyPrice)

        # 点击买入下单
        clickBuyBtn(hwnd)

        # 检测是否有不合法的提示弹窗弹出

        stock.log('执行下单后的检测')
        # while True:
        #     result = checkTipDialogShownAfter(hwnd, code, buyPrice)
        #     if result:
        #         break
        #     else:
        #         time.sleep(0.01)
    else:
        stock.log("通达信未启动!")

    curr_time2 = datetime.datetime.now()
    stock.log("运行完毕:" + str(curr_time2 - curr_time))
