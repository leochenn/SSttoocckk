#!/usr/bin/python
# -*- coding: utf-8 -*-
import queue
import threading
import time
from datetime import datetime

import keyboard as k_keyboard
import pyautogui
from flask import Flask, request
from urllib.parse import parse_qs
from pywinauto import Application
from pywinauto.findwindows import ElementNotFoundError
from pywinauto.keyboard import send_keys
from threading import Event

app = Flask(__name__)

# 创建一个全局的线程安全队列
work_queue = queue.Queue()

# 记录最后一次键盘输入事件
last_key_event_time = datetime.now()
# 当微信在操作时取消监听
cancel_monitor_flag = Event()


def log(msg):
    print(f"{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())} - -  {msg}")

#https://www.cnblogs.com/quanxin633/p/16616851.html
def wxsendmsg(msg):
    # 获取光标位置
    cursor_x, cursor_y = pyautogui.position()

    try:
        # 可以使用 class_name='WeChatMainWndForPC' 或者 title_re="微信"
        wx_app = Application(backend="uia").connect(class_name='WeChatMainWndForPC')
    except ElementNotFoundError as e:
        print('微信未处在前端，需要先启动')
        Application(backend='uia').start('D:\software\WeChat\WeChat.exe')
        time.sleep(0.1)
        wx_app = Application(backend="uia").connect(class_name='WeChatMainWndForPC')

    dlg = wx_app.window(class_name='WeChatMainWndForPC')

    # 检查微信窗口是否为活动窗口
    is_wechat_active = dlg.is_active()

    if not is_wechat_active:
        log("微信窗口不是活动窗口")
        dlg.set_focus()

    chat_win = dlg.child_window(title='1马甲群已置顶', control_type='ListItem')
    chat_win.click_input()

    send_keys(msg, pause=0)

    send_btn = dlg.child_window(title='发送(S)', control_type='Button')
    send_btn.click_input()

    # if not is_wechat_active:
    dlg.minimize()

    # 移动鼠标光标到指定位置
    pyautogui.moveTo(cursor_x, cursor_y)


# 定义一个后台处理函数
def worker():
    global work_queue, last_key_event_time
    while True:
        # 从队列中获取数据，如果队列为空则阻塞等待
        item = work_queue.get()
        if item is None:  # 如果收到None，表示应该退出循环
            break

        # 判断最后一次键盘输入是否间隔3秒
        crt = datetime.now()
        time_difference = crt - last_key_event_time
        if time_difference.total_seconds() > 3:
            cancel_monitor_flag.set()
            log(f"正在处理: {item}")
            try:
                wxsendmsg(item)
                log(f"处理完成: {item}")
                cancel_monitor_flag.clear()
            except Exception as e:
                log(f"处理异常: {e}")
                cancel_monitor_flag.clear()
        else:
            log('不超过3秒,不操作微信')


@app.route('/api', methods=['POST'])
def index():
    if request.method == 'POST':
        get_data = request.get_data().decode('utf-8')

        query_params = parse_qs(get_data)
        # 现在你可以通过键来获取对应的值
        data = query_params.get('data', [''])[0]  # 使用get方法并提供默认值以防键不存在

        log(f"接收到数据: {data}")

        global work_queue
        work_queue.put(data)

        return "{\"code\":\"200\",\"msg\":\" success\"}"
    else:
        return '<h1>只接受post请求！</h1>'


# 监听所有按键
def on_press(key):
    if not cancel_monitor_flag.is_set():
        global last_key_event_time
        last_key_event_time = datetime.now()


# 本地通过postman模拟线上发起的打包
if __name__ == '__main__':
    # 监听键盘事件
    k_keyboard.on_press(on_press)

    # 创建并启动后台线程
    background_thread = threading.Thread(target=worker)
    background_thread.daemon = True  # 设置为守护线程，主程序结束时自动关闭
    background_thread.start()

    # 接收来自本机的请求
    app.run(debug=False, host='172.16.162.73', port=5002)
