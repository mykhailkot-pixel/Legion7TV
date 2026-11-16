import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureExtensionStore } from '../src/core/store.js';
import { setChatTabPrefs } from '../src/chat/prefs.js';
import { setupTabs } from '../src/chat/integration/chatTabs.js';

describe('chat tab preferences integration', () => {
    beforeEach(() => {
        configureExtensionStore({}, vi.fn().mockResolvedValue(undefined));
    });

    it('reorders site tabs, marks hidden tabs, and selects a visible tab if needed', () => {
        setChatTabPrefs({ order: ['g', 'dm', 'mn', 'tr', 'gl'], hidden: ['dm'] });
        const wrapper = document.createElement('div');
        const tabs = document.createElement('div');
        tabs.className = 'cy-chat-tabs';
        for (const id of ['dm', 'tr', 'g', 'gl', 'mn']) {
            const button = document.createElement('button');
            button.dataset.tab = id;
            button.setAttribute('aria-selected', id === 'dm' ? 'true' : 'false');
            button.addEventListener('click', () => button.dataset.clicked = 'true');
            tabs.append(button);
        }
        wrapper.append(tabs);
        document.body.append(wrapper);

        setupTabs(wrapper);

        expect([...tabs.children].map((button) => button.dataset.tab))
            .toEqual(['g', 'dm', 'mn', 'tr', 'gl']);
        expect(tabs.querySelector('[data-tab="dm"]').className).toContain('pref-hidden');
        expect(tabs.querySelector('[data-tab="g"]').dataset.clicked).toBe('true');
    });
});
