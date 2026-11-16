import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clamp, emit, on, STORE, SEL } from '../src/core/consts.js';
import { has, parseNick } from '../src/core/util.js';
import {
    configureExtensionStore,
    initializeExtensionStore,
    store,
    updateExtensionStore
} from '../src/core/store.js';
import { insertText } from '../src/core/insertText.js';

describe('core constants and helpers', () => {
    it('keeps configuration keys and selectors stable', () => {
        expect(Object.isFrozen(STORE)).toBe(true);
        expect(STORE.pingConfig).toBe('t7ping');
        expect(SEL.chatRoot).toBe('.cy-chat');
        expect(SEL.dmRows).toContain('.dm-l');
    });

    it('clamps numbers and checks own properties only', () => {
        expect(clamp(12, 0, 10)).toBe(10);
        expect(clamp(-1, 0, 10)).toBe(0);
        expect(clamp(5, 0, 10)).toBe(5);
        expect(has({ own: 1 }, 'own')).toBe(true);
        expect(has(Object.create({ inherited: 1 }), 'inherited')).toBe(false);
    });

    it.each([
        [' Alice ', 'alice'],
        ['https://site.test/c/Example?x=1', 'example'],
        ['@USER/', 'user'],
        ['bad nick', ''],
        ['a'.repeat(26), '']
    ])('normalizes nick %s', (input, expected) => {
        expect(parseNick(input)).toBe(expected);
    });

    it('emits extension-local events and returns an unsubscribe callback', () => {
        const listener = vi.fn();
        const off = on('unit-event', listener);
        const event = emit('unit-event', { value: 1 });
        expect(listener).toHaveBeenCalledOnce();
        expect(listener.mock.calls[0][0].detail).toEqual({ value: 1 });
        expect(event.type).toBe('unit-event');
        off();
        emit('unit-event');
        expect(listener).toHaveBeenCalledOnce();
    });
});

describe('extension store', () => {
    beforeEach(() => {
        configureExtensionStore({}, vi.fn().mockResolvedValue(undefined));
    });

    it('reads, writes, and updates values in the local snapshot', () => {
        store.set('key', 1);
        expect(store.get('key')).toBe(1);
        updateExtensionStore('key', 2);
        expect(store.get('key')).toBe(2);
    });

    it('initializes through the extension storage API', async () => {
        const get = vi.fn().mockResolvedValue({ saved: true });
        const set = vi.fn().mockResolvedValue(undefined);
        globalThis.chrome = { storage: { local: { get, set } } };
        try {
            expect(await initializeExtensionStore()).toBe(true);
            expect(store.get('saved')).toBe(true);
            store.set('next', 3);
            await Promise.resolve();
            expect(set).toHaveBeenCalledWith({ next: 3 });
        } finally {
            delete globalThis.chrome;
        }
    });

    it('reports an unavailable extension storage API without claiming initialization', async () => {
        delete globalThis.chrome;
        delete globalThis.browser;
        expect(await initializeExtensionStore()).toBe(false);
    });
});

describe('insertText', () => {
    beforeEach(() => {
        vi.stubGlobal('matchMedia', () => ({ matches: false }));
        vi.spyOn(document, 'execCommand').mockReturnValue(false);
    });

    it('replaces only the selected range and emits an insertText input event', () => {
        const input = document.createElement('input');
        input.value = 'hello world';
        document.body.append(input);
        input.setSelectionRange(6, 11);
        const events = [];
        input.addEventListener('input', (event) => events.push(event));

        expect(insertText(input, 'chat')).toBe(true);
        expect(input.value).toBe('hello chat');
        expect(events).toHaveLength(1);
        expect(events[0].inputType).toBe('insertText');
        expect(events[0].data).toBe('chat');
    });

    it('replaces an explicit range and positions the caret after inserted text', () => {
        const area = document.createElement('textarea');
        area.value = 'abcdef';
        document.body.append(area);
        expect(insertText(area, 'XY', { replaceRange: { start: 2, end: 4 } })).toBe(true);
        expect(area.value).toBe('abXYef');
        expect(area.selectionStart).toBe(4);
        expect(area.selectionEnd).toBe(4);
    });

    it('does not partially insert past maxLength or mutate disabled/detached inputs', () => {
        const input = document.createElement('input');
        input.maxLength = 4;
        input.value = 'abcd';
        document.body.append(input);
        expect(insertText(input, '!')).toBe(false);
        expect(input.value).toBe('abcd');
        input.disabled = true;
        expect(insertText(input, 'x')).toBe(false);
        input.disabled = false;
        input.remove();
        expect(insertText(input, 'x')).toBe(false);
    });
});
