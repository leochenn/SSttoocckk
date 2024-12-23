var systemSwitchState = 1
var wxSwitchState = 0
var notifyIdValue = {}
var lastCreateTime = 0;
var port = undefined
function getTime() {
  // 创建一个Date对象，代表当前时间
  let now = new Date();

  // 获取年、月、日、时、分、秒
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 注意月份是从0开始的，所以要加1
  let day = now.getDate();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();
  // 格式化时间，确保月份和日期是两位数
  month = month < 10 ? '0' + month : month;
  day = day < 10 ? '0' + day : day;
  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  // 拼接成字符串
  let formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  return formattedTime;
}

function log(tag, data) {
  console.log(getTime() + ' leo:', tag + '->' + JSON.stringify(data))
}

function sendNativeMsg(data) {
  if (wxSwitchState == 0) {
    return;
  }
  if (!port) {
    port = chrome.runtime.connectNative('com.example.myapp');
    log("connectNative 启动", port);

    port.onMessage.addListener(function (msg) {
      log("connectNative 收到消息", msg);
    });
    port.onDisconnect.addListener(function () {
      log("connectNative 已断开", chrome.runtime.lastError.message);
      port = undefined;
    });
  }
  if (port) {
    log("connectNative 发送消息", data);
    port.postMessage(data);
  }
}


function injectScrollToTopScript(tabId) {
  chrome.scripting.executeScript({
    target : {tabId : tabId},
    files : [ "background/contentScript.js" ],
  }).then(() => log("雪球页面注入脚本成功", ''));
}

function doOnClick(id) {
  // 当用户点击通知时，打开特定的网页
  // chrome.tabs.create({ url: "http://www.baidu.com" });
  chrome.tabs.query({ windowType: 'normal' }, (tabs) => {
      tabs.forEach(function(tab){                  
        if (tab.url.startsWith('https://xueqiu.com')) {
          log("已找到雪球tab", tab);
          chrome.tabs.update(tab.id, { active: true }, function(targetTabId) {
            log("已切换到雪球页面", targetTabId);

            // 使用实际的tabId调用此函数
            injectScrollToTopScript(tab.id);
          });

          chrome.windows.update(tab.windowId, { focused: true }, function(window) {
            log("浏览器窗口前置", id);
            var msg = notifyIdValue[id]
            if (msg != null) {
              delete notifyIdValue[id];
              if (msg.indexOf('测试组合') != -1) {
                log("打开【测试组合】页面", '');
                chrome.tabs.create({ url: "https://xueqiu.com/P/ZH3362205" });
              }
              if (msg.indexOf('可转债轮动策略') != -1) {
                log("打开【可转债轮动策略】页面", '');
                chrome.tabs.create({ url: "https://xueqiu.com/P/ZH1332574" });
              }
            }
          });
        }
      });
  })  
}

// 刷新需要注入的页面，才能注入生效
function refreshPage() {
  chrome.tabs.query({ windowType: 'normal' }, (tabs) => {
      tabs.forEach(function(tab){                  
        if (tab.url.startsWith('https://xueqiu.com') || tab.url.indexOf('test-title-change') != -1) {
          log("已找需要刷新的tab", tab);
          chrome.tabs.reload(tab.id, {
            bypassCache: false // 可选参数，如果设置为true，则忽略缓存进行硬刷新
          }, function(tab) {
            if (chrome.runtime.lastError) {
              log('刷新标签页时出错:', chrome.runtime.lastError.message);
            } else {
              log('标签页刷新成功');
            }
          });
        }
      });
  })  
}

// chrome插件限制了后台运行，大概一分钟内会被结束掉；
// 只有开启DevTools窗口时，可以保持常驻；
// 另一种优化方案，是采用闹钟的模式，最低一分钟重新唤醒一次
log('雪球插件启动', '')
// chrome.notifications.create({
//     type: "basic",
//     title: '雪球插件启动',
//     message: '',
//     iconUrl: "../icon/icon.png"
//   },
//   (notificationId) => {    
//     log('雪球插件启动', '消息发送成功')
//   }
// );

refreshPage();

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'from_popup') {
    log('popop', message)
    if (message.data === 'get_state') {
      // 向发送方回复消息
      var msg = { type_system: systemSwitchState, type_wx: wxSwitchState }
      log('向popop发消息', msg)
      sendResponse({ message: msg });
    } else if (message.message === 'close_system') {
      systemSwitchState = 0
      log('关闭通知', systemSwitchState)
    } else if (message.message === 'open_system') {
      systemSwitchState = 1
      log('开启通知', systemSwitchState)
    } else if (message.message === 'open_wx') {
      wxSwitchState = 1
      log('开启wx通知', wxSwitchState)
      sendNativeMsg('开启wx通知')
    } else if (message.message === 'close_wx') {
      wxSwitchState = 0
      log('关闭wx通知', wxSwitchState)
    }
  } else if (message.action === 'title_changed' || message.action === 'content_changed' || message.action === 'chat_changed') {
    log('执行指令', '')
    log(message.action, message.message)
    var title = '无'
    if (message.action === 'title_changed') {
        title = '标题更新'
    }
    if (message.action === 'content_changed') {
      title = '内容更新'
    }
    if (message.action === 'chat_changed') {
        title = '消息更新'
    }

    var now = new Date().getTime();
    if (now - lastCreateTime < 10000) {
        log('10秒内不频繁发送通知', '')
        return;
    }
    lastCreateTime = now;

    sendNativeMsg(title + ":" + message.message.msg)

    if (systemSwitchState == 1) {
      chrome.notifications.create({
          type: "basic",
          title: title,
          message: message.message.msg,
          iconUrl: "../icon/icon.png"
        },
        (notificationId) => {
          if (title === '消息更新') {
            notifyIdValue[notificationId] = message.message.msg
          }
          log('消息发送成功', notificationId)
        }
      );
      if (!chrome.notifications.onClicked.hasListeners()) {
        chrome.notifications.onClicked.addListener(function (notificationId) {
            log('消息被点击', notificationId)
            doOnClick(notificationId);
          });
      }
    } else {
      log('通知已关闭', '!!!')
    }
  } else {
    log('收到日志', message)
  }
});

