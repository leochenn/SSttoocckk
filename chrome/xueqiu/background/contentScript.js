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

function log(data) {
  console.log(getTime() + ' leo:' + JSON.stringify(data))
}

function doClick() {
  var elementToClick = document.querySelector('.timeline__tab__tags a.active')
  if (elementToClick && elementToClick.textContent.trim() === '全部') {
    log('leo:点击全部，进行刷新');
    elementToClick.click();
  } else {
    log('leo:Element not found');
  }
}

// 雪球页面滑动到顶部
log('leo:雪球页面滑动到顶部')
window.scrollTo(0, 0);
doClick();
