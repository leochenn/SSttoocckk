const plugin_search_but = document.getElementById('plugin_search_but')
const plugin_search_state = document.getElementById('plugin_search_state')

plugin_search_but.onclick = function () {
    if (state == 0) {
        state = 1;
        chrome.runtime.sendMessage({
            action: 'from_popup',
            message: 'open'
        });
        plugin_search_state.value = '已开启'
    } else {
        state = 0;
        chrome.runtime.sendMessage({
            action: 'from_popup',
            message: 'close'
        });
        plugin_search_state.value = '已关闭'
    }
}

var state = 0;

chrome.runtime.sendMessage({ action: "from_popup", data: "get_state" }, function(response) {
    var aState = response.message;
    if (aState == 0) {
        plugin_search_state.value = '已关闭'
        state = 0;
    } else {
        plugin_search_state.value = '已开启'
        state = 1;
    }    
});

