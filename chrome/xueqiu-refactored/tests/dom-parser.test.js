import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { DomParser } from '../modules/dom-parser.js';

describe('DomParser', () => {
    let dom;
    let document;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        document = dom.window.document;
    });

    it('should return error when no posts found', () => {
        const result = DomParser.getTopPostDetails(document);
        expect(result.error).toBe('NO_POSTS');
    });

    it('should parse top post details correctly', () => {
        document.body.innerHTML = `
            <div class="status-list">
                <article class="timeline__item">
                    <div class="user-name">张三</div>
                    <div class="timeline__item__content">
                        <div class="content--description">这是第一条帖子</div>
                    </div>
                </article>
                <article class="timeline__item">
                    <div class="user-name">李四</div>
                    <div class="timeline__item__content">
                        <div class="content--description">这是第二条帖子</div>
                    </div>
                </article>
            </div>
        `;

        const result = DomParser.getTopPostDetails(document);
        expect(result.signature).toBe('张三: 这是第一条帖子');
        expect(result.count).toBe(1);
    });

    it('should count consecutive identical posts', () => {
        document.body.innerHTML = `
            <div class="status-list">
                <article class="timeline__item"><div class="user-name">A</div><div class="timeline__item__content"><div class="content--description">X</div></div></article>
                <article class="timeline__item"><div class="user-name">A</div><div class="timeline__item__content"><div class="content--description">X</div></div></article>
                <article class="timeline__item"><div class="user-name">B</div><div class="timeline__item__content"><div class="content--description">Y</div></div></article>
            </div>
        `;

        const result = DomParser.getTopPostDetails(document);
        expect(result.count).toBe(2);
    });

    it('should parse system message count correctly', () => {
        document.body.innerHTML = `
            <ul>
                <li data-analytics-data="[系统消息]">
                    <span>5</span>
                </li>
            </ul>
        `;

        const result = DomParser.getSystemMessageUnreadCount(document);
        expect(result.count).toBe(5);
        expect(result.hasUnread).toBe(true);
    });
});
