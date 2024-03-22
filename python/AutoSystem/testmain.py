#!/usr/bin/python
# -*- coding: utf-8 -*-

# coding:utf-8
import time

from openpyxl import load_workbook
import chlog
import win32com.client as win32
from datetime import datetime

if __name__ == '__main__':
    chlog.setTag("chtag")

    # 获取当前日期和时间
    current_date = datetime.now()
    # 格式化为"YYYYMMDD"格式的字符串
    formatted_date = current_date.strftime('%Y%m%d')

    xlsfile = r'C:\Users\Administrator\Documents\{0} 撤单查询.xls'.format(formatted_date)
    xlsxfile = xlsfile[:-3].replace('[', '').replace(']', '') + 'xlsx'
    chlog.d("xlsfile  path", xlsfile)
    chlog.d("xlsxfile path", xlsxfile)

    excel = win32.gencache.EnsureDispatch('Excel.Application')
    wb = excel.Workbooks.Open(xlsfile)
    #  xlsx: FileFormat=51
    #  xls:  FileFormat=56
    wb.SaveAs(xlsxfile, FileFormat=51)
    wb.Close()
    excel.Application.Quit()

    time.sleep(2)

    wb = load_workbook(xlsxfile)
    sheetname = wb.sheetnames[0]
    ws = wb[sheetname]
    max_row = ws.max_row + 1
    chlog.e('开始执行', sheetname)

    data = {}

    for row in range(2, max_row):
        zzName = ws.cell(row, 4).value
        zzName = zzName.replace('"', '').replace("'", "").replace('=', '')
        zzPrice = ws.cell(row, 6).value
        zzCount = ws.cell(row, 7).value
        chlog.e(row, '行', zzName, zzPrice, zzCount)
        if zzName not in data:
            data[zzName] = {}

        data[zzName][zzPrice] = zzCount

    chlog.d(data)

    exit(0)

    wb2 = load_workbook(r'C:\Users\Administrator\Desktop\20240320撤单查询2.xlsx')
    sheetname2 = wb2.sheetnames[0]
    ws2 = wb2[sheetname2]
    max_row2 = ws2.max_row + 1
    chlog.e('开始执行', sheetname2)

    data2 = {}

    for row in range(2, max_row2):
        zzName = ws2.cell(row, 4).value
        zzName = zzName.replace('"', '').replace("'", "").replace('=', '')
        zzPrice = ws2.cell(row, 6).value
        zzCount = ws2.cell(row, 7).value
        chlog.e(row, '行', zzName, zzPrice, zzCount)
        if zzName not in data2:
            data2[zzName] = {}

        data2[zzName][zzPrice] = zzCount

    chlog.d(data2)

    if data == data2:
        chlog.d('true')
    else:
        chlog.e('false')
        # 遍历并打印出不同的项目
        for outer_key, inner_dict1 in data.items():
            if outer_key not in data2:
                chlog.e('在外层键中发现差异', str(outer_key), '只存在于第一个data中')
            else:
                inner_dict2 = data2[outer_key]
                for inner_key, value1 in inner_dict1.items():
                    if inner_key not in inner_dict2 or inner_dict2[inner_key] != value1:
                        chlog.e('在内层键值对中发现差异', str(outer_key), str(inner_key), '的值在两个字典中不同', str(value1), 'vs',
                                str(inner_dict2.get(inner_key)))

        for outer_key, inner_dict1 in data2.items():
            if outer_key not in data:
                chlog.e('在外层键中发现差异', str(outer_key), '只存在于第一个data中')
            else:
                inner_dict2 = data[outer_key]
                for inner_key, value1 in inner_dict1.items():
                    if inner_key not in inner_dict2 or inner_dict2[inner_key] != value1:
                        chlog.e('在内层键值对中发现差异', str(outer_key), str(inner_key), '的值在两个字典中不同', str(value1), 'vs',
                                str(inner_dict2.get(inner_key)))
