# -*- coding: utf-8 -*-
import os
import sys

import xlrd as xlrd

reload(sys)
sys.setdefaultencoding("utf-8")

def gci(filepath):
    files = os.listdir(filepath)
    for fi in files:
        fi_d = os.path.join(filepath, fi)
        if os.path.isdir(fi_d):
            gci(fi_d)
        else:
            print(os.path.join(filepath, fi_d))

if __name__ == '__main__':
    path = 'C:\Users\Administrator\Documents\\abc.cvs'
    # path = path.encode('gbk')
    exist = os.path.exists(path)

    readbook = xlrd.open_workbook(path)
    sheet = readbook.sheet_by_index(0)  # 索引的方式，从0开始
    nrows = sheet.nrows  # 行
    ncols = sheet.ncols  # 列
    print(str(nrows))
    print(str(ncols))
