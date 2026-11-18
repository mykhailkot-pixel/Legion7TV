import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard } from '../src/settings/clipboard.js';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const originalExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');

function restoreProperty(target, key, descriptor) {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else delete target[key];
}

describe('copyTextToClipboard', () => {
    beforeEach(() => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: undefined
        });
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            writable: true,
            value: vi.fn(() => false)
        });
    });

    afterEach(() => {
        restoreProperty(navigator, 'clipboard', originalClipboard);
        restoreProperty(document, 'execCommand', originalExecCommand);
    });

    it('uses the Clipboard API when available', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText }
        });

        await copyTextToClipboard('theme prompt');

        expect(writeText).toHaveBeenCalledWith('theme prompt');
        expect(document.execCommand).not.toHaveBeenCalled();
    });

    it('falls back to document copy and removes the temporary field', async () => {
        document.execCommand = vi.fn(() => true);

        await copyTextToClipboard('theme prompt');

        expect(document.execCommand).toHaveBeenCalledWith('copy');
        expect(document.querySelector('textarea')).toBeNull();
    });

    it('reports failure when neither copy method succeeds', async () => {
        await expect(copyTextToClipboard('theme prompt'))
            .rejects.toThrow('Не удалось скопировать текст.');
        expect(document.querySelector('textarea')).toBeNull();
    });
});
