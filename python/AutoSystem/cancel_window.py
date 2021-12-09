# -*- coding: utf-8 -*-
import os
import time

import commctrl
import win32gui

import util
import log
from window_widget import WindowWidget

class CancelWindow:

    def __init__(self, tdxHandle, TdxWindow):
        self.tdxHandle = tdxHandle
        self.tdxWindow = TdxWindow

    def init(self):
        window = self.tdxWindow.getCancelWindowHandle()
        if not window:
            raise Exception('未没有获取到撤单tab')

        self.refresh = util.find_idxSubHandle(window, 'Button', 1)
        if not self.refresh:
            raise Exception('未找到.刷新控件.控件')

        self.SysListView32 = util.find_idxSubHandle(window, 'SysListView32', 0)
        if not self.SysListView32:
            raise Exception('未找到.SysListView32.控件')

        self.initCount = win32gui.SendMessage(self.SysListView32, commctrl.LVM_GETITEMCOUNT, 0, 0)
        log.info('初始撤单列表数量:' + str(self.initCount))

    def switchToCancelWindow(self):
        print()

    def getListCount(self):
        count = win32gui.SendMessage(self.SysListView32, commctrl.LVM_GETITEMCOUNT, 0, 0)
        log.info('获取撤单列表数量:' + str(count))

        WindowWidget.clickBtn2(self.refresh)
        time.sleep(0.001)
        WindowWidget.clickBtn2(self.refresh)
        time.sleep(0.002)

        count = win32gui.SendMessage(self.SysListView32, commctrl.LVM_GETITEMCOUNT, 0, 0)
        log.info('刷新后撤单列表数量:' + str(count))