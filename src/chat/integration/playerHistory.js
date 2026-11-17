import { cls, getOverlayRoot } from '../../core/ui.js';
import { EV, on, STORE } from '../../core/consts.js';
import { store } from '../../core/store.js';

const TABS = [
    { id: 'g', label: 'Общее' },
    { id: 'mn', label: 'Ремёсла' },
    { id: 'gl', label: 'Гильдия' },
    { id: 'tr', label: 'Торговля' }
];
const TAB_IDS = new Set(TABS.map((tab) => tab.id));
const HISTORY_LIMIT_PER_TAB = 500;
const profiles = new Map();
const windows = new Set();
const rowIds = new WeakMap();
let nextRowId = 0;
let nextWindow = 0;
let nextWindowZIndex = 0;
let documentObserver = null;

function capitalizeNick(value) {
    const [first, ...rest] = Array.from(value);
    return first ? first.toUpperCase() + rest.join('') : value;
}

function profileFor(login) {
    const key = login.toLowerCase();
    let profile = profiles.get(key);
    if (!profile) {
        profile = {
            key,
            login,
            name: login,
            characterClass: '',
            guild: '',
            messages: new Map(TABS.map(({ id }) => [id, []])),
            messageIds: new Map(TABS.map(({ id }) => [id, new Set()]))
        };
        profiles.set(key, profile);
    }
    return profile;
}

function getTab(box, row) {
    if (row.dataset.rm === 'mine') return 'mn';
    return box.querySelector('.cy-chat-tabs [data-tab][aria-selected="true"]')?.dataset.tab || '';
}

function rowId(row) {
    if (row.dataset.mid) return row.dataset.mid;
    if (!rowIds.has(row)) rowIds.set(row, `row-${++nextRowId}`);
    return rowIds.get(row);
}

function messageText(content) {
    const clone = content.cloneNode(true);
    clone.querySelectorAll('img').forEach((image) => {
        image.replaceWith(document.createTextNode(image.alt || ''));
    });
    clone.querySelectorAll('br').forEach((lineBreak) => {
        lineBreak.replaceWith(document.createTextNode('\n'));
    });
    clone.querySelectorAll('.stk-w').forEach((sticker) => {
        sticker.replaceWith(document.createTextNode('[стикер]'));
    });
    return clone.textContent.trim();
}

function formatTime(row, observedAt) {
    const source = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(row.title.trim());
    const observed = new Date(observedAt || Date.now());
    const hours = source ? Number(source[1]) : observed.getHours();
    const minutes = source ? Number(source[2]) : observed.getMinutes();
    const seconds = source && source[3]
        ? Number(source[3])
        : observedAt && hours === observed.getHours() && minutes === observed.getMinutes()
            ? observed.getSeconds()
            : 0;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function messageFromRow(row, tab, observedAt) {
    if (row.matches('.cy-chat-sys, .cy-chat-ev, .cy-chat-0')
        || row.classList.contains(cls('archive-row'))) return null;
    const nick = row.querySelector(':scope > b[data-nick]');
    const content = row.querySelector(':scope > span:not([class])');
    const login = nick && String(nick.dataset.nick || '').trim();
    const text = content ? messageText(content) : '';
    if (!login || !text) return null;

    return {
        login,
        name: capitalizeNick(nick.textContent.trim() || login),
        characterClass: row.querySelector('.cy-cls')?.getAttribute('aria-label')
            || row.querySelector('.cy-cls')?.title || '',
        guild: (row.querySelector('.cy-gt')?.textContent || '').replace(/^\[|\]$/g, '').trim(),
        id: rowId(row),
        tab,
        time: formatTime(row, observedAt),
        text
    };
}

function updateWindows(profile) {
    for (const instance of windows) {
        if (instance.profile === profile) renderWindow(instance);
    }
}

function captureRow(row, tab, observedAt) {
    if (!TAB_IDS.has(tab)) return;
    const message = messageFromRow(row, tab, observedAt);
    if (!message) return;

    const profile = profileFor(message.login);
    const ids = profile.messageIds.get(tab);
    if (ids.has(message.id)) return;

    const messages = profile.messages.get(tab);
    ids.add(message.id);
    messages.push(message);
    if (messages.length > HISTORY_LIMIT_PER_TAB) {
        const oldest = messages.shift();
        ids.delete(oldest.id);
    }

    profile.login = message.login;
    profile.name = message.name;
    profile.characterClass = message.characterClass;
    profile.guild = message.guild;
    updateWindows(profile);
}

function addHistoryButton(row, box) {
    const nick = row.querySelector(':scope > b[data-nick]');
    const login = String(nick?.dataset.nick || '').trim();
    if (store.get(STORE.playerHistoryButtonEnabled) === false
        || !nick || !login || row.querySelector(`:scope > button.${cls('player-history-trigger')}`)) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = cls('player-history-trigger');
    button.textContent = '◷';
    button.title = `История сообщений: ${capitalizeNick(nick.textContent.trim() || login)}`;
    button.setAttribute('aria-label', button.title);
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const tab = getTab(box, row);
        captureRow(row, tab);
        openWindow(profileFor(login), TAB_IDS.has(tab) ? tab : 'g');
    });
    row.insertBefore(button, row.firstChild);
}

