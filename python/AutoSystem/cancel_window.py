# -*- coding: utf-8 -*-
import os
import time

import commctrl
import win32api
import win32con
import win32gui

import util
import log
from window_widget import WindowWidget

# 委托成功后进入到撤单列表，进行刷新动作，获取列表行数，判断是否成交

class CancelWindow:

    def __init__(self, windowWidget):
        self.windowWidget = windowWidget
        self.SysListView32 = windowWidget.cancelTabSysListView32
        self.refresh = windowWidget.cancelTabRefresh
        self.menuBar = windowWidget.menuBar

    def getRows(self):
        return WindowWidget.getListviewRows(self.SysListView32)

    def getListCount(self):
        self.initCount = self.getRows()
        log.info('撤单列表初始数量:' + str(self.initCount))

        WindowWidget.clickBtn(self.menuBar, 96, 10)
        for index in range(100):
            if self.windowWidget.isTabVisible(self.windowWidget.cancelTab):
                break
            time.sleep(0.01)

        if not self.windowWidget.isTabVisible(self.windowWidget.cancelTab):
            raise Exception('撤单窗口未显示')

        log.info('撤单窗口显示')

        time.sleep(0.1)

        for index in range(200):
            count = self.getRows()
            log.info('数量:' + str(count))
            if count == self.initCount:
                return 1
            WindowWidget.clickBtn(self.refresh)
            time.sleep(0.2)

    '''
    暂未使用的方法
    '''

    def checkOutputTipDialogShown(self):
        outputTipDialogHandle = self.windowWidget.getOutputDlgHwnd()
        if not outputTipDialogHandle:
            return 0

        log.info("输出窗口显示")
        # 点击 输出到excel
        btn = util.find_idxSubHandle(outputTipDialogHandle, 'Button', 2)
        if btn:
            log.info("提示窗口：excel点击")
            left, top, right, bottom = win32gui.GetWindowRect(btn)
            win32api.SetCursorPos([left + 5, top + 5])
            win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        else:
            log.info("未找到excel按钮")

        btn = util.find_idxSubHandle(outputTipDialogHandle, 'Button', 8)
        if btn:
            log.info("点击输出按钮")
            time.sleep(1)
            WindowWidget.clickBtn2(btn)
            time.sleep(1)

            outputTipDialogHandle = 0
            for index in range(10):
                outputTipDialogHandle = self.windowWidget.getOutputDlgHwnd()
                if not outputTipDialogHandle:
                    break
                time.sleep(1)

                WindowWidget.clickBtn2(btn)
                time.sleep(0.001)

            if outputTipDialogHandle:
                # todo 点击窗口并未关闭
                raise Exception('关闭输出窗口异常')

            # util.postCloseNotepad()
            return 1
        else:
            log.info("未找到确定按钮点击")
        return 0

    def checkBuyOrderState(self, orderId):
        outputSuccess = None
        for index in range(2):
            WindowWidget.clickBtn2(self.windowWidget.cancelTabOutputBtn)
            time.sleep(0.001)
            if self.checkOutputTipDialogShown():
                outputSuccess = 1
                break

        if outputSuccess:
            log.info('撤单列表输出成功')

        else:
            log.info('撤单列表输出失败')

    # 委托成交一笔之后，生成一个委托编号文件，避免出现多线程问题
    # 启动一个一直运行的线上，轮询委托编号，若存在委托编号文件，则开始先读取需要查询是否成交的委托编号 列表
    def searchOrderId(self, orderId):
        path = 'C:\\Users\Administrator\\Documents\\123.txt'
        # path = path.encode('gbk')
        exist = os.path.exists(path)
        if not exist:
            raise Exception('文件不存在')

        with open(path, 'r') as fr:
            read = fr.read()
            if 'orderId' in read:
                log.info('文档中找到了委托合同号')
