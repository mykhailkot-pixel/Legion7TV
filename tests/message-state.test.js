import { describe, expect, it } from 'vitest';
import {
    copyOriginalMessageSource,
    getOriginalMessageSource,
    isMessageProcessed,
    markMessageProcessed,
    unmarkMessageProcessed
} from '../src/chat/messages/messageState.js';

describe('message processing state', () => {
    it('tracks processed messages by element identity', () => {
        const first = document.createElement('li');
        const second = document.createElement('li');
        expect(isMessageProcessed(first)).toBe(false);
        markMessageProcessed(first);
        expect(isMessageProcessed(first)).toBe(true);
        expect(isMessageProcessed(second)).toBe(false);
        unmarkMessageProcessed(first);
        expect(isMessageProcessed(first)).toBe(false);
    });

    it('preserves the original source through cloned message content', () => {
        const original = document.createElement('span');
        const clone = document.createElement('span');
        expect(getOriginalMessageSource(original, 'original')).toBe('original');
        copyOriginalMessageSource(original, clone);
        expect(getOriginalMessageSource(clone, 'transformed')).toBe('original');
        expect(getOriginalMessageSource(document.createElement('span'), 'fallback')).toBe('fallback');
    });
});
