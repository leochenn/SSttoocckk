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

function logAndSend(action, msg) {
    var currentTitle = document.title;
    var currentUrl = window.location.href;

    var data = {
        msg: msg,
        title:currentTitle,
        url:currentUrl
    }
    console.log(getTime() + ' leo:', JSON.stringify(data))
    chrome.runtime.sendMessage({
        action: action,
        message: data
    });
}

function log(msg) {
    logAndSend('log', msg)
}

function updateGetTitle() {
    currentTitle = document.title;	
	if (currentTitle !== lastTitle) {
        lastTitle = currentTitle
        if (lastTitle.indexOf('新') || lastTitle.indexOf('消息')) {
            logAndSend('title_changed', '有新消息')
        }        
	}
}


log('脚本启动')
var lastTitle = document.title;
setInterval(updateGetTitle, 10000);

// 选择你想要监控的div节点
const targetNode = document.querySelector('.status-list');
if (targetNode) {
    log('开始进行监听节点')
    // 配置观察器选项: 'childList' 表示监听子节点的变化
    const config = { attributes: false, childList: true, subtree: true };

    // 回调函数，当变化发生时会被调用
    const callback = function(mutationsList) {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList') {
               // 遍历新增的节点
                mutation.addedNodes.forEach(function(addedNode) {
                    // 确保处理的是元素节点且是a标签
                    if (addedNode.nodeType === Node.ELEMENT_NODE && addedNode.tagName.toLowerCase() === 'a') {
                        // 检查a标签是否有class为"home-xxx"
                        const classList = addedNode.classList;
                        if (classList.contains('home-timeline__unread')) {
                            logAndSend('content_changed', '新增x条内容')
                        }
                    }
                });
            }
        }
    };

    // 创建一个观察器实例并传入回调函数
    const observer = new MutationObserver(callback);

    // 开始观察目标节点
    observer.observe(targetNode, config);

    // 记得在不需要观察时停止观察，避免内存泄漏
    // observer.disconnect();

    log('开始观察目标节点')
} else {
    log('未找到节点')
}