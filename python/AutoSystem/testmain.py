#!/usr/bin/python
# -*- coding: utf-8 -*-

# coding:utf-8
from openpyxl import load_workbook
import xlrd2
import chlog

if __name__ == '__main__':
    chlog.setTag("chtag")

    wb = load_workbook(r'C:\Users\Administrator\Desktop\20240320撤单查询.xlsx')
    sheetname = wb.sheetnames[0]
    ws = wb[sheetname]
    max_row = ws.max_row + 1
    max_row = 15
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

    wb2 = load_workbook(r'C:\Users\Administrator\Desktop\20240320撤单查询2.xlsx')
    sheetname2 = wb2.sheetnames[0]
    ws2 = wb2[sheetname2]
    max_row2 = ws2.max_row + 1
    max_row2 = 15
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
                        chlog.e('在内层键值对中发现差异', str(outer_key), str(inner_key), '的值在两个字典中不同', str(value1), 'vs', str(inner_dict2.get(inner_key)))

        for outer_key, inner_dict1 in data2.items():
            if outer_key not in data:
                chlog.e('在外层键中发现差异', str(outer_key), '只存在于第一个data中')
            else:
                inner_dict2 = data[outer_key]
                for inner_key, value1 in inner_dict1.items():
                    if inner_key not in inner_dict2 or inner_dict2[inner_key] != value1:
                        chlog.e('在内层键值对中发现差异', str(outer_key), str(inner_key), '的值在两个字典中不同', str(value1), 'vs',
                                str(inner_dict2.get(inner_key)))
