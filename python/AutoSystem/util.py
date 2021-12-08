# -*- coding: utf-8 -*-
import threading
import time

import win32con
import win32gui

import log


def printWindowInfo(handle):
    className = win32gui.GetClassName(handle)
    title = win32gui.GetWindowText(handle)
    log.info("输出信息：类名-" + className + ", handle-" + str(hex(handle)) + ", title-" + title)

def find_idxSubHandle(pHandle, winClass, index=0):
    """
    已知子窗口的窗体类名
    寻找第index号个同类型的兄弟窗口
    """
    assert type(index) == int and index >= 0
    handle = win32gui.FindWindowEx(pHandle, 0, winClass, None)
    while index > 0:
        handle = win32gui.FindWindowEx(pHandle, handle, winClass, None)
        index -= 1
    return handle


def find_subHandle(pHandle, winClassList):
    """
    递归寻找子窗口的句柄
    pHandle是祖父窗口的句柄
    winClassList是各个子窗口的class列表，父辈的list-index小于子辈
    """
    assert type(winClassList) == list
    if len(winClassList) == 1:
        return find_idxSubHandle(pHandle, winClassList[0][0], winClassList[0][1])
    else:
        pHandle = find_idxSubHandle(pHandle, winClassList[0][0], winClassList[0][1])
        return find_subHandle(pHandle, winClassList[1:])

def closeNotepad():
    log.info("closeNotepad执行")
    for index in range(100):
        notePad = win32gui.FindWindow('Notepad', None)
        if notePad:
            log.info("关闭notePad")
            win32gui.PostMessage(notePad, win32con.WM_CLOSE, 0, 0)
            break
        time.sleep(0.001)
    log.info("closeNotepad完成")

def postCloseNotepad():
    thread = threading.Thread(target=closeNotepad)
    thread.start()

def methodCollection():
    return 1
    # # 执行左单键击，若需要双击则延时几毫秒再点击一次即可
    # win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP | win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    # log("左单键击")
    #
    # # 右键单击
    # # win32api.mouse_event(win32con.MOUSEEVENTF_RIGHTUP | win32con.MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
    # # log("右键单击")
    #
    # # 发送回车
    # # win32api.keybd_event(13, 0, 0, 0)
    # # win32api.keybd_event(13, 0, win32con.KEYEVENTF_KEYUP, 0)
    #
    # # 获取显示器屏幕大小
    # width = win32api.GetSystemMetrics(win32con.SM_CXSCREEN)
    # height = win32api.GetSystemMetrics(win32con.SM_CYSCREEN)
    #
    # log("获取显示器屏幕大小" + str(width) + "," + str(height))

    # 遍历窗体句柄id
    # childList = []
    # def all(hwnd, param):
    #     childList.append(hwnd)
    # win32gui.EnumChildWindows(handle1, all, None)

    # try:
    #     except Exception as r:
    #     print('未知错误 %s' % (r.strerror.decode('gbk')))

    # childList = []
    # def all(hwnd, param):
    #     childList.append(hwnd)
    # win32gui.EnumChildWindows(hwnd, all, None)
    # for item in childList:
    #     log("开始执行:" + str(hex(item)))

    # hWnd_list = []
    # win32gui.EnumWindows(lambda hWnd, param: param.append(hWnd), hWnd_list)


