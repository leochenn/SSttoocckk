var switchState = 1
var lastNotifyId = ''

function log(tag, data) {
  console.log('leo:', tag + '->' + JSON.stringify(data))
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'from_popup') {
    log('popop', message)
    if (message.data === 'get_state') {
      // 向发送方回复消息
      log('向popop发消息', switchState)
      sendResponse({ message: switchState });
    } else if (message.message === 'close') {
      switchState = 0
      log('关闭通知', switchState)
    } else if (message.message === 'open') {
      switchState = 1
      log('开启通知', switchState)
    }
  } else if (message.action === 'title_changed' || message.action === 'content_changed') {
    log('执行指令', '')
    log(message.action, message.message)
    var title = message.action === 'title_changed' ? '标题更新' : '内容更新'

    if (switchState == 1) {
      chrome.notifications.create({
          type: "basic",
          title: title,
          message: message.message.msg,
          iconUrl: "../icon/icon.png"
        },
        (notificationId) => {
          lastNotifyId = notificationId
          log('消息发送成功', notificationId)
        }
      );
      
      chrome.notifications.onClicked.addListener(function(notificationId) {
          log('消息被点击', notificationId + ', ' + lastNotifyId)
          if (JSON.stringify(lastNotifyId) == JSON.stringify(notificationId)) {
            lastNotifyId = ''
            // 当用户点击通知时，打开特定的网页
            chrome.tabs.create({ url: "http://www.baidu.com" });
          }        
      });
    } else {
      log('通知已关闭', '!!!')
    }
  } else {
    log('收到日志', message)    
  }
});

