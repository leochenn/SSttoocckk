# -*- coding: utf-8 -*-
import datetime

import pytesseract
from PIL import ImageGrab, Image

import log

if __name__ == '__main__':
    curr_time = datetime.datetime.now()
    log.setTag("auto_system")
    log.d('start')

    img = ImageGrab.grab([172, 148, 230, 650])
    img.save('1.png')
    # out = img.resize((80, 38), Image.ANTIALIAS)
    text = pytesseract.image_to_string(img, lang='eng')  # 训练的数字库
    print(text)

    curr_time2 = datetime.datetime.now()
    log.d("运行完毕:" + str(curr_time2 - curr_time))