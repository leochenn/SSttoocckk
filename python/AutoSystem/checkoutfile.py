# -*- coding: utf-8 -*-
import os
import time
import util
import log
from window_widget import WindowWidget

class CheckOutFile:

    def __init__(self, tdxHandle, TdxWindow):
        self.tdxHandle = tdxHandle
        self.tdxWindow = TdxWindow

    def checkBuyOrderState(self, orderId):
        window = self.tdxWindow.getCancelWindowHandle()
        if not window:
            raise Exception('未没有获取到撤单tab')

        outputBtn = util.find_idxSubHandle(window, 'Button', 7)
        if not outputBtn:
            log.info('未找到.撤单-输出.控件')

        log.info('点击.撤单-输出.控件')
        outputSuccess = None
        for index in range(100):
            WindowWidget.clickBtn2(outputBtn)
            time.sleep(0.001)
            if self.tdxWindow.checkOutputTipDialogShown():
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
