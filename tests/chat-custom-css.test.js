import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyChatCustomCss } from '../src/chat/ui/chatCustomCss.js';

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

    it('allows direct HTTPS image URLs and rejects unsafe URL schemes and local hosts', () => {
        const css = '.cy-chat { background-image: url("https://cdn.example.com/brass.webp"); }';
        applyChatCustomCss(css);
        expect(adoptedStyleSheets[0].cssRules[0].style.cssText).toContain('https://cdn.example.com/brass.webp');

        expect(() => applyChatCustomCss('.cy-chat { background: url(http://cdn.example.com/image.png); }'))
            .toThrow('только HTTPS-ссылки');
        expect(() => applyChatCustomCss('.cy-chat { background: url(https://127.0.0.1/image.png); }'))
            .toThrow('публичный HTTPS-домен');
        expect(() => applyChatCustomCss('.cy-chat { background: url(https://printer.local/image.png); }'))
            .toThrow('публичный HTTPS-домен');
        expect(() => applyChatCustomCss('.cy-chat { background: url(data:image/png;base64,abc); }'))
            .toThrow('только HTTPS-ссылки');
        expect(() => applyChatCustomCss('.cy-chat { background: url(https://user:pass@cdn.example.com/image.png); }'))
            .toThrow('без логина и пароля');
    });

    it('does not interpret url-like text strings as image loads and rejects unsupported at-rules', () => {
        expect(() => applyChatCustomCss('.cy-chat::before { content: "url(http://127.0.0.1/image.png)"; }'))
            .not.toThrow();
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
