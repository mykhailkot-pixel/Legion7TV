import { EM, S, st } from '../../core/state.js';
import { HARD_BANNED_WORDS, SIZES } from '../../core/config.js';
import { EV, SEL, on } from '../../core/consts.js';
import { setEmoteImage } from '../../emotes/emotes.js';
import { togglePop, closePop, recordRecentFromMessage } from '../../emotes/popup.js';
import { pingSystem } from '../pingSystem.js';
import { bindOutgoingLinkEncoding } from '../messages/links.js';
import { arePastesEnabled, openPastes } from './pastes.js';
import { disposeImagePicker, isImagePickerButtonEnabled, openImagePicker } from './imagePicker.js';
import { getOverlayRoot } from '../../core/ui.js';
import { registerChatButton } from './chatButtonState.js';
import { insertText } from '../../core/insertText.js';

const bindings = new WeakMap();
const emoteBindings = new WeakMap();
const linkBindings = new WeakMap();
const buttonsByForm = new WeakMap();
const warningsByForm = new WeakMap();

function positionOverlay(element, input, alignRight = false) {
    const rect = input.getBoundingClientRect();
    const width = element.getBoundingClientRect().width;
    const left = alignRight ? rect.right - width : rect.left;
    element.style.left = Math.max(8, Math.min(innerWidth - width - 8, left)) + 'px';
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    const height = element.getBoundingClientRect().height;
    const top = rect.top >= height + 12 ? rect.top - height - 6 : rect.bottom + 6;
    element.style.top = Math.max(8, Math.min(innerHeight - height - 8, top)) + 'px';
}
function normalizeBanword(value) {
    return String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
}

function findTwitchBanword(message) {
    const text = normalizeBanword(message);
    for (const raw of HARD_BANNED_WORDS) {
        const word = normalizeBanword(raw);
        if (!word) continue;
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matcher = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'u');
        if (matcher.test(text)) return String(raw).trim();
    }
    return '';
}

function showTwitchBanwordWarning(form, input, word) {
    let warning = warningsByForm.get(form);
    if (!warning) {
        warning = document.createElement('div');
        warning.className = 't7-banword-warning';
        warning.setAttribute('role', 'alert');
        getOverlayRoot().appendChild(warning);
        warningsByForm.set(form, warning);
    }
    warning.textContent = `Сообщение не отправлено: найдено запрещённое слово «${word}».`;
    warning.hidden = false;
    positionOverlay(warning, input);
}

function bindMessageHistory(input) {
    const history = [];
    let index = 0;
    let draft = '';
    let changingHistory = false;

    const setValue = (value) => {
        changingHistory = true;
        try {
            insertText(input, value, { replaceRange: { start: 0, end: input.value.length } });
        } finally {
            changingHistory = false;
        }
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
    const onInput = () => {
        if (changingHistory) return;
        index = history.length;
        draft = input.value;
    };
    const onKeyDown = (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || !history.length) return;
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            if (index === history.length) draft = input.value;
            index = Math.max(0, index - 1);
            setValue(history[index]);
        } else if (event.key === 'ArrowDown' && index < history.length) {
            event.preventDefault();
            event.stopPropagation();
            index++;
            setValue(index === history.length ? draft : history[index]);
        }
    };

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown, true);
    return {
        remember,
        dispose() {
            input.removeEventListener('input', onInput);
            input.removeEventListener('keydown', onKeyDown, true);
        }
    };
}