function scanBox(box, observedAt = 0) {
    const list = box.querySelector('.cy-chat-l');
    if (!list) return;
    for (const row of list.querySelectorAll(':scope > li')) {
        const tab = getTab(box, row);
        if (!TAB_IDS.has(tab)) continue;
        addHistoryButton(row, box);
        captureRow(row, tab, observedAt);
    }
}

function startDocumentObserver() {
    if (documentObserver || !document.documentElement) return;
    documentObserver = new MutationObserver((records) => {
        const observedAt = Date.now();
        const boxes = new Set();
        for (const record of records) {
            if (record.type === 'attributes') {
                const tabs = record.target.closest?.('.cy-chat-tabs');
                const box = tabs && tabs.closest('.cy-chat');
                if (box) boxes.add(box);
                continue;
            }
            const target = record.target;
            if (target.nodeType === 1 && target.matches('.cy-chat-l')) {
                const box = target.closest('.cy-chat');
                if (box) boxes.add(box);
                continue;
            }
            if (target.nodeType === 1 && target.matches('.cy-chat')) boxes.add(target);
            const box = target.nodeType === 1 && target.closest('.cy-chat');
            for (const node of record.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                if (node.matches('.cy-chat')) boxes.add(node);
                node.querySelectorAll('.cy-chat').forEach((chatBox) => boxes.add(chatBox));
                if (box && (node.matches('.cy-chat-l, .cy-chat-tabs')
                    || node.querySelector('.cy-chat-l, .cy-chat-tabs'))) boxes.add(box);
            }
        }
        boxes.forEach((box) => scanBox(box, observedAt));
    });
    documentObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['aria-selected'],
        childList: true,
        subtree: true
    });
    document.querySelectorAll('.cy-chat').forEach((box) => scanBox(box));
}

on(EV.playerHistoryButtonChange, () => {
    const buttons = document.querySelectorAll(`button.${cls('player-history-trigger')}`);
    if (store.get(STORE.playerHistoryButtonEnabled) === false) {
        buttons.forEach((button) => button.remove());
        return;
    }
    document.querySelectorAll('.cy-chat').forEach((box) => scanBox(box));
});

function createMessageLine(message) {
    const line = document.createElement('div');
    line.className = 't7-player-history-line';
    const time = document.createElement('time');
    time.className = 't7-player-history-time';
    time.textContent = message.time;
    const nick = document.createElement('b');
    nick.className = 't7-player-history-nick';
    nick.textContent = message.name;
    const text = document.createElement('span');
    text.className = 't7-player-history-text';
    text.textContent = message.text;
    line.append(time, document.createTextNode(' '), nick, document.createTextNode(': '), text);
    return line;
}

function renderWindow(instance, scrollToBottom = false) {
    const { profile, log, title } = instance;
    const wasAtBottom = log.scrollHeight - log.scrollTop - log.clientHeight <= 8;
    title.textContent = [
        `Класс: ${profile.characterClass || '—'}`,
        `Гильдия: ${profile.guild ? `[${profile.guild}]` : '—'}`,
        profile.name
    ].join(' · ');
    const messages = profile.messages.get(instance.tab);
    log.replaceChildren(...messages.map(createMessageLine));
    if (!messages.length) {
        const empty = document.createElement('div');
        empty.className = 't7-player-history-empty';
        empty.textContent = 'Сообщений пока нет';
        log.appendChild(empty);
    }
    if (scrollToBottom || wasAtBottom) log.scrollTop = log.scrollHeight;
}

