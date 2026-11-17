import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyChatCustomCss, applyChatTheme } from '../src/chat/ui/chatCustomCss.js';

function parseRules(cssText) {
    const rules = [];
    let index = 0;

    while (index < cssText.length) {
        while (/\s/.test(cssText[index] || '')) index += 1;
        if (index >= cssText.length) break;

        const open = cssText.indexOf('{', index);
        if (open < 0) throw new Error('Invalid CSS');
        const header = cssText.slice(index, open).trim();
        let depth = 1;
        let close = open + 1;
        while (close < cssText.length && depth > 0) {
            if (cssText[close] === '{') depth += 1;
            else if (cssText[close] === '}') depth -= 1;
            close += 1;
        }
        if (depth !== 0) throw new Error('Invalid CSS');

        const body = cssText.slice(open + 1, close - 1);
        if (header.startsWith('@media')) {
            rules.push({ type: 4, cssRules: parseRules(body) });
        } else if (header.startsWith('@')) {
            rules.push({ type: 99 });
        } else {
            rules.push({ type: 1, selectorText: header, style: { cssText: body } });
        }
        index = close;
    }

    return rules;
}

class TestStyleSheet {
    replaceSync(cssText) {
        this.cssRules = parseRules(cssText);
    }
}

function pngAssetData() {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    bytes.set([0x49, 0x48, 0x44, 0x52], 12);
    bytes[19] = 1;
    bytes[23] = 1;
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

describe('chat custom CSS', () => {
    let adoptedStyleSheets;

    beforeEach(() => {
        adoptedStyleSheets = [];
        Object.defineProperty(document, 'adoptedStyleSheets', {
            configurable: true,
            get: () => adoptedStyleSheets,
            set: (sheets) => { adoptedStyleSheets = sheets; }
        });
        vi.stubGlobal('CSSStyleSheet', TestStyleSheet);
        applyChatCustomCss('');
    });

    it('applies scoped rules, including media queries, as a document stylesheet', () => {
        const css = '.cy-chat .cy-chat-l li { color: #fff; } @media (max-width: 700px) { .cy-chat { width: 100%; } }';

        applyChatCustomCss(css);

        expect(adoptedStyleSheets).toHaveLength(1);
        expect(adoptedStyleSheets[0].cssRules).toHaveLength(2);
    });

    it('rejects selectors outside the chat without replacing the active stylesheet', () => {
        applyChatCustomCss('.cy-chat { color: white; }');
        const activeSheet = adoptedStyleSheets[0];

        expect(() => applyChatCustomCss('.cy-chat, body { color: red; }'))
            .toThrow('Каждый селектор должен начинаться');
        expect(() => applyChatCustomCss('.cy-chat-l li { color: red; }'))
            .toThrow('Каждый селектор должен начинаться');
        expect(adoptedStyleSheets).toEqual([activeSheet]);
    });

    it('resolves saved image assets and rejects external URLs or unsupported at-rules', () => {
        const asset = {
            mime: 'image/png',
            data: pngAssetData(),
            width: 1,
            height: 1
        };
        applyChatTheme({
            version: 1,
            css: '.cy-chat { background-image: url("t7-asset:brass"); }',
            assets: { brass: asset }
        });
        expect(adoptedStyleSheets[0].cssRules[0].style.cssText)
            .toContain(`url("data:image/png;base64,${pngAssetData()}")`);

        expect(() => applyChatCustomCss('.cy-chat { background: url(https://example.com/image.png); }'))
            .toThrow('Внешние CSS-ссылки запрещены');
        expect(() => applyChatTheme({
            version: 1,
            css: '.cy-chat { background: url("t7-asset:missing"); }',
            assets: {}
        })).toThrow('нет изображения');
        expect(() => applyChatCustomCss('@font-face { font-family: test; }'))
            .toThrow('только CSS-правила чата и медиазапросы');
    });

    it('replaces or removes the previously applied stylesheet', () => {
        applyChatCustomCss('.cy-chat { color: white; }');
        applyChatCustomCss('.cy-chat { color: black; }');
        expect(adoptedStyleSheets).toHaveLength(1);
        expect(adoptedStyleSheets[0].cssRules[0].style.cssText).toContain('black');

        applyChatCustomCss('');
        expect(adoptedStyleSheets).toHaveLength(0);
    });
});
