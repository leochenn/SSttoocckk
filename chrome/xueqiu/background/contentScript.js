// 雪球页面滑动到顶部
console.log('leo:雪球页面滑动到顶部')
window.scrollTo(0, 0);
const elementToClick = document.querySelector('.timeline__tab__tags a.active')
if (elementToClick && elementToClick.textContent.trim() === '全部') {
	console.log('leo:点击全部，进行刷新');
	elementToClick.click();
} else {
	console.log('leo:Element not found');
}