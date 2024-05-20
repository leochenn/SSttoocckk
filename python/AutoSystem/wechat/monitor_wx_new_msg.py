#!/usr/bin/python
# -*- coding: utf-8 -*-
import threading
# coding:utf-8
import time

import pyautogui
import pyperclip
import win32api
import win32con
import win32gui
from flask import  Flask

import log
import chlog

from pywinauto import Application
from pywinauto.findwindows import  ElementNotFoundError


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


def condition_is_list_item(control):
    return control.element_info.control_type == "ListItem"


def check_new_msg(dlg):

    # 当窗口处在后台也能正确读取，不需要聚焦
    # dlg.set_focus()

    # 在执行监听前，若已经选择了监听的会话，则不需要执行会话点击，也就不需要将微信窗口前置
    # chatWin = dlg.child_window(title='1马甲群已置顶', control_type='ListItem')
    # chatWin.click_input()

    # 获取消息列表
    inputWin = dlg.child_window(title="消息", control_type="List")

    # matching_children = [child for child in inputWin.children() if condition_is_list_item(child)]
    matching_children = inputWin.children(control_type="ListItem")

    # 获取最后一个消息
    size = len(matching_children) - 1
    item = matching_children[size]

    try:
        lastItem = item.children()[0].children(title="weshao", control_type="Button")
        if lastItem:
            print('最后一条消息Leo发的:' + item.window_text())
        else:
            print('最后一条消息不是Leo发的,1:' + item.window_text())

    except Exception as e:
        print('最后一条消息不是Leo发的,2:' + item.window_text())


def worker():
    try:
        worker_check_new_msg()
    except Exception as e:
        print('worker error:' + str(e))


def worker_check_new_msg():
    wx_app = None
    dlg = None
    while True:
        print("worker2 is running...")
        if wx_app is None:
            print('wx_app none')
            try:
                wx_app = Application(backend="uia").connect(class_name='WeChatMainWndForPC')
                print('微信处在前端， connect')
                dlg = wx_app.window(title='微信')
            except ElementNotFoundError as e:
                print('异常，微信未处在前端1,不监听新消息')
                # Application(backend='uia').start('D:\software\WeChat\WeChat.exe')
                # time.sleep(0.1)
                # wx_app = Application(backend="uia").connect(class_name='WeChatMainWndForPC')
                # dlg = wx_app.window(title='微信')
                # if not dlg.exists():
                #     dlg = None
                #     wx_app = None
                #     print('将wx_app清空2')

        if dlg is None or not dlg.exists():
            dlg = None
            wx_app = None
            print('异常，微信未处在前端2,不监听新消息')
        else:
            print('检查新消息')
            check_new_msg(dlg)

        print("worker2 end...")
        time.sleep(10)  # 任务模拟，实际任务中可能不需要这行


app = Flask(__name__)


@app.route('/api1', methods=['POST'])
def index():
    pass


# 通过俩种不同的方式来实现pc微信发送消息，第二种更为灵活，可以获取到控件树结构
if __name__ == '__main__':
    log.setTag("xxx")
    chlog.setTag("xxx")
    # 创建并启动后台线程
    background_thread = threading.Thread(target=worker)
    background_thread.daemon = True  # 设置为守护线程，主程序结束时自动关闭
    background_thread.start()

    # 接收来自本机的请求
    app.run(debug=False, host='172.16.162.73', port=5002)
