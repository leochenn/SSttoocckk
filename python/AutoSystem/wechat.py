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

if __name__ == '__main__':
    log.setTag("xxx")
    chlog.setTag("xxx")
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
