/**
 * 专门负责雪球页面的 DOM 解析
 */
export const DomParser = {
    SELECTORS: {
        FOLLOW_TAB_CONTAINER: '.home-timeline-tabs .sticky-content-fixed',
        STATUS_LIST: '.status-list',
        TIMELINE_ITEM: '.status-list article.timeline__item',
        POST_CONTENT: '.timeline__item__content .content--description',
        USER_NAME: '.user-name',
        LOADING_INDICATORS: '.status-list .loading, .status-list .loading-icon, .status-list .loading-text',
        SYSTEM_MSG_ITEM: 'li[data-analytics-data*="系统消息"]'
    },

    getTopPostDetails(root = document) {
        const posts = root.querySelectorAll(this.SELECTORS.TIMELINE_ITEM);
        if (posts.length === 0) {
            return { error: 'NO_POSTS' };
        }

        const firstPost = posts[0];
        const contentEl = firstPost.querySelector(this.SELECTORS.POST_CONTENT);
        if (!contentEl) return { error: 'NO_CONTENT_DESCRIPTION' };

        const userEl = firstPost.querySelector(this.SELECTORS.USER_NAME);
        const userName = userEl ? (userEl.textContent || '').trim() : '未知用户';
        const postContent = (contentEl.textContent || '').trim();
        const topSignature = `${userName}: ${postContent}`;
        
        let consecutiveCount = 0;
        for (const post of posts) {
            const curUser = post.querySelector(this.SELECTORS.USER_NAME);
            const curCont = post.querySelector(this.SELECTORS.POST_CONTENT);
            if (curUser && curCont) {
                const curSig = `${(curUser.textContent || '').trim()}: ${(curCont.textContent || '').trim()}`;
                if (curSig === topSignature) consecutiveCount++;
                else break;
            } else break;
        }
        
        return { signature: topSignature, count: consecutiveCount };
    },

    getSystemMessageUnreadCount(root = document) {
        const messageItem = root.querySelector(this.SELECTORS.SYSTEM_MSG_ITEM);
        if (!messageItem) return { count: 0, hasUnread: false };
        const countSpan = messageItem.querySelector('span');
        const count = countSpan ? parseInt(countSpan.textContent || '0', 10) : 0;
        return { count: isNaN(count) ? 0 : count, hasUnread: count > 0 };
    }
};
