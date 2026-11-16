import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ updateChatButtons: vi.fn() }));
vi.mock('../src/chat/ui/chatButtonState.js', () => ({ updateChatButtons: mocks.updateChatButtons }));

import { configureExtensionStore, store } from '../src/core/store.js';
import {
    isImagePickerButtonEnabled,
    rememberSentImages,
    setImagePickerButtonEnabled
} from '../src/chat/ui/imagePicker.js';

describe('image picker preferences and recent links', () => {
    beforeEach(() => configureExtensionStore({}, vi.fn().mockResolvedValue(undefined)));

    it('keeps only valid imgBB ids, de-duplicates them, and puts newest first', () => {
        rememberSentImages('https://ibb.co/Old1 and www.ibb.co/New2 [ref]{ibb_co/Old1}');
        expect(store.get('t7Images:recent')).toEqual(['New2', 'Old1']);
        rememberSentImages('https://ibb.co/Last3 and https://ibb.co/New2');
        expect(store.get('t7Images:recent')).toEqual(['New2', 'Last3', 'Old1']);
        rememberSentImages('https://example.com/not-an-id');
        expect(store.get('t7Images:recent')).toEqual(['New2', 'Last3', 'Old1']);
    });

    it('updates the visible preference and registered chat buttons', () => {
        expect(isImagePickerButtonEnabled()).toBe(false);
        setImagePickerButtonEnabled(true);
        expect(isImagePickerButtonEnabled()).toBe(true);
        expect(mocks.updateChatButtons).toHaveBeenLastCalledWith('imagePicker', true);
        setImagePickerButtonEnabled(false);
        expect(mocks.updateChatButtons).toHaveBeenLastCalledWith('imagePicker', false);
    });
});
