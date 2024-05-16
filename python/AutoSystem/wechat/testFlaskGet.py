#!/usr/bin/python
# -*- coding: utf-8 -*-
import queue
import threading
import time

from flask import Flask, request
from urllib.parse import parse_qs

app = Flask(__name__)

# 创建一个全局的线程安全队列
work_queue = queue.Queue()

def log(msg):
    print(f"{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())} - -  {msg}")

# 定义一个后台处理函数
def worker():
    global work_queue
    while True:
        # 从队列中获取数据，如果队列为空则阻塞等待
        item = work_queue.get()
        if item is None:  # 如果收到None，表示应该退出循环
            break
        # log(f"正在处理: {item}")
        # # 模拟处理数据的过程
        # time.sleep(5)
        log(f"处理完成: {item}")


@app.route('/api', methods=['POST'])
def index():
    if request.method == 'POST':
        get_data = request.get_data().decode('utf-8')
        log("收到请求数据:" + str(get_data))

        query_params = parse_qs(get_data)
        # 现在你可以通过键来获取对应的值
        key1_value = query_params.get('key1', [''])[0]  # 使用get方法并提供默认值以防键不存在
        key2_value = query_params.get('key2', [''])[0]

        # log(f"Key1: {key1_value}, Key2: {key2_value}")

        global work_queue
        work_queue.put(key1_value)

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