function bindPingAutocomplete(form, input) {
    const menu = document.createElement('div');
    menu.className = 't7-ping-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    getOverlayRoot().appendChild(menu);
    const reposition = () => {
        if (!menu.hidden) positionOverlay(menu, input, true);
    };
    addEventListener('resize', reposition);
    document.addEventListener('scroll', reposition, true);

    const getToken = () => {
        const caret = input.selectionStart == null ? input.value.length : input.selectionStart;
        if (caret !== input.selectionEnd) return null;
        const before = input.value.slice(0, caret);
        const match = /(?:^|\s)@([a-z0-9_]*)$/i.exec(before);
        return match ? { query: match[1].toLowerCase(), start: caret - match[1].length - 1, end: caret } : null;
    };
    const candidates = (query) => {
        const names = new Map();
        document.querySelectorAll(SEL.nickButtons).forEach((element) => {
            const name = String(element.dataset.nick || '').trim();
            if (name) names.set(name.toLowerCase(), name);
        });
        for (const alias of pingSystem.config.aliases) {
            const name = String(alias).replace(/^@/, '').trim();
            if (name && !/\s/.test(name)) names.set(name.toLowerCase(), name);
        }
        return [...names.values()]
            .filter((name) => name.toLowerCase().startsWith(query))
            .sort((a, b) => a.localeCompare(b))
            .slice(0, 7);
    };
    const complete = (name) => {
        const token = getToken();
        if (!token) return;
        insertText(input, '@' + name + ' ', { replaceRange: token });
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
            option.addEventListener('pointerdown', (event) => event.preventDefault());
            option.addEventListener('click', () => complete(name));
            menu.appendChild(option);
        }
        menu.hidden = false;
        reposition();
    };
    const onKeyDown = (event) => {
        if (event.key === 'Escape' && !menu.hidden) {
            menu.hidden = true;
            return;
        }
        if (event.key !== 'Tab' || menu.hidden) return;
        const token = getToken();
        const name = token && candidates(token.query)[0];
        if (!name) return;
        event.preventDefault();
        event.stopPropagation();
        complete(name);
    };

    input.addEventListener('input', update);
    input.addEventListener('keydown', onKeyDown, true);
    const unsubscribe = on(EV.tabCompletionChange, update);
    return {
        hide() {
            menu.hidden = true;
        },
        dispose() {
            input.removeEventListener('input', update);
            input.removeEventListener('keydown', onKeyDown, true);
            unsubscribe();
            removeEventListener('resize', reposition);
            document.removeEventListener('scroll', reposition, true);
            menu.remove();
        }
    };
}

function bindEmoteAutocomplete(form, input) {
    const menu = document.createElement('div');
    menu.className = 't7-emote-menu';
    menu.setAttribute('role', 'group');
    menu.setAttribute('aria-label', 'Эмоуты');
    menu.hidden = true;

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 't7-emote-nav';
    previous.textContent = '‹';
    previous.title = 'Предыдущие эмоуты';
    previous.setAttribute('aria-label', previous.title);
    const strip = document.createElement('div');
    strip.className = 't7-emote-strip';
    strip.setAttribute('role', 'listbox');
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 't7-emote-nav';
    next.textContent = '›';
    next.title = 'Следующие эмоуты';
    next.setAttribute('aria-label', next.title);
    menu.append(previous, strip, next);
    getOverlayRoot().appendChild(menu);

    let matches = [];
    let selectedIndex = -1;
    let pageStart = 0;
    let pageSize = 1;
    let requested = false;
    let dismissed = false;
    const getToken = () => {
        const caret = input.selectionStart == null ? input.value.length : input.selectionStart;
        if (caret !== input.selectionEnd) return null;
        const before = input.value.slice(0, caret);
        const match = /(?:^|\s)([^\s]*)$/u.exec(before);
        if (!match || match[1].length < 2) return null;
        return { query: match[1].toLowerCase(), start: caret - match[1].length, end: caret };
    };
    const complete = (name) => {
        const token = getToken();
        if (!token || !name) return;
        const after = input.value.slice(token.end);
        const suffix = /^\s/.test(after) ? '' : ' ';
        const replacement = name + suffix;
        insertText(input, replacement, { replaceRange: token });
        menu.hidden = true;
    };
    const render = () => {
        strip.replaceChildren();
        if (!matches.length) {
            menu.hidden = true;
            return;
        }
        const width = menu.clientWidth || Math.max(1, Math.min(620, form.clientWidth, window.innerWidth - 24));
        pageSize = Math.max(1, Math.floor((width - 64) / 66));
        if (selectedIndex >= matches.length) selectedIndex = -1;
        if (selectedIndex >= 0) pageStart = Math.floor(selectedIndex / pageSize) * pageSize;
        else pageStart = Math.floor(pageStart / pageSize) * pageSize;
        pageStart = Math.min(pageStart, Math.floor((matches.length - 1) / pageSize) * pageSize);
        const start = pageStart;
        for (const [offset, name] of matches.slice(start, start + pageSize).entries()) {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 't7-emote-option';
            option.title = name;
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', String(selectedIndex >= 0 && start + offset === selectedIndex));
            const image = document.createElement('img');
            image.alt = '';
            image.loading = 'lazy';
            option.appendChild(image);
            const label = document.createElement('span');
            label.textContent = name.length > 9 ? name.slice(0, 9) + '…' : name;
            option.appendChild(label);
            option.addEventListener('pointerdown', (event) => event.preventDefault());
            option.addEventListener('click', () => complete(name));
            strip.appendChild(option);

            const emote = EM[name];
            if (emote) {
                const resolution = Math.min(2, SIZES[S.size].n);
                setEmoteImage(image, emote, resolution, 'lazy', (error) => {
                    console.warn('[7TV] картинка эмоута для автокомплита не загрузилась', name, error);
                });
            }
        }
        previous.disabled = pageStart === 0;
        next.disabled = pageStart + pageSize >= matches.length;
        previous.hidden = matches.length <= pageSize;
        next.hidden = matches.length <= pageSize;
        menu.hidden = !pingSystem.config.emoteCompletion || !requested || dismissed;
        if (!menu.hidden) positionOverlay(menu, input);
    };
    const update = () => {
        requested = false;
        dismissed = false;
        if (!pingSystem.config.emoteCompletion) {
            matches = [];
            render();
            return;
        }
        const token = getToken();
        if (!token) {
            matches = [];
            render();
            return;
        }
        matches = Object.keys(EM)
            .filter((name) => name.toLowerCase().startsWith(token.query) && name.toLowerCase() !== token.query)
            .sort((a, b) => a.localeCompare(b));
        selectedIndex = -1;
        pageStart = 0;
        render();
    };
    const move = (offset) => {
        const current = selectedIndex < 0 ? (offset > 0 ? pageStart - 1 : pageStart) : selectedIndex;
        selectedIndex = Math.max(0, Math.min(matches.length - 1, current + offset));
        pageStart = Math.floor(selectedIndex / pageSize) * pageSize;
        render();
    };
    const onKeyDown = (event) => {
        if (event.key === 'Tab' && !event.shiftKey && menu.hidden
            && pingSystem.config.emoteCompletion && matches.length) {
            event.preventDefault();
            event.stopImmediatePropagation();
            requested = true;
            dismissed = false;
            render();
            return;
        }
        if (menu.hidden) return;
        if (event.key === 'Escape') {
            dismissed = true;
            menu.hidden = true;
            event.preventDefault();
            event.stopPropagation();
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault();
            event.stopPropagation();
            move(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            move(-1);
        } else if (event.key === 'Enter' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault();
            event.stopImmediatePropagation();
            complete(matches[selectedIndex < 0 ? pageStart : selectedIndex]);
        } else if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            event.stopImmediatePropagation();
            complete(matches[selectedIndex < 0 ? pageStart : selectedIndex]);
        }
    };
    const changePage = (offset) => {
        const nextStart = Math.max(0, Math.min(
            Math.floor((matches.length - 1) / pageSize) * pageSize,
            pageStart + offset * pageSize
        ));
        pageStart = nextStart;
        selectedIndex = -1;
        render();
    };
    previous.addEventListener('pointerdown', (event) => event.preventDefault());
    next.addEventListener('pointerdown', (event) => event.preventDefault());
    previous.addEventListener('click', () => changePage(-1));
    next.addEventListener('click', () => changePage(1));
    input.addEventListener('input', update);
    input.addEventListener('keydown', onKeyDown, true);
    const unsubscribe = on(EV.emoteCompletionChange, update);
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(form);
    const reposition = () => {
        if (!menu.hidden) positionOverlay(menu, input);
    };
    addEventListener('resize', reposition);
    document.addEventListener('scroll', reposition, true);
    update();
    return () => {
        input.removeEventListener('input', update);
        input.removeEventListener('keydown', onKeyDown, true);
        unsubscribe();
        resizeObserver.disconnect();
        removeEventListener('resize', reposition);
        document.removeEventListener('scroll', reposition, true);
        menu.remove();
    };
}

