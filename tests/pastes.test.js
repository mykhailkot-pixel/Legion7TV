import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    insertText: vi.fn(),
    updateChatButtons: vi.fn()
}));
vi.mock('../src/core/ui.js', () => ({ getOverlayRoot: () => document.body }));
vi.mock('../src/core/insertText.js', () => ({ insertText: mocks.insertText }));
vi.mock('../src/chat/ui/chatButtonState.js', () => ({ updateChatButtons: mocks.updateChatButtons }));

import { configureExtensionStore, store } from '../src/core/store.js';
import { openPastes, setPastesEnabled } from '../src/chat/ui/pastes.js';

const fillAndSubmit = (dialog, name, text) => {
    dialog.querySelector('.t7-paste-add').click();
    const form = dialog.querySelector('.t7-paste-editor');
    form.querySelector('input').value = name;
    form.querySelector('textarea').value = text;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
};

describe('saved pastes', () => {
    beforeEach(() => {
        configureExtensionStore({}, vi.fn().mockResolvedValue(undefined));
        mocks.insertText.mockReset();
        setPastesEnabled(false);
        setPastesEnabled(true);
    });

    it('creates, edits, deletes, and inserts saved text', () => {
        const input = document.createElement('textarea');
        document.body.append(input);
        openPastes(input);
        const dialog = document.querySelector('.t7-paste-dialog');
        fillAndSubmit(dialog, 'Greeting', 'Hello!');
        expect(store.get('t7Pastes')).toEqual([{ name: 'Greeting', text: 'Hello!' }]);

        dialog.querySelector('.t7-paste-edit').click();
        const form = dialog.querySelector('.t7-paste-editor');
        expect(form.querySelector('input').value).toBe('Greeting');
        form.querySelector('textarea').value = 'Hi!';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(store.get('t7Pastes')[0].text).toBe('Hi!');

        dialog.querySelector('.t7-paste-item').click();
        expect(mocks.insertText).toHaveBeenCalledWith(input, 'Hi!');
        expect(document.querySelector('.t7-paste-dialog')).toBeNull();

        openPastes(input);
        document.querySelector('.t7-paste-delete').click();
        expect(store.get('t7Pastes')).toEqual([]);
    });

    it('requires the feature to be enabled and closes the active dialog when disabled', () => {
        const input = document.createElement('input');
        document.body.append(input);
        setPastesEnabled(false);
        openPastes(input);
        expect(document.querySelector('.t7-paste-dialog')).toBeNull();
        setPastesEnabled(true);
        openPastes(input);
        expect(document.querySelector('.t7-paste-dialog')).not.toBeNull();
        setPastesEnabled(false);
        expect(document.querySelector('.t7-paste-dialog')).toBeNull();
        expect(mocks.updateChatButtons).toHaveBeenLastCalledWith('pastes', false);
    });
});
