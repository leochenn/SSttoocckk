# -*- coding: utf-8 -*-
import win32api
import win32con
import win32gui
import win32process

import log

# 通达信窗体和控件句柄管理
# 买入按钮 38*20

import util


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
                                       self.cancelTabSysListView32)
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

    # 锁定窗口
    def getLockDlgHwnd(self):
        return util.find_subHandle(self.hwnd,
                                   [
                                       ('AfxFrameOrView42', 0),  # 80a3e
                                       ('#32770', 0),  # d080c
                                       ('#32770', 0)  # 40a6c
                                   ])

    # 锁定窗口密码控件
    def getLockDlgPwdHwnd(self, hwnd):
        return util.find_idxSubHandle(hwnd, 'AfxWnd42', 0)

    # "提示"对话框句柄
    def getTipDlgHwnd(self):
        return self.getDlgHwndMatchTitle('提示')

    # "提示"对话框内容
    @staticmethod
    def getTipDlgContent(dlg_hwnd):
        content_hwnd = win32gui.FindWindowEx(dlg_hwnd, 0, 'Static', None)
        content_hwnd = win32gui.FindWindowEx(dlg_hwnd, content_hwnd, 'Static', None)
        if content_hwnd:
            return win32gui.GetWindowText(content_hwnd)
        else:
            log.info('getTipDlgContent异常')

    # "提示"对话框确定按钮
    @staticmethod
    def getTipDlgBtn(dlg_hwnd):
        return win32gui.FindWindowEx(dlg_hwnd, 0, 'Button', None)

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

    # 在窗口不前置时，点击也可以生效，会将窗口前置
    @staticmethod
    def clickBtn(hwnd, left_add, top_add):
        left, top, right, bottom = win32gui.GetWindowRect(hwnd)
        win32api.SetCursorPos([left + left_add, top + top_add])
        win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)

    # 在窗口不前置时，点击无法生效，不会将窗口前置
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
