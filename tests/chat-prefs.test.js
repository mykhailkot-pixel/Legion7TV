import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureExtensionStore, store } from '../src/core/store.js';
import { EV, on } from '../src/core/consts.js';
import {
    CHAT_TABS,
    createPref,
    getChatTabPrefs,
    getRecentLimit,
    setChatTabPrefs,
    setRecentLimit
} from '../src/chat/prefs.js';

describe('chat preferences', () => {
    beforeEach(() => configureExtensionStore({}, vi.fn().mockResolvedValue(undefined)));

    it('applies custom reads and writes to a preference', () => {
        const pref = createPref('scaled', { read: (value) => value * 2, write: (value) => value / 2 });
        pref.set(10);
        expect(store.get('scaled')).toBe(5);
        expect(pref.get()).toBe(10);
    });

    it('repairs invalid tab preferences and keeps general first and one tab visible', () => {
        const tabs = getChatTabPrefs();
        expect(tabs.order).toEqual(['g', 'tr', 'mn', 'gl', 'dm']);
        setChatTabPrefs({
            order: ['dm', 'unknown', 'mn', 'dm'],
            hidden: ['g', 'tr', 'mn', 'gl', 'dm', 'invalid']
        });
        const normalized = getChatTabPrefs();
        expect(normalized.order[0]).toBe('g');
        expect(normalized.order).toEqual(['g', 'dm', 'mn', 'tr', 'gl']);
        expect(normalized.hidden.size).toBeLessThan(CHAT_TABS.length);
        expect([...normalized.hidden].every((id) => CHAT_TABS.some((tab) => tab.id === id))).toBe(true);
    });

    it('serializes tab preferences and emits a change event', () => {
        const listener = vi.fn();
        const off = on(EV.chatTabsChange, listener);
        setChatTabPrefs({ order: ['g', 'dm'], hidden: new Set(['tr']) });
        expect(store.get('t7ChatTabPrefs')).toEqual({
            order: ['g', 'dm', 'mn', 'tr', 'gl'],
            hidden: ['tr']
        });
        expect(listener).toHaveBeenCalledOnce();
        off();
    });

    it.each([
        [undefined, 20],
        ['invalid', 20],
        [0, 1],
        [3.7, 4],
        [1000, 100]
    ])('normalizes recent limit %s', (input, expected) => {
        if (input !== undefined) store.set('t7recentLimit', input);
        expect(getRecentLimit()).toBe(expected);
    });

    it('trims recent emotes to the new limit', () => {
        store.set('t7recent', ['a', 'b', 'c', 'd']);
        expect(setRecentLimit(2)).toBe(2);
        expect(store.get('t7recent')).toEqual(['c', 'd']);
    });
});
