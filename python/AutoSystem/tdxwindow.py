# -*- coding: utf-8 -*-
import time

import pyautogui
import win32api
import win32con
import win32gui
import win32process

import util
import log

from window_widget import WindowWidget

#操作通达信窗体和控件

class TdxWindow:

    tdxLockPwd = '813815'

    frameIdHome = 'Afx:10000000:3:10003:1900010:10027'
    frameIdOffice = 'Afx:10000000:3:10003:900010:1002b'
    frameId = frameIdOffice

    def __init__(self, windowWidget):
        self.windowWidget = windowWidget
        self.hwnd = windowWidget.hwnd

    # 通达信窗口前置
    def bringToFront(self):
        win32gui.ShowWindow(self.hwnd, win32con.SW_SHOWNOACTIVATE)
        win32gui.SetActiveWindow(self.hwnd)
        win32gui.SetForegroundWindow(self.hwnd)

    # 是否处在锁定状态，是则进行密码解锁
    def checkWindowLocked(self):
        lockDlgHwnd = self.windowWidget.getLockDlgHwnd()
        if not lockDlgHwnd:
            return 0

        pwdHwnd = self.windowWidget.getLockDlgPwdHwnd(lockDlgHwnd)
        if not pwdHwnd:
            raise Exception('锁定窗口密码控件异常')

        log.info('窗口已锁定')
        WindowWidget.clickBtn(pwdHwnd, 19, 10)
        time.sleep(0.001)

        pyautogui.typewrite(self.tdxLockPwd)
        pyautogui.press('enter')

        lockDlgHwnd = self.windowWidget.getLockDlgHwnd()
        if lockDlgHwnd:
            raise Exception('锁定窗口解锁异常')

        log.info('窗口解锁成功')
        return 1

    # 是否有提示弹窗遮挡，是否需要点击
    def checkTipDialogShown(self):
        dlg_hwnd = self.windowWidget.getTipDlgHwnd()
        if not dlg_hwnd:
            return

        log.info('提示窗口遮挡')

        content = WindowWidget.getTipDlgContent(dlg_hwnd)
        if content:
            log.info("提示窗口内容：" + content)

        btn_hwnd = WindowWidget.getTipDlgBtn(dlg_hwnd)
        if btn_hwnd:
            log.info("关闭提示窗口，点击确定")
            WindowWidget.clickBtn(btn_hwnd, 19, 10)

    # 证券代码控件聚焦，并清空内容
    def setEditCodeFocus(self):
        # 此处的left + 40 是固定值，让光标聚焦于证券代码最末端，方便执行删除操作
        WindowWidget.clickBtn(self.windowWidget.buyTabCode, 40, 10)
        time.sleep(0.001)
        pyautogui.press(["backspace", "backspace", "backspace", "backspace", "backspace", "backspace"])

    # 1设置买入数量,这里有先后顺序关系，必须等买入数量先成功输入，不被清空才输入代码，
    # 因为代码控件无法读取，无法确定是否输入成功
    # 2如果从其他窗口切换到买入窗口，则会清空所有的内容，但是时间不确定，所以用循环方式来实现监控
    # 如果设置了内容之后被清空俩次，则进行最后一次设置
    def setEditCountTwice(self, count):
        clearCount = 0
        countEditHwnd = self.windowWidget.buyTabCount
        WindowWidget.setEditText(countEditHwnd, count)

        while True:
            content = WindowWidget.getEditContent(countEditHwnd)
            if content:
                if clearCount == 2:
                    break
                time.sleep(0.001)
            else:
                clearCount = clearCount + 1
                WindowWidget.setEditText(countEditHwnd, count)

    # 点击下单后检查委托状态，如果弹出提示窗，显示合同号，则说明下单成功，并且关闭对话框
    def checkBuyCommit(self):
        tipDialogHandle = self.windowWidget.getTipDlgHwnd()
        if not tipDialogHandle:
            return 0

        log.info('买入后弹出窗口')
        msg = WindowWidget.getTipDlgContent(tipDialogHandle)
        if msg is None:
            msg = '买入委托失败，未获取到弹窗内容'
        else:
            handle = WindowWidget.getTipDlgBtn(tipDialogHandle)
            # 委托已提交, 证券系统返回的原因:
            # 资金余额不足
            # 委托已提交,合同号是771786
            if handle:
                if '合同号是' in msg:
                    log.info("委托提交成功，点击关闭")
                    WindowWidget.clickBtn2(handle)
                    for index in range(20):
                        tipDialogHandle = self.windowWidget.getTipDlgHwnd()
                        if not tipDialogHandle:
                            break
                        WindowWidget.clickBtn2(handle)
                        time.sleep(0.001)

        return msg

    #  通达信设置买入委托成功不弹窗时调用该方法检查失败的情况
    def checkBuyCommitWithoutSuccessDlg(self):
        msg = None
        for index in range(10):
            tipDialogHandle = self.windowWidget.getTipDlgHwnd()
            if not tipDialogHandle:
                log.d('未监测到对话框')
                time.sleep(0.001)
            else:
                msg = WindowWidget.getTipDlgContent(tipDialogHandle)
                log.d('买入失败提示', msg)
                break

        return msg

    # 获取撤单窗口句柄, 在应用启动后必须先手动切换到撤单（不能先切换到成交，不然会获取成成交tab）
    def getCancelWindowHandle(self):
        for index in range(7):
            window = util.find_subHandle(self.hwnd,
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

    def checkOutputTipDialogShown(self):
        outputTipDialogHandle = self.windowWidget.getOutputDlgHwnd()
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
            WindowWidget.clickBtn2(btn)

            outputTipDialogHandle = 0
            for index in range(10):
                outputTipDialogHandle = self.windowWidget.getOutputDlgHwnd()
                if not outputTipDialogHandle:
                    break

                WindowWidget.clickBtn2(btn)
                time.sleep(0.001)

            if outputTipDialogHandle:
                # todo 点击窗口并未关闭
                raise Exception('关闭输出窗口异常')

            util.postCloseNotepad()
            return 1
        else:
            log.info("未找到确定按钮点击")
        return 0



