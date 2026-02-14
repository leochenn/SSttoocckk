/**
 * 雪球监控助手 - 拖拽排序管理模块
 * 封装 HTML5 拖拽及长按触发逻辑。
 */

export class DragDropManager {
    constructor(options) {
        this.selector = options.selector; // 触发拖拽的行选择器
        this.onReorder = options.onReorder; // 排序完成后的回调 (fromIndex, toIndex)
        this.dragState = {
            draggedElement: null,
            draggedIndex: -1,
            longPressTimer: null,
            isDragging: false,
            startY: 0,
            startX: 0
        };
    }

    init(container = document) {
        const rows = container.querySelectorAll(this.selector);
        rows.forEach(row => {
            row.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            row.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        });
    }

    handleMouseDown(e) {
        if (e.target.matches('.delete-btn, .ytd-price-input-watchlist')) return;
        this.startLongPress(e.currentTarget, e.clientX, e.clientY);
        
        const onMouseMove = (ev) => this.handleMouseMove(ev);
        const onMouseUp = () => {
            this.handleMouseUp();
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    handleTouchStart(e) {
        if (e.target.matches('.delete-btn, .ytd-price-input-watchlist')) return;
        const touch = e.touches[0];
        this.startLongPress(e.currentTarget, touch.clientX, touch.clientY);

        const onTouchMove = (ev) => this.handleTouchMove(ev);
        const onTouchEnd = () => {
            this.handleTouchEnd();
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }

    startLongPress(element, x, y) {
        this.dragState.startX = x;
        this.dragState.startY = y;
        if (this.dragState.longPressTimer) clearTimeout(this.dragState.longPressTimer);

        this.dragState.longPressTimer = setTimeout(() => {
            this.activateDragMode(element);
        }, 500);
        element.classList.add('long-press-active');
    }

    activateDragMode(element) {
        this.dragState.isDragging = true;
        this.dragState.draggedElement = element;
        this.dragState.draggedIndex = parseInt(element.dataset.index);

        element.classList.remove('long-press-active');
        element.classList.add('dragging');
        element.draggable = true;

        element.addEventListener('dragstart', (e) => this.handleDragStart(e));
        element.addEventListener('dragend', () => this.handleDragEnd());

        const allRows = document.querySelectorAll(this.selector);
        allRows.forEach(row => {
            row.addEventListener('dragover', (e) => this.handleDragOver(e));
            row.addEventListener('drop', (e) => this.handleDrop(e));
        });
    }

    handleMouseMove(e) {
        if (this.dragState.longPressTimer && !this.dragState.isDragging) {
            const deltaX = Math.abs(e.clientX - this.dragState.startX);
            const deltaY = Math.abs(e.clientY - this.dragState.startY);
            if (deltaX > 10 || deltaY > 10) this.cancelLongPress();
        }
    }

    handleTouchMove(e) {
        if (this.dragState.longPressTimer && !this.dragState.isDragging) {
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - this.dragState.startX);
            const deltaY = Math.abs(touch.clientY - this.dragState.startY);
            if (deltaX > 10 || deltaY > 10) this.cancelLongPress();
        }
        if (this.dragState.isDragging) e.preventDefault();
    }

    handleMouseUp() {
        if (this.dragState.isDragging) this.cleanupDragState();
        else this.cancelLongPress();
    }

    handleTouchEnd() {
        if (this.dragState.isDragging) this.cleanupDragState();
        else this.cancelLongPress();
    }

    cancelLongPress() {
        if (this.dragState.longPressTimer) {
            clearTimeout(this.dragState.longPressTimer);
            this.dragState.longPressTimer = null;
        }
        const activeElement = document.querySelector('.long-press-active');
        if (activeElement) activeElement.classList.remove('long-press-active');
        if (!this.dragState.isDragging) {
            this.dragState.draggedElement = null;
            this.dragState.draggedIndex = -1;
        }
    }

    handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetRow = e.currentTarget;
        if (targetRow === this.dragState.draggedElement) return;

        document.querySelectorAll('.drag-over, .drag-over-bottom').forEach(el => {
            el.classList.remove('drag-over', 'drag-over-bottom');
        });

        const rect = targetRow.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) targetRow.classList.add('drag-over');
        else targetRow.classList.add('drag-over-bottom');
    }

    handleDrop(e) {
        e.preventDefault();
        const targetRow = e.currentTarget;
        const targetIndex = parseInt(targetRow.dataset.index);
        if (targetRow === this.dragState.draggedElement) return;

        const rect = targetRow.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midY;

        let newIndex = targetIndex;
        if (!insertBefore) newIndex = targetIndex + 1;
        if (this.dragState.draggedIndex < newIndex) newIndex--;

        if (this.onReorder) this.onReorder(this.dragState.draggedIndex, newIndex);
        this.cleanupDragState();
    }

    handleDragEnd() {
        this.cleanupDragState();
    }

    cleanupDragState() {
        document.querySelectorAll('.dragging, .drag-over, .drag-over-bottom, .long-press-active').forEach(el => {
            el.classList.remove('dragging', 'drag-over', 'drag-over-bottom', 'long-press-active');
        });
        if (this.dragState.longPressTimer) clearTimeout(this.dragState.longPressTimer);

        this.dragState = {
            draggedElement: null,
            draggedIndex: -1,
            longPressTimer: null,
            isDragging: false,
            startY: 0,
            startX: 0
        };
    }
}
