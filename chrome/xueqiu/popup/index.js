const system = document.querySelector('.system')
const wx = document.querySelector('.wx')

var systemState = 0;
var wxState = 0;

system.onclick = function () {
    if (systemState == 0) {
        systemState = 1;
        chrome.runtime.sendMessage({
            action: 'from_popup',
            message: 'open_system'
        });
        system.value = '已开启'
    } else {
        systemState = 0;
        chrome.runtime.sendMessage({
            action: 'from_popup',
            message: 'close_system'
        });
        system.value = '已关闭'
    }
}

wx.onclick = function () {
    if (wxState == 0) {
        wxState = 1;
        chrome.runtime.sendMessage({
            action: 'from_popup',
            message: 'open_wx'
        });
        wx.value = '已开启'
    } else {
        wxState = 0;
        chrome.runtime.sendMessage({
            action: 'from_popup',
            message: 'close_wx'
        });
        wx.value = '已关闭'
    }
}

chrome.runtime.sendMessage({ action: "from_popup", data: "get_state" }, function(response) {
    var msg = response.message;
    if (msg.type_system == 0) {
        system.value = '已关闭'
        systemState = 0;
    }
    if (msg.type_system == 1) {
        system.value = '已开启'
        systemState = 1;
    }
    if (msg.type_wx == 0) {
        wx.value = '已关闭'
        wxState = 0;
    }
    if (msg.type_wx == 1) {
        wx.value = '已开启'
        wxState = 1;
    }
});

