import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureExtensionStore, store } from '../src/core/store.js';
import { EM } from '../src/core/state.js';
import { getVirtualGridWindow, recordRecentFromMessage } from '../src/emotes/popup.js';

describe('emote popup recent history', () => {
    beforeEach(() => {
        configureExtensionStore({}, vi.fn().mockResolvedValue(undefined));
        for (const key of Object.keys(EM)) delete EM[key];
    });

    it('records only known emote tokens, de-duplicates by name, and honors the recent limit', () => {
        EM.Kappa = { base: 'https://cdn.test/kappa', f: ['1x.webp'] };
        EM.Pog = { base: 'https://cdn.test/pog', f: ['1x.webp'] };
        store.set('t7recentLimit', 2);
        recordRecentFromMessage('Kappa unknown Pog Kappa');
        expect(store.get('t7recent').map((entry) => entry.name)).toEqual(['Pog', 'Kappa']);
        expect(store.get('t7recent')[1]).toEqual({ name: 'Kappa' });
        recordRecentFromMessage('unknown');
        expect(store.get('t7recent').map((entry) => entry.name)).toEqual(['Pog', 'Kappa']);
    });

    it('keeps only the visible rows and a small overscan in the DOM window', () => {
        const window = getVirtualGridWindow({
            count: 10000,
            columns: 10,
            rowHeight: 42,
            scrollTop: 4200,
            viewportHeight: 420
        });

        expect(window.startIndex).toBe(960);
        expect(window.endIndex).toBe(1140);
        expect(window.endIndex - window.startIndex).toBeLessThan(250);
        expect(window.top).toBe(4032);
        expect(window.bottom).toBe(37212);
    });
});
