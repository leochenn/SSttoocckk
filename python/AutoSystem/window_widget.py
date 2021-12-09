# -*- coding: utf-8 -*-
import time

import pyautogui
import win32api
import win32con
import win32gui
import win32process

import log

# 通达信窗体和控件句柄管理
# 买入按钮 38*20

import util

# 买入按钮 38*20 , 俩个按钮间隔6

class WindowWidget:
    # 公司和家里的通达信版本不同 有个控件类名不同
    frameIdHome = 'Afx:10000000:3:10003:1900010:10027'
    frameIdOffice = 'Afx:10000000:3:10003:900010:1002b'
    frameId = frameIdOffice

    def __init__(self):
        self.findWindow()
        self.findAllControl()

    # 找到通达信窗口
    def findWindow(self):
        # hwnd = win32gui.FindWindow('Afx:400000:b:10003:6:1146010b', None) 类名启动后会变
        window_title = '通达信网上交易V6 杭州营业部 曾蕾'
        self.hwnd = win32gui.FindWindow(None, window_title)
        if not self.hwnd:
            raise Exception('未找到通达信')

    # 找到所有的控件并赋值
    def findAllControl(self):
        findCancelTab = None
        for index in range(7):
            tabHwnd = self.getTabHwnd(index)
            if tabHwnd:
                btnHandle = win32gui.FindWindowEx(tabHwnd, 0, 'Button', None)
                text = win32gui.GetWindowText(btnHandle)
                if text == '买入下单':
                    self.buyTabHwnd = tabHwnd
                    self.buyTabBuyBtn = btnHandle
                    self.buyTabCode = win32gui.FindWindowEx(tabHwnd, 0, 'AfxWnd42', None)
                    self.buyTabCount = util.find_idxSubHandle(tabHwnd, 'Edit', 4)
                    self.buyTabPrice = util.find_idxSubHandle(tabHwnd, 'Edit', 1)
                elif text == '卖出下单':
                    self.sellTabHwnd = tabHwnd
                    self.sellTabSellBtn = btnHandle
                    self.sellTabCode = win32gui.FindWindowEx(tabHwnd, 0, 'AfxWnd42', None)
                    self.sellTabCount = util.find_idxSubHandle(tabHwnd, 'Edit', 4)
                    self.sellTabPrice = util.find_idxSubHandle(tabHwnd, 'Edit', 1)
                elif text == '撤 单' and findCancelTab is None:
                    findCancelTab = 1
                    self.cancelTab = tabHwnd
                    self.cancelTabCancelBtn = btnHandle
                    self.cancelTabRefresh = win32gui.FindWindowEx(tabHwnd, btnHandle, 'Button', None)
                    self.cancelTabSysListView32 = win32gui.FindWindowEx(tabHwnd, 0, 'SysListView32', None)
                    self.cancelTabOutputBtn = util.find_idxSubHandle(tabHwnd, 'Button', 7)
                elif text == '撤 单' and findCancelTab:
                    self.dealTab = tabHwnd

        self.menuBar = util.find_subHandle(self.hwnd,
                                           [
                                               ('AfxFrameOrView42', 0),  # 80a3e
                                               ('#32770', 0),  # d080c
                                               (self.frameId, 0),  # 907a2
                                               ('AfxMDIFrame42', 0),  # a0850
                                               ('AfxWnd42', 1),  # 1e06b8
                                               ('MHPDockBar', 0),  # 7ff022e
                                               ('MHPToolBar', 0)  # 31c0722
                                           ])

        WindowWidget.checkControlValid(self.buyTabHwnd, self.buyTabBuyBtn, self.buyTabCode, self.buyTabCount,
                                       self.buyTabPrice)
        WindowWidget.checkControlValid(self.sellTabHwnd, self.sellTabSellBtn, self.sellTabCode, self.sellTabCount,
                                       self.sellTabPrice)
        WindowWidget.checkControlValid(self.cancelTab, self.cancelTabCancelBtn, self.cancelTabRefresh,
                                       self.cancelTabSysListView32, self.cancelTabOutputBtn)
        WindowWidget.checkControlValid(self.menuBar)

    # 根据索引获取Tab的句柄
    def getTabHwnd(self, index):
        return util.find_subHandle(self.hwnd,
                                   [
                                       ('AfxFrameOrView42', 0),  # 80a3e
                                       ('#32770', 0),  # d080c
                                       (self.frameId, 0),  #
                                       ('AfxMDIFrame42', 0),  # a0850
                                       ('AfxWnd42', 1),  # 1e06b8
                                       ('#32770', index)  # 1f0778
                                   ])

    # 锁定窗口的句柄
    def getLockDlgHwnd(self):
        return util.find_subHandle(self.hwnd,
                                   [
                                       ('AfxFrameOrView42', 0),  # 80a3e
                                       ('#32770', 0),  # d080c
                                       ('#32770', 0)  # 40a6c
                                   ])

    # 锁定窗口密码控件的句柄
    def getLockDlgPwdHwnd(self, hwnd):
        return util.find_idxSubHandle(hwnd, 'AfxWnd42', 0)

    # 买入卖出前如果有对话框弹出则进行关闭
    def closeTipDlgBeforeOperator(self):
        dlg_hwnd = self.getTipDlgHwnd()
        if not dlg_hwnd:
            return

        log.info('提示对话框遮挡')

        content = WindowWidget.getTipDlgContent(dlg_hwnd)
        if content:
            log.info("对话框提示内容：" + content)

        btn_hwnd = WindowWidget.getTipDlgBtn(dlg_hwnd)
        if btn_hwnd:
            log.info("关闭对话框")
            WindowWidget.clickBtn(btn_hwnd)

    # "提示"对话框句柄
    def getTipDlgHwnd(self):
        return self.getDlgHwndMatchTitle('提示')

    # 通达信软件前置
    def bringToFront(self):
        win32gui.ShowWindow(self.hwnd, win32con.SW_SHOWNOACTIVATE)
        win32gui.SetActiveWindow(self.hwnd)
        win32gui.SetForegroundWindow(self.hwnd)

    # 是否锁定
    def checkLocked(self):
        lockDlgHwnd = self.getLockDlgHwnd()
        if not lockDlgHwnd:
            return 0

        pwdHwnd = self.getLockDlgPwdHwnd(lockDlgHwnd)
        if not pwdHwnd:
            raise Exception('锁定窗口密码控件异常')

        log.info('窗口已锁定')
        WindowWidget.clickBtn(pwdHwnd)
        time.sleep(0.001)

        pyautogui.typewrite('')
        pyautogui.press('enter')

        time.sleep(0.005)

        lockDlgHwnd = self.getLockDlgHwnd()
        if lockDlgHwnd:
            raise Exception('锁定窗口解锁异常')

        log.info('窗口解锁成功')
        return 1

    # 提交委托之后检查对话框弹出
    def getTipDlgHwndAfterCommit(self):
        count = 0
        hwnd = None
        for index in range(30):
            hwnd = self.getTipDlgHwnd()
            if hwnd:
                log.d('已弹出委托对话框', count)
                break
            else:
                count = count + 1
                time.sleep(0.001)
        return hwnd

    # 将买入tab前置
    def checkBuyTabFront(self):
        count = 0
        WindowWidget.clickBtn(self.menuBar)
        while True:
            if self.isTabVisible(self.buyTabHwnd):
                log.d('买入窗口已进行前置', count)
                break
            count = count + 1
            time.sleep(0.001)

    # "输出"对话框句柄
    def getOutputDlgHwnd(self):
        return self.getDlgHwndMatchTitle('输出')

    # 根据标题匹配弹出的对话框
    def getDlgHwndMatchTitle(self, key):
        thread_id, process_id = win32process.GetWindowThreadProcessId(self.hwnd)
        windows = []
        win32gui.EnumThreadWindows(thread_id, lambda hwndTmp, resultList: resultList.append(hwndTmp), windows)
        for handle in windows:
            class_name = win32gui.GetClassName(handle)
            title = win32gui.GetWindowText(handle)
            if class_name == '#32770' and title == key:
                return handle

    # "提示"对话框内容
    @staticmethod
    def getTipDlgContent(dlg_hwnd):
        content_hwnd = win32gui.FindWindowEx(dlg_hwnd, 0, 'Static', None)
        content_hwnd = win32gui.FindWindowEx(dlg_hwnd, content_hwnd, 'Static', None)
        if content_hwnd:
            return win32gui.GetWindowText(content_hwnd)
        else:
            log.info('getTipDlgContent异常')

    # "提示"对话框确定按钮句柄
    @staticmethod
    def getTipDlgBtn(dlg_hwnd):
        return win32gui.FindWindowEx(dlg_hwnd, 0, 'Button', None)

    # 在窗口不前置时，点击也可以生效，会将窗口前置19-10
    @staticmethod
    def clickBtn(hwnd, left_add=19, top_add=10):
        left, top, right, bottom = win32gui.GetWindowRect(hwnd)
        win32api.SetCursorPos([left + left_add, top + top_add])
        win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)

    # 在窗口不前置时，点击无法生效，不会将窗口前置
    # 该点击方案的问题，点击买入下单，弹出委托失败窗口时，WM_LBUTTONUP事件没有执行,会阻断停在这里，等关闭委托失败窗口后，才会恢复继续往下执行
    # 意味着点击是分成了俩步，如果中间被打断，则会阻断，不如另一个点击方案
    # 凡是点击后可能会弹窗的，则不应该使用该点击方法
    @staticmethod
    def clickBtn2(hwnd):
        win32gui.SendMessage(hwnd, win32con.WM_LBUTTONDOWN, win32con.MK_LBUTTON, 0)
        win32gui.SendMessage(hwnd, win32con.WM_LBUTTONUP, win32con.MK_LBUTTON, 0)

    @staticmethod
    def isTabVisible(hwnd):
        IsWindow = win32gui.IsWindow(hwnd)
        IsWindowEnabled = win32gui.IsWindowEnabled(hwnd)
        IsWindowVisible = win32gui.IsWindowVisible(hwnd)
        return IsWindow and IsWindowEnabled and IsWindowVisible

    @staticmethod
    def checkControlValid(*ctrl):
        for c in ctrl:
            if c is None or c == 0:
                raise Exception('通达信控件异常')

    @staticmethod
    def getEditContent(hwnd):
        len = win32gui.SendMessage(hwnd, win32con.WM_GETTEXTLENGTH)
        str_buffer = win32gui.PyMakeBuffer(len)
        win32gui.SendMessage(hwnd, win32con.WM_GETTEXT, len, str_buffer)
        address, length = win32gui.PyGetBufferAddressAndLen(str_buffer)
        return win32gui.PyGetString(address, length)

    @staticmethod
    def setEditText(hwnd, content):
        win32api.SendMessage(hwnd, win32con.WM_SETTEXT, 0, content)

    '''
    以下方法是操作特定控件
    '''

    @staticmethod
    def focusEditCodeAndClear(hwnd):
        # 此处的left + 40 是固定值，让光标聚焦于证券代码最末端，方便执行删除操作
        WindowWidget.clickBtn(hwnd, 40, 10)
        time.sleep(0.001)
        pyautogui.press(["backspace", "backspace", "backspace", "backspace", "backspace", "backspace"])

    @staticmethod
    def setEditCountTwice(hwnd, count):
        clearCount = 0
        WindowWidget.setEditText(hwnd, count)
        while True:
            content = WindowWidget.getEditContent(hwnd)
            if content:
                if clearCount == 2:
                    log.d('设置数量', content)
                    break
                log.d('未清空数量')
                time.sleep(0.001)
            else:
                log.d('清空数量')
                clearCount = clearCount + 1
                WindowWidget.setEditText(hwnd, count)

    # 实测买入、卖出下面执行的流程可能会不同，但是都能实现所需的效果
    # 当代码控件输入后，正常执行价格会自动设置，价格应该是能读到的，如果没读到则意味着被清空了，则需要重新设置
    # 而如果没有被清空，而价格也没读到的时候，此时价格会被设置成代码，但是该方法调用后
    # 会重新设置价格，异曲同工
    @staticmethod
    def setSellEditCodeTwice(priceHwnd, buyCode):
        clearCount = 0
        pyautogui.typewrite(buyCode)
        for index in range(20):
            content = WindowWidget.getEditContent(priceHwnd)
            if content:
                if clearCount == 1:
                    log.d('设置价格', content)
                    break
                log.d('未清空价格')
                time.sleep(0.001)
            else:
                log.d('清空价格')
                clearCount = clearCount + 1
                pyautogui.typewrite(buyCode)