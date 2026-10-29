import { st } from './state.js';
import { togglePop, closePop, recordRecentFromMessage } from './popup.js';
import { pingSystem } from './pingSystem.js';

function bindMessageHistory(form, input) {
    const history = [];
    let index = 0;
    let draft = '';
    let changingHistory = false;

    const setValue = (value) => {
        changingHistory = true;
        input.value = value;
        input.setSelectionRange(value.length, value.length);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        changingHistory = false;
    };
    const remember = (value) => {
        const message = String(value || '').trim();
        if (!message) return;
        if (history[history.length - 1] !== message) {
            history.push(message);
            if (history.length > 50) history.shift();
        }
        index = history.length;
        draft = '';
    };

    input.addEventListener('input', () => {
        if (changingHistory) return;
        index = history.length;
        draft = input.value;
    });
    input.addEventListener('keydown', (e) => {
        if (e.altKey || e.ctrlKey || e.metaKey || !history.length) return;
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            if (index === history.length) draft = input.value;
            index = Math.max(0, index - 1);
            setValue(history[index]);
        } else if (e.key === 'ArrowDown' && index < history.length) {
            e.preventDefault();
            e.stopPropagation();
            index++;
            setValue(index === history.length ? draft : history[index]);
        }
    }, true);

    form.addEventListener('submit', () => remember(input.value), true);
    return remember;
}

function bindPingAutocomplete(form, input) {
    const menu = document.createElement('div');
    menu.className = 't7-ping-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    form.appendChild(menu);

    const getToken = () => {
        const caret = input.selectionStart == null ? input.value.length : input.selectionStart;
        if (caret !== input.selectionEnd) return null;
        const before = input.value.slice(0, caret);
        const match = /(?:^|\s)@([a-z0-9_]*)$/i.exec(before);
        return match ? { query: match[1].toLowerCase(), start: caret - match[1].length - 1, end: caret } : null;
    };

    const candidates = (query) => {
        const names = new Map();
        document.querySelectorAll('.cy-chat-l b[data-nick]').forEach((el) => {
            const name = String(el.dataset.nick || '').trim();
            if (name) names.set(name.toLowerCase(), name);
        });
        for (const alias of pingSystem.config.aliases) {
            const name = String(alias).replace(/^@/, '').trim();
            if (name && !/\s/.test(name)) names.set(name.toLowerCase(), name);
        }
        return [...names.values()].filter((name) => name.toLowerCase().startsWith(query)).sort((a, b) => a.localeCompare(b)).slice(0, 7);
    };

    const complete = (name) => {
        const token = getToken();
        if (!token) return;
        input.value = input.value.slice(0, token.start) + '@' + name + ' ' + input.value.slice(token.end);
        const caret = token.start + name.length + 2;
        input.setSelectionRange(caret, caret);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus({ preventScroll: true });
        menu.hidden = true;
    };

    const update = () => {
        if (!pingSystem.config.tabCompletion) {
            menu.replaceChildren();
            menu.hidden = true;
            return;
        }
        const token = getToken();
        const matches = token && candidates(token.query);
        menu.replaceChildren();
        if (!matches || !matches.length) {
            menu.hidden = true;
            return;
        }
        for (const name of matches) {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 't7-ping-option';
            option.setAttribute('role', 'option');
            option.textContent = '@' + name;
            option.addEventListener('pointerdown', (e) => e.preventDefault());
            option.addEventListener('click', () => complete(name));
            menu.appendChild(option);
        }
        menu.hidden = false;
    };

    input.addEventListener('input', update);
    document.addEventListener('t7-tab-completion-change', update);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !menu.hidden) {
            menu.hidden = true;
            return;
        }
        if (e.key !== 'Tab' || menu.hidden) return;
        const token = getToken();
        const name = token && candidates(token.query)[0];
        if (!name) return;
        e.preventDefault();
        e.stopPropagation();
        complete(name);
    }, true);
}

// кнопка «7TV» справа от ➤ в форме чата
export function ensureButtons() {
    document.querySelectorAll('form.cy-chat-f').forEach((f) => {
        const input = f.querySelector('input[type=text]');
        if (input && !f.dataset.t7RecentBound) {
            f.dataset.t7RecentBound = '1';
            const remember = bindMessageHistory(f, input);
            bindPingAutocomplete(f, input);
            const record = () => {
                remember(input.value);
                recordRecentFromMessage(input.value);
            };
            f.addEventListener('submit', record, true);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && !e.isComposing && e.keyCode !== 229)
                    record();
            }, true);
        }
        if (f.querySelector('.t7-btn')) return;
        const b = document.createElement('button');
        b.type = 'button';       // не отправляет сообщение
        b.className = 't7-btn';
        b.textContent = '7TV';
        b.title = 'Эмоуты 7TV';
        b.setAttribute('aria-label', 'Эмоуты 7TV');
        b.setAttribute('aria-haspopup', 'dialog');
        b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); togglePop(b); });
        const sub = f.querySelector('button[type=submit]');
        if (sub) sub.after(b); else f.appendChild(b);
    });
    if (st.pop && st.anchor && !st.anchor.isConnected) closePop();
}