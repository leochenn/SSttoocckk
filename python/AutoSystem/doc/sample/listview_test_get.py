# -*- coding: utf-8 -*-
from pywinauto import Application

def getZipListView():
    app = Application().connect(path="C:\Program Files (x86)\\360\\360zip\\360zip.exe")
    zipWindow = app["1.zip - 360 Zip"]
    zipWindow.window(title_re="", class_name="SysListView32").print_control_identifiers()
    # 定位到控件
    print("--" * 30)
    list1 = zipWindow.child_window(class_name="SysListView32")
    c_count = list1.column_count()
    cur_c = 1
    for item in list1.items():
        cur_c += 1
        print(item.item_data()['text'])
        if cur_c > c_count:
            print()
            cur_c = 1

def getTDXListView():
    app = Application().connect(path="D:\software\huabao\Tc.exe")
    window = app["通达信网上交易V6 杭州营业部 曾蕾"]
    window.window(title_re="", class_name="SysListView32").print_control_identifiers()
    # 定位到控件
    list1 = window.child_window(class_name="SysListView32")
    c_count = list1.column_count()
    cur_c = 1
    for item in list1.items():
        cur_c += 1
        print(item.item_data()['text'])
        if cur_c > c_count:
            print()
            cur_c = 1

if __name__ == '__main__':
    getTDXListView()