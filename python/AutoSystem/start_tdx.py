# -*- coding: utf-8 -*-

# 完成通达信的启动和账号登录
import datetime
import time

import pyautogui
import win32api
import win32con
import win32gui
import win32process

import config
import log
import util

from window_widget import WindowWidget


def getLoginHwnd():
    return win32gui.FindWindow('#32770', config.login_title)

def getTdxWindowHwnd():
    return win32gui.FindWindow(None, config.tdx_window_title)

def getDlgHwndMatchTitle(hwnd, key):
    thread_id, process_id = win32process.GetWindowThreadProcessId(hwnd)
    windows = []
    win32gui.EnumThreadWindows(thread_id, lambda hwndTmp, resultList: resultList.append(hwndTmp), windows)
    for handle in windows:
        class_name = win32gui.GetClassName(handle)
        title = win32gui.GetWindowText(handle)
        if class_name == '#32770' and title == key:
            return handle

if __name__ == '__main__':
    log.setTag('tdx')
    log.d('start')

    if getTdxWindowHwnd():
        log.d('通达信已经启动')
        exit()

    hwnd = getLoginHwnd()
    if hwnd:
        log.d('已经启动了登录界面')
    else:
        tdx_path = 'D:\software\HuaBao\Tc.exe'
        win32api.ShellExecute(0, 'open', tdx_path, '', '', 1)

        for index in range(100):
            hwnd = getLoginHwnd()
            if hwnd:
                log.d('启动了登录界面')
                break
            time.sleep(0.1)

    win32gui.ShowWindow(hwnd, win32con.SW_SHOWNOACTIVATE)
    win32gui.SetActiveWindow(hwnd)
    win32gui.SetForegroundWindow(hwnd)

    # pwd = util.find_idxSubHandle(hwnd, 'AfxWnd42', 0)
    pyautogui.typewrite(config.pwd)
    pyautogui.press('enter')

    verify = util.find_idxSubHandle(hwnd, 'Edit', 0)

    # 截图验证码区分
    # left, top, right, bottom = win32gui.GetWindowRect(verify)
    # img = ImageGrab.grab([right + 6, top + 1, right + 4 + 60, top + 19])
    # text = pytesseract.image_to_string(img)  # 训练的数字库

    time.sleep(1)
    okBtn = util.find_idxSubHandle(hwnd, 'Button', 0)

    while True:
        content = WindowWidget.getEditContent(verify)
        if len(str(content)) == 4:
            WindowWidget.clickBtn(okBtn)
            break

    for index in range(1000):
        dlgHwnd = getDlgHwndMatchTitle(hwnd, '消息标题:通知')
        if dlgHwnd:
            log.d('通知对话框弹出, 并关闭')
            closeBtn = util.find_idxSubHandle(dlgHwnd, 'Button', 2)
            WindowWidget.clickBtn(closeBtn)
            break
        else:
            time.sleep(0.01)

    mainHwnd = None
    for index in range(100):
        mainHwnd = getTdxWindowHwnd()
        if mainHwnd:
            log.d('通达信主界面已经显示')
            break
        time.sleep(0.1)

    if not mainHwnd:
        raise Exception('通达信主界面未显示')

    time.sleep(1)

    windowWidget = WindowWidget()


