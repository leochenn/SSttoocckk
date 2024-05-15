#!/usr/bin/python
# -*- coding: utf-8 -*-
import time

# coding:utf-8
import requests


# 自动挂单完成后，手动导出撤单列表
# 读取撤单列表后输出
# 对比自动挂单后的输出，是否匹配

def send_post_request(data):
    """
    发送POST请求并检查响应状态。
    :param data: 请求数据字典
    """
    try:
        # 使用Session来复用连接
        with requests.Session() as session:
            # 设置超时时间，避免请求无限等待
            response = session.post('http://172.16.162.73:5002/api', data=data, timeout=10)

            # 检查响应状态码
            if response.status_code == 200:
                print("请求成功，响应数据:", response.text)
            else:
                print(f"请求失败，状态码: {response.status_code}")
    except requests.RequestException as e:
        # 捕获并处理requests库可能抛出的所有异常
        print(f"请求过程中发生错误: {e}")


def test():
    data = {
        'key1': time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
        'key2': 'value2',
        # 根据需要添加更多字段
    }

    # 调用函数发送请求
    send_post_request(data)


if __name__ == '__main__':
    test()
    time.sleep(1)
    test()

