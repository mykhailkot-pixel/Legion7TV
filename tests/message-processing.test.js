import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/core/ui.js', () => ({ cls: (name) => `ext-${name}` }));
vi.mock('../src/chat/pingSystem.js', () => ({ pingSystem: { config: { pingColor: '#123456' } } }));

import { processMarkdown } from '../src/chat/messages/markdown.js';
import { processMentions } from '../src/chat/messages/mentions.js';

describe('message markdown', () => {
    it('parses nested formatting and creates an initially concealed spoiler', () => {
        const content = document.createElement('div');
        content.textContent = '***bold italic*** ||secret||';
        processMarkdown({ content, kind: 'message', source: content.textContent });

        expect(content.querySelector('strong em')?.textContent).toBe('bold italic');
        const spoiler = content.querySelector('.ext-spoiler');
        expect(spoiler?.textContent).toBe('secret');
        expect(spoiler?.getAttribute('aria-expanded')).toBe('false');
        spoiler.click();
        expect(spoiler.classList.contains('ext-spoiler-revealed')).toBe(true);
        expect(spoiler.hasAttribute('aria-label')).toBe(false);
    });

    it('leaves markup in links and non-message content untouched', () => {
        const content = document.createElement('div');
        content.innerHTML = '<a>**linked**</a> plain';
        const before = content.innerHTML;
        processMarkdown({ content, kind: 'system', source: content.textContent });
        expect(content.innerHTML).toBe(before);
        processMarkdown({ content, kind: 'message', source: content.textContent });
        expect(content.querySelector('a')?.textContent).toBe('**linked**');
        expect(content.querySelector('strong')).toBeNull();
    });

    it('does not consume unmatched markers or underscore inside words', () => {
        const content = document.createElement('div');
        content.textContent = 'under_score *open';
        processMarkdown({ content, kind: 'message', source: content.textContent });
        expect(content.textContent).toBe('under_score *open');
        expect(content.querySelector('em')).toBeNull();
    });
});

describe('message mentions', () => {
    it('marks valid mentions outside links and uses configured color', () => {
        const content = document.createElement('div');
        content.innerHTML = 'Hi @alice <a href="#">@linked</a> and @bob!';
        processMentions({ content, kind: 'message' });
        const mentions = [...content.querySelectorAll('.ext-mention')];
        expect(mentions.map((mention) => mention.textContent)).toEqual(['@alice', '@bob']);
        expect(mentions[0].style.color).toBe('rgb(18, 52, 86)');
        expect(content.querySelector('a')?.textContent).toBe('@linked');
    });

    it('ignores mentions in non-message rows and does not match inside words', () => {
        const content = document.createElement('div');
        content.textContent = 'name@alice @valid';
        processMentions({ content, kind: 'system' });
        expect(content.querySelector('.ext-mention')).toBeNull();
        processMentions({ content, kind: 'message' });
        expect([...content.querySelectorAll('.ext-mention')].map((item) => item.textContent))
            .toEqual(['@valid']);
    });
});
