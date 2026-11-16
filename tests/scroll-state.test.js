import { describe, expect, it, vi } from 'vitest';
import { chatScroller } from '../src/chat/messages/scrollState.js';

function setScrollMetrics(element, { top = 0, height = 100, viewport = 20 } = {}) {
    Object.defineProperties(element, {
        scrollTop: { configurable: true, writable: true, value: top },
        scrollHeight: { configurable: true, value: height },
        clientHeight: { configurable: true, value: viewport }
    });
}

describe('chat scroll state', () => {
    it('finds supported chat scroll containers and detects proximity to the end', () => {
        const list = document.createElement('ul');
        list.className = 'cy-chat-l';
        setScrollMetrics(list, { top: 79, height: 100, viewport: 20 });
        expect(chatScroller.getContainer(list)).toBe(list);
        expect(chatScroller.isAtEnd(list)).toBe(true);
        list.scrollTop = 0;
        expect(chatScroller.isAtEnd(list)).toBe(false);
    });

    it('runs mutations once for unrelated elements and ignores absent lists', () => {
        const mutate = vi.fn(() => 'done');
        const element = document.createElement('div');
        expect(chatScroller.preserve(element, mutate)).toBe('done');
        expect(mutate).toHaveBeenCalledOnce();
        expect(chatScroller.captureEndIntent(null)).toBeNull();
        expect(chatScroller.scrollToEnd(null)).toBeUndefined();
    });

    it('scrolls a list to its measured end', () => {
        const list = document.createElement('ul');
        list.className = 'dm-l';
        setScrollMetrics(list, { top: 0, height: 500, viewport: 100 });
        chatScroller.scrollToEnd(list);
        expect(list.scrollTop).toBe(400);
    });

    it('keeps the end after programmatic scrolling but follows user scrolling', () => {
        chatScroller.start();
        const list = document.createElement('ul');
        list.className = 'cy-chat-l';
        setScrollMetrics(list, { top: 400, height: 500, viewport: 100 });
        document.body.appendChild(list);
        chatScroller.scrollToEnd(list);

        list.scrollTop = 300;
        list.dispatchEvent(new Event('scroll'));
        expect(list.scrollTop).toBe(400);

        list.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
        list.scrollTop = 250;
        list.dispatchEvent(new Event('scroll'));
        expect(list.scrollTop).toBe(250);
        list.remove();
    });
});