function setupDrag(element, header) {
    let stopDrag = () => {};
    header.addEventListener('pointerdown', (event) => {
        if ((event.button !== 0 && event.pointerType !== 'touch')
            || event.target.closest?.('button')) return;
        event.preventDefault();
        const rect = element.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = rect.left;
        const startTop = rect.top;
        const move = (moveEvent) => {
            if (moveEvent.pointerId !== event.pointerId) return;
            const maxLeft = Math.max(8, innerWidth - element.offsetWidth - 8);
            const maxTop = Math.max(8, innerHeight - element.offsetHeight - 8);
            element.style.left = `${Math.max(8, Math.min(maxLeft, startLeft + moveEvent.clientX - startX))}px`;
            element.style.top = `${Math.max(8, Math.min(maxTop, startTop + moveEvent.clientY - startY))}px`;
        };
        const end = (endEvent) => {
            if (endEvent.pointerId !== event.pointerId) return;
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', end);
            document.removeEventListener('pointercancel', end);
            stopDrag = () => {};
            element.classList.remove('t7-player-history-drag');
        };
        stopDrag = () => end({ pointerId: event.pointerId });
        element.classList.add('t7-player-history-drag');
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', end);
        document.addEventListener('pointercancel', end);
    });
    return () => stopDrag();
}

function openWindow(profile, initialTab) {
    const element = document.createElement('section');
    element.className = 't7-player-history-window';
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-label', `История сообщений: ${profile.name}`);

    const header = document.createElement('header');
    header.className = 't7-player-history-header';
    const title = document.createElement('span');
    title.className = 't7-player-history-title';
    const controls = document.createElement('span');
    controls.className = 't7-player-history-controls';

    const collapse = document.createElement('button');
    collapse.type = 'button';
    collapse.className = 't7-player-history-control';
    collapse.textContent = '−';
    collapse.title = 'Свернуть';
    collapse.setAttribute('aria-label', 'Свернуть окно');
    collapse.setAttribute('aria-expanded', 'true');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 't7-player-history-control';
    close.textContent = '×';
    close.title = 'Закрыть';
    close.setAttribute('aria-label', 'Закрыть окно');
    controls.append(collapse, close);
    header.append(title, controls);

    const body = document.createElement('div');
    body.className = 't7-player-history-body';
    const tabs = document.createElement('div');
    tabs.className = 't7-player-history-tabs';
    tabs.setAttribute('role', 'tablist');
    const log = document.createElement('div');
    log.className = 't7-player-history-log';
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');
    body.append(tabs, log);
    element.append(header, body);

    const instance = {
        profile,
        element,
        title,
        log,
        body,
        tab: TAB_IDS.has(initialTab) ? initialTab : 'g',
        stopDrag: () => {}
    };
    for (const tab of TABS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.tab = tab.id;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', String(tab.id === instance.tab));
        button.textContent = tab.label;
        button.addEventListener('click', () => {
            instance.tab = tab.id;
            tabs.querySelectorAll('[data-tab]').forEach((item) => {
                item.setAttribute('aria-selected', String(item === button));
            });
            renderWindow(instance, true);
        });
        tabs.appendChild(button);
    }
    collapse.addEventListener('click', () => {
        body.hidden = !body.hidden;
        element.classList.toggle('t7-player-history-collapsed', body.hidden);
        collapse.textContent = body.hidden ? '+' : '−';
        collapse.title = body.hidden ? 'Развернуть' : 'Свернуть';
        collapse.setAttribute('aria-label', body.hidden ? 'Развернуть окно' : 'Свернуть окно');
        collapse.setAttribute('aria-expanded', String(!body.hidden));
    });
    close.addEventListener('click', () => {
        instance.stopDrag();
        windows.delete(instance);
        element.remove();
    });
    instance.stopDrag = setupDrag(element, header);

    const offset = (nextWindow++ % 8) * 24;
    const width = Math.min(420, Math.max(240, innerWidth - 16));
    element.style.left = `${Math.max(8, innerWidth - width - 24 - offset)}px`;
    element.style.top = `${Math.max(8, 64 + offset)}px`;
    element.style.zIndex = String(++nextWindowZIndex);
    element.addEventListener('pointerdown', () => {
        element.style.zIndex = String(++nextWindowZIndex);
    });
    getOverlayRoot().appendChild(element);
    windows.add(instance);
    renderWindow(instance, true);
    return instance;
}

export function startPlayerHistory() {
    startDocumentObserver();
}
