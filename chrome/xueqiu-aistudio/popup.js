document.addEventListener('DOMContentLoaded', () => {
    const monitorTimeline = document.getElementById('monitorTimeline');
    const monitorSystemMessages = document.getElementById('monitorSystemMessages');
    const intervalInput = document.getElementById('interval');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');

    // Load settings from storage
    chrome.storage.local.get(['settings', 'status'], (result) => {
        const settings = result.settings || {};
        monitorTimeline.checked = settings.monitorTimeline !== false; // default to true
        monitorSystemMessages.checked = settings.monitorSystemMessages !== false; // default to true
        intervalInput.value = settings.interval || 10;
        
        const status = result.status || { state: 'stopped', message: '等待初始化' };
        updateStatus(status);
    });

    // Save settings on change
    monitorTimeline.addEventListener('change', saveSettings);
    monitorSystemMessages.addEventListener('change', saveSettings);
    intervalInput.addEventListener('change', saveSettings);
    intervalInput.addEventListener('keyup', saveSettings);

    function saveSettings() {
        const intervalValue = Math.max(3, Math.min(60, parseInt(intervalInput.value, 10) || 10));
        intervalInput.value = intervalValue;

        const settings = {
            monitorTimeline: monitorTimeline.checked,
            monitorSystemMessages: monitorSystemMessages.checked,
            interval: intervalValue,
        };
        chrome.storage.local.set({ settings }, () => {
            // Notify background script to update the alarm
            chrome.runtime.sendMessage({ type: 'settingsChanged', settings });
            updateStatus({ state: 'running', message: '设置已保存, 监控运行中...' });
        });
    }

    function updateStatus(status) {
        statusText.textContent = status.message;
        switch(status.state) {
            case 'running':
                statusIndicator.style.backgroundColor = 'green';
                break;
            case 'paused':
                statusIndicator.style.backgroundColor = 'gray';
                break;
            case 'error':
                statusIndicator.style.backgroundColor = 'red';
                break;
            default:
                statusIndicator.style.backgroundColor = 'gray';
        }
    }
    
    // Listen for status updates from the background script
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'statusUpdate') {
            updateStatus(message.status);
        }
    });
});