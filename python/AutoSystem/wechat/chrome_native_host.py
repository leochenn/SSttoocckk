#!/usr/bin/python3
# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
# A simple native messaging host. Shows a Tkinter dialog with incoming messages
# that also allows to send message back to the webapp.

import struct
import sys

import requests
import queue as queue
import os
import msvcrt

import keyboard as k_keyboard
import threading
from threading import Event
from datetime import datetime
import pyautogui
from pywinauto.findwindows import ElementNotFoundError
from pywinauto import Application
import time
from pywinauto.keyboard import send_keys


path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chrome_native_host.log')
# 创建一个全局的线程安全队列
work_queue = queue.Queue()
# 记录最后一次键盘输入事件
last_key_event_time = None
# 当微信在操作时取消监听
cancel_monitor_flag = Event()


# On Windows, the default I/O mode is O_TEXT. Set this to O_BINARY
# to avoid unwanted modifications of the input/output streams.
if sys.platform == "win32":

    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)


# 获取当前时间
def get_current_time():
    import time
    return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())


# 实现一个方法，将字符串写入到本地文件
def write_to_file(message):
    with open(path, 'a') as f:
        f.write(str(get_current_time()) + '---' + message + '\n')


def send_post_request(msg):
    data = {
        'data': msg,
    }
    try:
        # 使用Session来复用连接
        with requests.Session() as session:
            # 设置超时时间，避免请求无限等待
            response = session.post('http://172.16.162.73:5002/api', data=data, timeout=10)
            # 检查响应状态码
            if response.status_code == 200:
                write_to_file('请求成功，响应数据：' + response.text)
            else:
                write_to_file('请求失败，状态码：' + response.status_code)

    except Exception as e:
        write_to_file('请求过程中发生错误：' + str(e))


# Helper function that sends a message to the webapp.
def send_message(message):
    # Write message size.
    sys.stdout.buffer.write(struct.pack('I', len(message)))
    # Write the message itself.
    sys.stdout.write(message)
    sys.stdout.flush()


def send_message_gbk(message):
    encoded_message = message.encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(encoded_message)))
    sys.stdout.buffer.write(encoded_message)
    sys.stdout.flush()


# Thread that reads messages from the webapp.
def read_thread_func():
    while 1:
        # Read the message length (first 4 bytes).
        text_length_bytes = sys.stdin.buffer.read(4)

        if len(text_length_bytes) == 0:
            write_to_file('异常退出2')
            sys.exit(0)

        # Unpack message length as 4 byte integer.
        text_length = struct.unpack('@I', text_length_bytes)[0]

        # Read the text (JSON object) of the message.
        text = sys.stdin.buffer.read(text_length).decode('utf-8')
        text = str(text)
        write_to_file('收到chrome消息:' + text)

        if text == '{"text":"exit"}':
            break

        # 必须是键值对形式，不能是字符串
        call_back_msg = '{"native已收到": %s}' % (text)
        send_message_gbk(call_back_msg)
        write_to_file('回复chrome:' + call_back_msg)

        # send_post_request(text)
        global work_queue
        work_queue.put(text)


# 监听所有按键
def on_press(key):
    if not cancel_monitor_flag.is_set():
        global last_key_event_time
        last_key_event_time = datetime.now()


def wxsendmsg(msg):
    # 获取光标位置
    cursor_x, cursor_y = pyautogui.position()

    try:
        # 可以使用 class_name='WeChatMainWndForPC' 或者 title_re="微信"
        wx_app = Application(backend="uia").connect(class_name='WeChatMainWndForPC')
    except ElementNotFoundError as e:
        write_to_file('微信未处在前端，需要先启动')
        Application(backend='uia').start('D:\software\WeChat\WeChat.exe')
        time.sleep(0.1)
        wx_app = Application(backend="uia").connect(class_name='WeChatMainWndForPC')

    dlg = wx_app.window(class_name='WeChatMainWndForPC')

    # 检查微信窗口是否为活动窗口
    is_wechat_active = dlg.is_active()

    if not is_wechat_active:
        write_to_file("微信窗口不是活动窗口")
        dlg.set_focus()

    chat_win = dlg.child_window(title='1马甲群已置顶', control_type='ListItem')
    chat_win.click_input()

    # 微信风控，这里不能输入太快
    if len(msg) > 20:
        send_keys(msg, pause=0)
        time.sleep(0.5)
    else:
        send_keys(msg, pause=0.05)

    send_btn = dlg.child_window(title='发送(S)', control_type='Button')
    send_btn.click_input()

    # if not is_wechat_active:
    dlg.minimize()

    # 移动鼠标光标到指定位置
    pyautogui.moveTo(cursor_x, cursor_y)


def worker():
    global work_queue, last_key_event_time
    while True:
        # 从队列中获取数据，如果队列为空则阻塞等待
        item = work_queue.get()
        if item is None:  # 如果收到None，表示应该退出循环
            break

        # 判断最后一次键盘输入是否间隔3秒
        crt = datetime.now()
        if last_key_event_time and (crt - last_key_event_time).total_seconds() < 3:
            write_to_file('不超过3秒,不操作微信')
        else:
            cancel_monitor_flag.set()
            write_to_file(f"正在处理: {item}")
            try:
                wxsendmsg(item)
                write_to_file(f"处理完成: {item}")
                cancel_monitor_flag.clear()
            except Exception as e:
                write_to_file(f"处理异常: {e}")
                cancel_monitor_flag.clear()
                # 当微信发送消息出现异常时，可能是微信风控退出，则不再执行微信操作
                break


if __name__ == '__main__':
    if os.path.exists(path):
        os.remove(path)

    write_to_file('启动')

    # 监听键盘事件
    k_keyboard.on_press(on_press)

    # 创建并启动后台线程
    background_thread = threading.Thread(target=worker)
    background_thread.daemon = True  # 设置为守护线程，主程序结束时自动关闭
    background_thread.start()

    try:
        read_thread_func()
    except Exception as e:
        write_to_file('异常退出1:' + str(e))

    write_to_file('退出')
    sys.exit(0)
