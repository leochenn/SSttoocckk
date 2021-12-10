# -*- coding: utf-8 -*-
# 是家里还是公司
home = 0
office = 1
env = office

#通达信交易窗口 标题
tdx_window_title = '通达信网上交易V6 杭州营业部 曾蕾'

#通达信登录窗口 标题
login_title_home = '通达信网上交易V7.88'
login_title_office = '通达信网上交易V7.95'
login_title = login_title_office if env == 1 else login_title_home

# 公司和家里的通达信版本不同 有个控件类名不同
frameIdHome = 'Afx:10000000:3:10003:1900010:10027'
frameIdOffice = 'Afx:10000000:3:10003:900010:1002b'
frameId = frameIdOffice if env == 1 else frameIdHome

pwd = ''
