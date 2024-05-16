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
        if (lastTitle.indexOf('新') != -1 || lastTitle.indexOf('消息') != -1) {
            logAndSend('title_changed', '标题有新消息')
        }        
	}
}


log('脚本启动')
var lastTitle = document.title;
// setInterval(updateGetTitle, 3000);

// 监控Timeline新消息
var targetNode = document.querySelector('.status-list');
if (targetNode) {
    log('找到Timeline新消息节点')
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
                            logAndSend('content_changed', '新增x条关注内容')
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

    log('开始进行监听Timeline新消息')
} else {
    log('未找到Timeline新消息节点')
}


// 监控聊天
var targetNode1 = document.querySelector('.snbim-mvhead-unreadNum');
if (targetNode1) {
    log('找到聊天节点')
    // 配置观察器选项: 'childList' 表示监听子节点的变化
    const config1 = { attributes: false, childList: true, subtree: true };

    // 回调函数，当变化发生时会被调用
    const callback1 = function(mutationsList) {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList') {
               // 检查是否有新增的文本节点或者子节点的变化
                const addedNodes = Array.from(mutation.addedNodes);
                if (addedNodes.some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '')) {
                    logAndSend('chat_changed', '有新聊天消息:' + mutation.target.textContent.trim() + '条')
                }
            }
        }
    };

    // 创建一个观察器实例并传入回调函数
    const observer1 = new MutationObserver(callback1);

    // 开始观察目标节点
    observer1.observe(targetNode1, config1);

    // 记得在不需要观察时停止观察，避免内存泄漏
    // observer.disconnect();

    log('开始进行监听聊天新消息')
} else {
    log('未找到聊天节点')
}