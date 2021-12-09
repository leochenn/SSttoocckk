#!/usr/bin/python
# -*- coding: utf-8 -*-

import logging
import os
import platform
import sys


curDir = os.getcwd()
loggerGlobal = None
file_handler = None

def getCurrDir():
    global curDir
    retPath = curDir
    if platform.system() == 'Darwin':
        retPath = sys.path[0]
        lstPath = os.path.split(retPath)
        if lstPath[1]:
            retPath = lstPath[0]

    return retPath

def getlogger(tag):
    logger = logging.getLogger(tag)
    logger.setLevel(logging.DEBUG)

    log_file = getCurrDir() + "/log/ch_" + tag + ".log"

    log_dir = os.path.dirname(log_file)
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    global file_handler
    file_handler = logging.FileHandler(log_file, "w", "UTF-8")
    file_handler.setLevel(logging.DEBUG)

    formatter = logging.Formatter('%(asctime)s: %(message)s   _pid:%(process)s ')
    file_handler.setFormatter(formatter)

    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.DEBUG)
    stream_handler.setFormatter(formatter)

    logger.addHandler(stream_handler)
    logger.addHandler(file_handler)

    return logger


def del_file_folder(src):
    if os.path.exists(src):
        if os.path.isfile(src):
            try:
                src = src.replace('\\', '/')
                os.remove(src)
            except:
                pass

        elif os.path.isdir(src):
            for item in os.listdir(src):
                itemsrc = os.path.join(src, item)
                del_file_folder(itemsrc)

            try:
                os.rmdir(src)
            except:
                pass

def deleteLogFile(tag):
    log_file = getCurrDir() + "/log/ch_" + tag + ".log"
    del_file_folder(log_file)

def setTag(tag):
    global loggerGlobal
    loggerGlobal = getlogger(tag)

def clearLogger():
    global loggerGlobal
    global file_handler
    loggerGlobal.removeHandler(file_handler)
    file_handler = None
    loggerGlobal = None

#输出hwnd十六进制
def dhex(*msg):
    if len(msg) <= 0:
        return

    content = ''
    for index in msg:
        content = content + hex(index) + ", "
    info(content)

#输出多个内容分块
def d(*msg):
    if len(msg) <= 0:
        return

    content = ''
    for index in msg:
        if index:
            if content == '':
                content = str(index)
            else:
                content = content + ", " + str(index)
        else:
            if content == '':
                content = 'null'
            else:
                content = content + ", null"

    info(content)

def info(msg, *args):
    if len(msg) <= 0:
        return
    loggerGlobal.info(msg, *args)

def debug(msg, *args):
    if len(msg) <= 0:
        return
    loggerGlobal.debug(msg, *args)

def warning(msg, *args):
    if len(msg) <= 0:
        return
    loggerGlobal.warning(msg, *args)

def error(msg, *args):
    if len(msg) <= 0:
        return
    loggerGlobal.error(msg, *args)

