/**
 * 雪球监控助手 - UI 动画模块
 * 负责时间数字滚动等视觉特效。
 */

export class UIAnimator {
    constructor() {
        this.lastTimeDigits = null;
    }

    /**
     * 初始化时间数字容器
     */
    initializeTimeDigits() {
        const timeElement = document.getElementById('last-update-time');
        if (!timeElement) return;
        const digits = timeElement.querySelectorAll('.time-digit');
        
        digits.forEach(digit => {
            if (!digit.querySelector('.digit-container')) {
                digit.innerHTML = '<div class="digit-container"><div class="digit-value current">0</div></div>';
            }
        });
    }

    /**
     * 带动画更新时间显示
     */
    updateTimeWithAnimation(newTimeText) {
        const timeMatch = newTimeText.match(/(\d{2})时\s*(\d{2})分\s*(\d{2})秒/);
        if (!timeMatch) return;
        
        const [, hours, minutes, seconds] = timeMatch;
        const newDigits = {
            h1: hours[0], h2: hours[1],
            m1: minutes[0], m2: minutes[1],
            s1: seconds[0], s2: seconds[1]
        };
        
        this.initializeTimeDigits();
        
        if (!this.lastTimeDigits) {
            Object.keys(newDigits).forEach(position => {
                this.updateDigit(position, newDigits[position], false);
            });
            this.lastTimeDigits = newDigits;
            return;
        }
        
        Object.keys(newDigits).forEach(position => {
            if (this.lastTimeDigits[position] !== newDigits[position]) {
                this.updateDigit(position, newDigits[position], true);
            }
        });
        
        this.lastTimeDigits = newDigits;
    }

    /**
     * 更新单个数字位
     */
    updateDigit(position, newValue, animate = true) {
        const digitElement = document.querySelector(`[data-position="${position}"]`);
        if (!digitElement) return;
        
        const container = digitElement.querySelector('.digit-container');
        if (!container) return;
        
        if (!animate) {
            container.innerHTML = `<div class="digit-value current">${newValue}</div>`;
            return;
        }
        
        const oldElements = container.querySelectorAll('.digit-value:not(.current)');
        oldElements.forEach(el => el.remove());
        
        const currentValueElement = container.querySelector('.digit-value.current');
        if (currentValueElement && currentValueElement.textContent === newValue) return;
        
        const newValueElement = document.createElement('div');
        newValueElement.className = 'digit-value slide-in-down';
        newValueElement.textContent = newValue;
        container.appendChild(newValueElement);
        
        requestAnimationFrame(() => {
            if (currentValueElement) {
                currentValueElement.classList.add('slide-out-up');
                currentValueElement.classList.remove('current');
            }
            requestAnimationFrame(() => {
                newValueElement.classList.remove('slide-in-down');
                newValueElement.classList.add('current');
            });
        });
        
        setTimeout(() => {
            const elementsToRemove = container.querySelectorAll('.digit-value:not(.current)');
            elementsToRemove.forEach(el => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
        }, 350);
    }
}
