#!/usr/bin/python
# -*- coding: utf-8 -*-

# coding:utf-8
import sys
import json

#获取当前时间
def get_current_time():
    import time
    return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

# 实现一个方法，将字符串写入到本地文件
def write_to_file(message):
    with open('output.txt', 'a') as f:
        f.write(str(get_current_time()) + '---' + message + '\n')

def main():
    for line in sys.stdin:
        # Chrome发送的消息是以JSON格式编码的，所以需要解码
        if line == '\n':
            break
        request = json.loads(line)
        write_to_file('Received message:' + str(request))
        # 假设我们要回应一个简单的确认消息
        response = {"response": "Message received, [Received message:" + str(request) + ']'}
        encoded_response = json.dumps(response).encode('utf-8') + b'\n'
        sys.stdout.write(str(encoded_response))
        sys.stdout.flush()
        write_to_file('Send message:' + str(response))


#https://blog.csdn.net/qq_15028721/article/details/129649467
# D:\software\python3.8.10\Scripts\pyinstaller -c -F achrome.py
if __name__ == '__main__':
    # 获取调用的参数
    write_to_file('start')
    write_to_file(str(sys.argv))
    main()
    write_to_file('end')


