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


path1 = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(path1, 'output.txt')

work_queue = queue.Queue()

# On Windows, the default I/O mode is O_TEXT. Set this to O_BINARY
# to avoid unwanted modifications of the input/output streams.
if sys.platform == "win32":
    import os, msvcrt

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

        send_post_request(text)
        # 通过异步方式调用send_post_request
        # threading.Thread(target=send_post_request, args=(text,)).start()


if __name__ == '__main__':
    if os.path.exists(path):
        os.remove(path)

    write_to_file('启动')

    try:
        read_thread_func()
    except Exception as e:
        write_to_file('异常退出1:' + str(e))

    write_to_file('退出')
    sys.exit(0)
