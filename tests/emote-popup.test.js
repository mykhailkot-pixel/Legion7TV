import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureExtensionStore, store } from '../src/core/store.js';
import { EM, st } from '../src/core/state.js';
vi.mock('../src/settings/settings.js', () => ({ openSettings: vi.fn() }));
import {
    getVirtualGridWindow,
    reconcileGridItems,
    recordRecentFromMessage,
    toggleFavorite
} from '../src/emotes/popup.js';

describe('emote popup recent history', () => {
    beforeEach(() => {
        configureExtensionStore({}, vi.fn().mockResolvedValue(undefined));
        for (const key of Object.keys(EM)) delete EM[key];
        st.pop = null;
        st.io = null;
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

    it('keeps overlapping emote items attached when the virtual window advances', () => {
        const grid = document.createElement('div');
        const [leaving, retained, added] = Array.from({ length: 3 }, () => document.createElement('div'));
        const nextRetained = document.createElement('div');
        grid.append(leaving, retained, nextRetained);
        const observer = new MutationObserver(() => {});
        observer.observe(grid, { childList: true });

        reconcileGridItems(grid, [retained, nextRetained, added]);

        const removedNodes = observer.takeRecords().flatMap((record) => [...record.removedNodes]);
        expect([...grid.children]).toEqual([retained, nextRetained, added]);
        expect(removedNodes).toContain(leaving);
        expect(removedNodes).not.toContain(retained);
        expect(removedNodes).not.toContain(nextRetained);
    });

    it('updates favorite controls without rebuilding the emote grid', () => {
        EM.Emote = { base: 'https://cdn.test/emote', f: ['1x.webp'] };
        const popup = document.createElement('div');
        const grid = document.createElement('div');
        grid.className = 't7-gr';
        grid.scrollTop = 850;
        const item = document.createElement('div');
        const image = document.createElement('img');
        const favorite = document.createElement('button');
        favorite.className = 't7-fav';
        favorite.dataset.name = 'Emote';
        favorite.textContent = '☆';
        item.append(image, favorite);
        grid.append(item);
        popup.append(grid);
        document.body.append(popup);
        st.pop = popup;

        toggleFavorite('Emote');

        expect(grid.querySelector('img')).toBe(image);
        expect(grid.scrollTop).toBe(850);
        expect(favorite.textContent).toBe('★');
        expect(favorite.getAttribute('aria-pressed')).toBe('true');
        st.pop = null;
        popup.remove();
    });
});
