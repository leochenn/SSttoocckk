#!/usr/bin/python
# -*- coding: utf-8 -*-

# coding:utf-8
import time

import win32con
from openpyxl import load_workbook
import chlog
import win32com.client as win32
from datetime import datetime
import win32gui

if __name__ == '__main__':
    chlog.setTag("chtag")
    # 获取当前活动窗口句柄
    time.sleep(3)
    active_window = win32gui.GetForegroundWindow()
    chlog.d('active_window', active_window)
    target_window = win32gui.FindWindow(None, "20240322 撤单查询.xls - WPS Office")  # 根据窗口标题或类名找到目标窗口的句柄
    chlog.d('target_window', target_window)
    if target_window == active_window:
        print("目标窗口是当前激活/前置窗口")
        # 关闭当前活动窗口
        win32gui.PostMessage(active_window, win32con.WM_CLOSE, 0, 0)
    else:
        print("目标窗口不是当前激活/前置窗口")