function bindChatForm(form, input) {
    const history = bindMessageHistory(input);
    const pingAutocomplete = bindPingAutocomplete(form, input);
    let lastRecentMessage = '';
    let recentRecorded = false;
    let warning = null;

    const blockBannedWord = (event) => {
        const word = findTwitchBanword(input.value);
        if (!word) return false;
        event.preventDefault();
        event.stopImmediatePropagation();
        showTwitchBanwordWarning(form, input, word);
        return true;
    };

    const record = () => {
        const text = input.value.trim();
        if (!text) return;
        pingAutocomplete.hide();
        history.remember(text);
        if (recentRecorded && text === lastRecentMessage) return;
        recordRecentFromMessage(text);
        lastRecentMessage = text;
        recentRecorded = true;
    };
    const onInput = () => {
        if (input.value.trim() !== lastRecentMessage) recentRecorded = false;
        warning = warningsByForm.get(form);
        if (warning) warning.hidden = true;
    };
    const onSubmit = (event) => {
        if (blockBannedWord(event)) return;
        record();
        requestAnimationFrame(() => {
            if (!form.isConnected) return;
            const active = document.activeElement;
            if (active !== document.body && !form.contains(active)) return;
            const currentInput = form.querySelector(SEL.textInput);
            if (currentInput) currentInput.focus({ preventScroll: true });
        });
    };
    const onClick = (event) => {
        if (event.target.closest(SEL.submitButton)) blockBannedWord(event);
    };
    const onKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !event.isComposing && event.keyCode !== 229) {
            if (blockBannedWord(event)) return;
            record();
        }
    };

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown, true);
    form.addEventListener('submit', onSubmit, true);
    form.addEventListener('click', onClick, true);
    return () => {
        history.dispose();
        pingAutocomplete.dispose();
        input.removeEventListener('input', onInput);
        input.removeEventListener('keydown', onKeyDown, true);
        form.removeEventListener('submit', onSubmit, true);
        form.removeEventListener('click', onClick, true);
    };
}

