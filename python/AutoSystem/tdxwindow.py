# -*- coding: utf-8 -*-
import time

import pyautogui
import win32api
import win32con
import win32gui
import win32process

import util
import log

#操作通达信窗体和控件

class TdxWindow:

    tdxLockPwd = ''

    frameIdHome = 'Afx:10000000:3:10003:1900010:10027'
    frameIdOffice = 'Afx:10000000:3:10003:900010:1002b'
    frameId = frameIdOffice

    def __init__(self, tdxHandle):
        self.tdxHandle = tdxHandle

    # 通达信窗口前置
    def bringToFront(self):
        win32gui.ShowWindow(self.tdxHandle, win32con.SW_SHOWNOACTIVATE)
        win32gui.SetActiveWindow(self.tdxHandle)
        win32gui.SetForegroundWindow(self.tdxHandle)

    # 是否处在锁定状态，是则进行密码解锁
    def checkWindowLocked(self):
        lockDialoHandle = util.find_subHandle(self.tdxHandle,
                                       [
                                           ('AfxFrameOrView42', 0),  # 80a3e
                                           ('#32770', 0),  # d080c
                                           ('#32770', 0)  # 40a6c
                                       ])
        if not lockDialoHandle:
            return 0

        pwdEditHandle = util.find_idxSubHandle(lockDialoHandle, 'AfxWnd42', 0)
        if not pwdEditHandle:
            raise Exception('锁定窗口解锁异常')

        log.info('窗口已锁定')
        left, top, right, bottom = win32gui.GetWindowRect(pwdEditHandle)
        # 买入按钮 38*20
        win32api.SetCursorPos([left + 40, top + 10])
        win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        time.sleep(0.001)

        pyautogui.typewrite(self.tdxLockPwd)
        pyautogui.press('enter')

        lockDialoHandle = util.find_subHandle(self.tdxHandle,
                                              [
                                                  ('AfxFrameOrView42', 0),  # 80a3e
                                                  ('#32770', 0),  # d080c
                                                  ('#32770', 0)  # 40a6c
                                              ])
        if lockDialoHandle:
            raise Exception('锁定窗口解锁异常')

        log.info('窗口解锁成功')
        return 1

    # 是否有提示弹窗遮挡，是否需要点击
    def checkTipDialogShown(self, dismiss):
        tipDialogHandle = self.getTipDialogHanlde()
        if not tipDialogHandle:
            return

        log.info('提示窗口遮挡')

        contentHandle = win32gui.FindWindowEx(tipDialogHandle, 0, 'Static', None)
        contentHandle = win32gui.FindWindowEx(tipDialogHandle, contentHandle, 'Static', None)
        if contentHandle:
            title = win32gui.GetWindowText(contentHandle)
            if title:
                log.info("提示窗口内容：" + title.decode('gbk'))

        if not dismiss:
            return

        btnHandle = win32gui.FindWindowEx(tipDialogHandle, 0, 'Button', None)
        if btnHandle:
            log.info("关闭提示窗口，点击确定")
            self.clickBtn(btnHandle)

    # 获取"提示"弹窗句柄
    def getTipDialogHanlde(self):
        thread_id, process_id = win32process.GetWindowThreadProcessId(self.tdxHandle)
        windows = []
        win32gui.EnumThreadWindows(thread_id, lambda hwndTmp, resultList: resultList.append(hwndTmp), windows)
        for handle in windows:
            className = win32gui.GetClassName(handle)
            title = win32gui.GetWindowText(handle)
            if className == '#32770' and title != None and title == '提示':
                return handle
        return 0

    # 在窗口不前置时，点击也可以生效，会将窗口前置
    def clickBtn(self, hwnd):
        left, top, right, bottom = win32gui.GetWindowRect(hwnd)
        win32api.SetCursorPos([left + 19, top + 10])
        win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)

    # 在窗口不前置时，点击无法生效，不会将窗口前置
    def clickBtn2(self, hwnd):
        win32gui.SendMessage(hwnd, win32con.WM_LBUTTONDOWN, win32con.MK_LBUTTON, 0)
        win32gui.SendMessage(hwnd, win32con.WM_LBUTTONUP, win32con.MK_LBUTTON, 0)

    #
    # 买入相关
    #

    # 是否已经显示买入tab窗口
    def isBuyWindowVisible(self):
        for index in range(7):
            buyWindowHwnd = util.find_subHandle(self.tdxHandle,
                                                [
                                                    ('AfxFrameOrView42', 0),  # 80a3e
                                                    ('#32770', 0),  # d080c
                                                    (self.frameId, 0),  #
                                                    ('AfxMDIFrame42', 0),  # a0850
                                                    ('AfxWnd42', 1),  # 1e06b8
                                                    ('#32770', index)  # 1f0778
                                                ])
            if buyWindowHwnd:
                btnHandle = win32gui.FindWindowEx(buyWindowHwnd, 0, 'Button', None)
                title = win32gui.GetWindowText(btnHandle)
                if title != None and title == '买入下单':
                    IsWindow = win32gui.IsWindow(buyWindowHwnd)
                    IsWindowEnabled = win32gui.IsWindowEnabled(buyWindowHwnd)
                    IsWindowVisible = win32gui.IsWindowVisible(buyWindowHwnd)
                    return IsWindow and IsWindowEnabled and IsWindowVisible
        return 0

    def clickBuyBar(self):
        # []数组最后一个元素，即就是目标窗体类名，所在的索引(相同类名的集合中的索引，并非父窗口下的索引)  1F0778
        buyBar = util.find_subHandle(self.tdxHandle,
                                     [
                                         ('AfxFrameOrView42', 0),  # 80a3e
                                         ('#32770', 0),  # d080c
                                         (self.frameId, 0),  # 907a2
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
            log.info("点击.顶部菜单项-买入.控件")
        else:
            log.info("未找到.顶部菜单项-买入.控件")

    # 证券代码控件聚焦，并清空内容
    def setEditCodeFocus(self):
        editCode = util.find_subHandle(self.tdxHandle,
                                       [
                                           ('AfxFrameOrView42', 0),  # 80a3e
                                           ('#32770', 0),  # d080c
                                           (self.frameId, 0),  #
                                           ('AfxMDIFrame42', 0),  # a0850
                                           ('AfxWnd42', 1),  # 1e06b8
                                           ('#32770', 1),  # 1f0778
                                           ('AfxWnd42', 0)  # 40a6c
                                       ])
        if editCode > 0:
            left, top, right, bottom = win32gui.GetWindowRect(editCode)
            # 买入按钮 38*20
            # 此处的left + 40 是固定值，让光标聚焦于证券代码最末端，方便执行删除操作
            win32api.SetCursorPos([left + 40, top + 10])
            win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            time.sleep(0.001)
            pyautogui.press(["backspace", "backspace", "backspace", "backspace", "backspace", "backspace"])
        else:
            log.info("未找到.证券代码.控件")

    # 如果从其他窗口切换到买入窗口，则会清空所有的内容，但是时间不确定，所以用循环方式来实现监控
    # 如果设置了内容之后被清空俩次，则进行最后一次设置
    def setEditCount(self, count, buyWindowInvisible):
        editCount = util.find_subHandle(self.tdxHandle,
                                        [
                                            ('AfxFrameOrView42', 0),  # 80a3e
                                            ('#32770', 0),  # d080c
                                            (self.frameId, 0),  #
                                            ('AfxMDIFrame42', 0),  # a0850
                                            ('AfxWnd42', 1),  # 1e06b8
                                            ('#32770', 1),  # 1f0778
                                            ('Edit', 4)  # c07fe
                                        ])

        if editCount > 0:
            log.info("找到了.证券数量.控件")
            if buyWindowInvisible == 0:
                win32api.SendMessage(editCount, win32con.WM_SETTEXT, 0, count)
                log.info("输入证券数量：" + count)
            else:
                win32api.SendMessage(editCount, win32con.WM_SETTEXT, 0, count)
                log.info("输入证券数量：" + count)
                while True:
                    content = self.getEidtContent(editCount)
                    log.info("读取证券数量：" + content)
                    if content:
                        time.sleep(0.001)
                    else:
                        win32api.SendMessage(editCount, win32con.WM_SETTEXT, 0, count)
                        log.info("输入证券数量：" + count)

                        while True:
                            content = self.getEidtContent(editCount)
                            log.info("读取证券数量：" + content)
                            if content:
                                time.sleep(0.001)
                            else:
                                win32api.SendMessage(editCount, win32con.WM_SETTEXT, 0, count)
                                log.info("输入证券数量：" + count)
                                time.sleep(0.001)
                                content = self.getEidtContent(editCount)
                                log.info("读取证券数量：" + content)
                                if content:
                                    break

                        break
        else:
            log.info("未找到.证券数量.控件")

    def getEidtContent(self, editCount):
        len = win32gui.SendMessage(editCount, win32con.WM_GETTEXTLENGTH)
        str_buffer = win32gui.PyMakeBuffer(len)
        win32gui.SendMessage(editCount, win32con.WM_GETTEXT, len, str_buffer)
        address, length = win32gui.PyGetBufferAddressAndLen(str_buffer)
        return win32gui.PyGetString(address, length)

    def setEditPrice(self, price):
        editPrice = util.find_subHandle(self.tdxHandle,
                                        [
                                            ('AfxFrameOrView42', 0),  # 80a3e
                                            ('#32770', 0),  # d080c
                                            (self.frameId, 0),  #
                                            ('AfxMDIFrame42', 0),  # a0850
                                            ('AfxWnd42', 1),  # 1e06b8
                                            ('#32770', 1),  # 1f0778
                                            ('Edit', 1)  # c07fe
                                        ])
        if editPrice > 0:
            log.info("找到了.证券价格.控件")
            win32api.SendMessage(editPrice, win32con.WM_SETTEXT, 0, price)
            log.info("输入证券价格：" + price)

            # 获取edit控件文本
            len = win32gui.SendMessage(editPrice, win32con.WM_GETTEXTLENGTH)
            str_buffer = win32gui.PyMakeBuffer(len)
            win32gui.SendMessage(editPrice, win32con.WM_GETTEXT, len, str_buffer)
            # a = str(str_buffer[:-1])
            # a = bytes.decode(bytes(str_buffer[:-1]))
            address, length = win32gui.PyGetBufferAddressAndLen(str_buffer)
            text = win32gui.PyGetString(address, length)
            log.info("读取证券价格：" + text)
        else:
            log.info("未找到.证券价格.控件")

    def clickBuyBtn(self):
        btnBuy = util.find_subHandle(self.tdxHandle,
                                     [
                                         ('AfxFrameOrView42', 0),  # 80a3e
                                         ('#32770', 0),  # d080c
                                         (self.frameId, 0),  #
                                         ('AfxMDIFrame42', 0),  # a0850
                                         ('AfxWnd42', 1),  # 1e06b8
                                         ('#32770', 1),  # 1f0778
                                         ('Button', 0)  # 10076e
                                     ])
        if btnBuy > 0:
            log.info("买入下单.点击")
            self.clickBtn2(btnBuy)
        else:
            raise Exception('未找到.买入下单.控件')

    # 点击下单后检查委托状态，如果弹出提示窗，显示合同号，则说明下单成功，并且关闭对话框
    def checkBuyCommit(self):
        tipDialogHandle = self.getTipDialogHanlde()
        if not tipDialogHandle:
            return 0

        log.info('买入后弹出窗口')

        msg = '买入委托失败，未获取到弹窗内容'

        contentHandle = win32gui.FindWindowEx(tipDialogHandle, 0, 'Static', None)
        contentHandle = win32gui.FindWindowEx(tipDialogHandle, contentHandle, 'Static', None)
        if contentHandle:
            msg = win32gui.GetWindowText(contentHandle)

        handle = win32gui.FindWindowEx(tipDialogHandle, 0, 'Button', None)
        # 委托已提交, 证券系统返回的原因:
        # 资金余额不足
        # 委托已提交,合同号是771786
        if handle:
            if '合同号是' in msg:
                log.info("委托提交成功，点击关闭")
                self.clickBtn2(handle)
                for index in range(20):
                    tipDialogHandle = self.getTipDialogHanlde()
                    if not tipDialogHandle:
                        break
                    self.clickBtn2(handle)
                    time.sleep(0.001)

        return msg

    # 查询买入委托状态
    def checkBuyOrderState(self, orderId):
        window = self.getCancelWindowHandle()
        if not window:
            raise Exception('未没有获取到撤单tab')

        outputBtn = util.find_idxSubHandle(window, 'Button', 7)
        if not outputBtn:
            log.info('未找到.撤单-输出.控件')

        log.info('点击.撤单-输出.控件')
        outputSuccess = None
        for index in range(100):
            self.clickBtn2(outputBtn)
            time.sleep(0.001)
            if self.checkOutputTipDialogShown():
                outputSuccess = 1
                break

        if outputSuccess:
            log.info('撤单列表输出成功')

        else:
            log.info('撤单列表输出失败')

    # 获取撤单窗口句柄, 在应用启动后必须先手动切换到撤单（不能先切换到成交，不然会获取成成交tab）
    def getCancelWindowHandle(self):
        for index in range(7):
            window = util.find_subHandle(self.tdxHandle,
                                         [
                                             ('AfxFrameOrView42', 0),  # 80a3e
                                             ('#32770', 0),  # d080c
                                             (self.frameId, 0),  #
                                             ('AfxMDIFrame42', 0),  # a0850
                                             ('AfxWnd42', 1),  # 1e06b8
                                             ('#32770', index)  # 1f0778
                                         ])
            if window:
                btnHandle = win32gui.FindWindowEx(window, 0, 'Button', None)
                title = win32gui.GetWindowText(btnHandle)
                if title != None and title == '撤 单':
                    return window
        return 0

    def getOutputTipDialogHandle(self):
        thread_id, process_id = win32process.GetWindowThreadProcessId(self.tdxHandle)
        windows = []
        win32gui.EnumThreadWindows(thread_id, lambda hwnd, resultList: resultList.append(hwnd), windows)
        for handle in windows:
            className = win32gui.GetClassName(handle)
            title = win32gui.GetWindowText(handle)
            if className == '#32770' and title != None and title == '输出':
                return handle

        return 0

    def checkOutputTipDialogShown(self):
        outputTipDialogHandle = self.getOutputTipDialogHandle()
        if not outputTipDialogHandle:
            return 0

        log.info("输出窗口显示")
        # 点击 输出到excel
        # btn = stock_util.find_idxSubHandle(outputTipDialogHandle, 'Button', 2)
        # if btn:
        #     log.info("提示窗口：excel点击")
        #     left, top, right, bottom = win32gui.GetWindowRect(btn)
        #     win32api.SetCursorPos([left + 5, top + 5])
        #     win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        # else:
        #     log.info("未找到excel按钮")

        btn = util.find_idxSubHandle(outputTipDialogHandle, 'Button', 8)
        if btn:
            log.info("点击输出按钮")
            self.clickBtn2(btn)

            outputTipDialogHandle = 0
            for index in range(10):
                outputTipDialogHandle = self.getOutputTipDialogHandle()
                if not outputTipDialogHandle:
                    break

                self.clickBtn2(btn)
                time.sleep(0.001)

            if outputTipDialogHandle:
                # todo 点击窗口并未关闭
                raise Exception('关闭输出窗口异常')

            util.postCloseNotepad()
            return 1
        else:
            log.info("未找到确定按钮点击")
        return 0



