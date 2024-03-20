#!/usr/bin/python
# -*- coding: utf-8 -*-

# coding:utf-8
import chlog

if __name__ == '__main__':
    chlog.setTag("chtag")
    chlog.d('debug', 1234)
    chlog.e('error', 456)