function disposeForm(form) {
    const dispose = bindings.get(form);
    const disposeEmotes = emoteBindings.get(form);
    const disposeLinks = linkBindings.get(form);
    const buttons = buttonsByForm.get(form);
    if (dispose && st.anchor && buttons && buttons.emote.button === st.anchor) closePop();
    disposeImagePicker(form);
    const warning = warningsByForm.get(form);
    if (warning) warning.remove();
    warningsByForm.delete(form);
    if (dispose) {
        dispose();
        bindings.delete(form);
    }
    if (disposeEmotes) {
        disposeEmotes();
        emoteBindings.delete(form);
    }
    if (disposeLinks) {
        disposeLinks();
        linkBindings.delete(form);
    }
    if (buttons) {
        buttons.dispose.forEach((disposeButton) => disposeButton());
        buttons.emote.host.remove();
        buttons.image.host?.remove();
        buttons.pastes.host.remove();
        buttonsByForm.delete(form);
    }
}

export function disposeInputBindings(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches(SEL.chatForms)) disposeForm(node);
    node.querySelectorAll(SEL.chatForms).forEach(disposeForm);
}

export function ensureButtons() {
    document.querySelectorAll(SEL.chatForms).forEach((form) => {
        const input = form.querySelector(SEL.textInput);
        if (input && !emoteBindings.has(form)) {
            emoteBindings.set(form, bindEmoteAutocomplete(form, input));
        }
        if (input && !bindings.has(form)) {
            bindings.set(form, form.matches(SEL.chatForm) ? bindChatForm(form, input) : () => {});
        }
        if (input && !linkBindings.has(form))
            linkBindings.set(form, bindOutgoingLinkEncoding(form, input));

        if (buttonsByForm.has(form)) return;
        const submit = form.querySelector(SEL.submitButton);
        const buttonRecords = [];
        const createShadowButton = (text, title, onClick, visible = true) => {
            const host = document.createElement('span');
            const shadow = host.attachShadow({ mode: 'closed' });
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(`
                :host{display:inline-flex;flex:none;align-self:stretch;min-height:28px;margin:0 0 0 4px;vertical-align:middle}
                button{box-sizing:border-box;min-height:28px;padding:0 8px;border:1px solid rgba(255,255,255,.25);border-radius:6px;background:rgba(145,70,255,.9);color:#fff;font:700 11px/1 system-ui,sans-serif;white-space:nowrap;cursor:pointer}
                button:hover{background:rgb(165,100,255)}
                button[hidden]{display:none!important}
            `);
            shadow.adoptedStyleSheets = [sheet];
            const innerButton = document.createElement('button');
            innerButton.type = 'button';
            innerButton.textContent = text;
            innerButton.title = title;
            innerButton.setAttribute('aria-label', title);
            innerButton.setAttribute('aria-haspopup', 'dialog');
            innerButton.hidden = !visible;
            ['keydown', 'keyup', 'keypress'].forEach((type) =>
                innerButton.addEventListener(type, (event) => event.stopPropagation()));
            innerButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                onClick(innerButton);
            });
            shadow.appendChild(innerButton);
            if (submit) submit.before(host);
            else form.appendChild(host);
            return { host, button: innerButton };
        };

        const emote = createShadowButton('7TV', 'Эмоуты 7TV', togglePop);
        const image = input ? createShadowButton('imgBB', 'Картинки imgBB',
            () => openImagePicker(input), isImagePickerButtonEnabled() && !form.matches(SEL.dmForm)) : null;
        const pastes = createShadowButton('Пасты', 'Сохранённые пасты',
            () => openPastes(input), arePastesEnabled());
        if (image) buttonRecords.push(registerChatButton('imagePicker', image.host, image.button, !form.matches(SEL.dmForm)));
        buttonRecords.push(registerChatButton('pastes', pastes.host, pastes.button, true));
        buttonsByForm.set(form, {
            emote,
            image,
            pastes,
            dispose: buttonRecords
        });
    });

    if (st.pop && st.anchor && !st.anchor.isConnected) closePop();
}