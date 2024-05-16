#!/usr/bin/python
# -*- coding: utf-8 -*-
import queue
import threading
import time

import pyautogui
from flask import Flask, request
from urllib.parse import parse_qs
from pywinauto import Application
from pywinauto.keyboard import send_keys

app = Flask(__name__)

# 创建一个全局的线程安全队列
work_queue = queue.Queue()

def log(msg):
    print(f"{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())} - -  {msg}")


def wxsendmsg(msg):
    # 获取光标位置
    cursor_x, cursor_y = pyautogui.position()

    app = Application(backend="uia").connect(title_re="微信")
    dlg = app.window(title='微信')

    # 检查微信窗口是否为活动窗口
    is_wechat_active = dlg.is_active()

    if not is_wechat_active:
        log("微信窗口不是活动窗口")
        dlg.set_focus()

    chatWin = dlg.child_window(title='1马甲群已置顶', control_type='ListItem')
    chatWin.click_input()

    send_keys(msg, pause=0)

    sendBtn = dlg.child_window(title='发送(S)', control_type='Button')
    sendBtn.click_input()

    if not is_wechat_active:
        dlg.minimize()

    # 移动鼠标光标到指定位置
    pyautogui.moveTo(cursor_x, cursor_y)

# 定义一个后台处理函数
def worker():
    global work_queue
    while True:
        # 从队列中获取数据，如果队列为空则阻塞等待
        item = work_queue.get()
        if item is None:  # 如果收到None，表示应该退出循环
            break
        log(f"正在处理: {item}")
        wxsendmsg(item)
        log(f"处理完成: {item}")


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


# 本地通过postman模拟线上发起的打包
if __name__ == '__main__':
    # 创建并启动后台线程
    background_thread = threading.Thread(target=worker)
    background_thread.daemon = True  # 设置为守护线程，主程序结束时自动关闭
    background_thread.start()

    # 接收来自本机的请求
    app.run(debug=False, host='172.16.162.73', port=5002)
