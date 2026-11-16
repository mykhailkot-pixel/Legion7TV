import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchImg: vi.fn(),
    getLoadedImgUrl: vi.fn()
}));
vi.mock('../src/emotes/imgcache.js', () => mocks);

import { EM, st } from '../src/core/state.js';
import { reload, setEmoteImage, urlFor } from '../src/emotes/emotes.js';
import { store } from '../src/core/store.js';
import { STORE } from '../src/core/consts.js';

function sendCatalog(channel, entries, base) {
    window.dispatchEvent(new MessageEvent('message', {
        source: window,
        origin: location.origin,
        data: { source: 't7-site-emotes', channel, entries, base }
    }));
}

describe('site-native emote catalog', () => {
    beforeEach(() => {
        for (const key of Object.keys(EM)) delete EM[key];
        st.hooks.emotes = vi.fn();
        st.hooks.status = vi.fn();
        mocks.fetchImg.mockReset().mockResolvedValue('blob:cached');
        mocks.getLoadedImgUrl.mockReset().mockReturnValue('');
    });

    it('uses the channel catalog and rejects catalog messages from another route', () => {
        const id = '0123456789abcdefghij';
        sendCatalog('/another-channel', [['Kappa', id]]);
        expect(Object.keys(EM)).toEqual([]);

        sendCatalog(location.pathname, [['Kappa', id], ['Bad Name', id], ['Invalid', 'x']], 'https://evil.test');
        expect(Object.keys(EM)).toEqual(['Kappa']);
        expect(EM.Kappa.native).toBe(true);
        expect(urlFor(EM.Kappa, 2))
            .toBe(`https://cdn.7tv.app/emote/${id}/2x.webp`);
        expect(store.get(STORE.siteEmoteCatalogPrefix + encodeURIComponent(location.pathname)))
            .toEqual({ base: location.origin, entries: [['Kappa', id]] });
        expect(st.hooks.emotes).toHaveBeenCalledOnce();
    });

    it('does not rebuild the emote grid when the site republishes an unchanged catalog', () => {
        const kappaId = '0123456789abcdefghij';
        const pogId = 'abcdefghij0123456789';
        sendCatalog(location.pathname, [['Kappa', kappaId]]);
        sendCatalog(location.pathname, [['Kappa', kappaId]]);
        expect(st.hooks.emotes).toHaveBeenCalledOnce();

        sendCatalog(location.pathname, [['Kappa', kappaId], ['Pog', pogId]]);
        expect(st.hooks.emotes).toHaveBeenCalledTimes(2);
        expect(Object.keys(EM)).toEqual(['Kappa', 'Pog']);
    });

    it('loads popup images through the extension-backed cache', async () => {
        const id = '0123456789abcdefghij';
        sendCatalog(location.pathname, [['Pog', id]]);
        const image = document.createElement('img');

        await setEmoteImage(image, EM.Pog, 2);

        expect(mocks.fetchImg).toHaveBeenCalledWith(
            `https://cdn.7tv.app/emote/${id}/2x.webp`, false
        );
        expect(image.src).toBe('blob:cached');
    });

    it('restores a previously saved channel catalog before the site sends it again', async () => {
        const id = '0123456789abcdefghij';
        sendCatalog(location.pathname, [['Pog', id]]);
        for (const key of Object.keys(EM)) delete EM[key];

        await reload(false);
        expect(EM.Pog.id).toBe(id);
        expect(st.status).toBe('Смайлы канала: 1');
    });

    it('falls back to the site image when the cached CDN request fails', async () => {
        const id = '0123456789abcdefghij';
        sendCatalog(location.pathname, [['Pog', id]], location.origin);
        mocks.fetchImg.mockRejectedValueOnce(new Error('offline'));
        const image = document.createElement('img');

        await setEmoteImage(image, EM.Pog, 1);

        expect(image.src).toBe(`${location.origin}/api/emote/7tv/${id}/1x.webp`);
    });
});
