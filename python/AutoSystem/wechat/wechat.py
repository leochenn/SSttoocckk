#!/usr/bin/python
# -*- coding: utf-8 -*-

# coding:utf-8
import time

import pyautogui
import pyperclip
import win32api
import win32con
import win32gui

import log
import chlog

from pywinauto import Application
from pywinauto.keyboard import send_keys
from pywinauto.findwindows import find_elements

# 方法一：通过pyautogui
def send_msg1():
    hwnd = win32gui.FindWindow('WeChatMainWndForPC', None)
    win32gui.ShowWindow(hwnd, win32con.SW_SHOWNOACTIVATE)
    win32gui.SetActiveWindow(hwnd)
    win32gui.SetForegroundWindow(hwnd)

    wechat_rect = win32gui.GetWindowRect(hwnd)

    left, top, right, bottom = win32gui.GetWindowRect(hwnd)
    chlog.e('wechat_rect', left, top, right, bottom)

    time.sleep(0.1)

    # 鼠标移到输入框
    win32api.SetCursorPos([right - 580, bottom - 170])
    # 获取当前鼠标位置作为点击的位置，或者指定具体的坐标，如 (x, y) = (100, 200)
    x, y = pyautogui.position()
    # 在当前位置执行左键单击
    pyautogui.click(x, y)

    time.sleep(0.1)
    # 清空内容
    pyautogui.press(["backspace", "backspace", "backspace", "backspace", "backspace", "backspace"])
    # 拷贝具体内容
    pyperclip.copy('1111123abc安保处')
    # pyperclip.paste()  不生效

    # 实现粘贴
    pyautogui.keyDown('ctrl')
    pyautogui.press('v')
    pyautogui.keyUp('ctrl')

    time.sleep(0.1)
    # 点击发送按钮
    win32api.SetCursorPos([right - 80, bottom - 30])
    win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)


def recursive_child_search(control):
    for child in control.children():
        print(child.window_text())
        # 递归调用自身，遍历子控件的子控件
        recursive_child_search(child)


def send_msg2():
    # 假设我们正在寻找一个按钮，通过文本内容来定位
    # elements = find_elements(title_re='微信')

    app = Application(backend="uia").connect(title_re="微信")
    dlg = app.window(title='微信')
    dlg.set_focus()

    # dlg.print_control_identifiers()

    time.sleep(0.2)

    a = '1马甲群已置顶'
    b = '文件传输助手'
    chatWin = dlg.child_window(title=a, control_type='ListItem')
    # chatWin.print_control_identifiers()

    chatWin.click_input()
    time.sleep(0.2)

    # 获取消息列表
    inputWin = dlg.child_window(title="消息", control_type="List")
    # inputWin.print_control_identifiers()

    # 遍历控件
    recursive_child_search(inputWin)

    # 退出程序
    exit(0)

    # 获取当前时间
    now = time.strftime("%Y-%m-%d--%H:%M:%S", time.localtime())
    send_keys(now)
    time.sleep(0.1)

    sendBtn = dlg.child_window(title='发送(S)', control_type='Button')
    time.sleep(0.2)

    sendBtn.click_input()


# 通过俩种不同的方式来实现pc微信发送消息，第二种更为灵活，可以获取到控件树结构
if __name__ == '__main__':
    log.setTag("xxx")
    chlog.setTag("xxx")
    send_msg2()
