import { SIZES } from '../../core/config.js';
import { S } from '../../core/state.js';
import { getOverlayRoot, cls, cssVar } from '../../core/ui.js';
import { store } from '../../core/store.js';
import { STORE } from '../../core/consts.js';
import { processEmotes } from './chatEmotes.js';

const HISTORY_LIMIT = 300;
const HISTORY_TABS = [
    { id: 'g', label: 'Общие' },
    { id: 'mn', label: 'Ремёсла' },
    { id: 'tr', label: 'Торговый' },
    { id: 'gl', label: 'Гильдии' }
];
const players = new Map();
const windows = new Set();
const HISTORY_BUTTON = 'player-history-button';
const dateTime = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
});
let nextWindowId = 0;

export function isPlayerHistoryButtonEnabled() {
    return store.get(STORE.playerHistoryButton) !== false;
}

export function setPlayerHistoryButtonEnabled(enabled) {
    const visible = !!enabled;
    store.set(STORE.playerHistoryButton, visible);
    document.querySelectorAll(`.${cls(HISTORY_BUTTON)}`).forEach((button) => {
        button.hidden = !visible;
    });
}

function playerKey(login) {
    return String(login || '').trim().toLowerCase();
}

function clean(value, maxLength) {
    return String(value || '').trim().slice(0, maxLength);
}

function getPlayer(login, name) {
    const key = playerKey(login);
    let player = players.get(key);
    if (!player) {
        player = { key, login: clean(login, 64), name: clean(name || login, 128), className: '', guild: '', messages: new Map() };
        players.set(key, player);
    } else if (name) {
        player.name = clean(name, 128);
    }
    return player;
}

function updateWindows(playerKeyValue) {
    for (const windowRecord of windows) {
        if (windowRecord.player.key === playerKeyValue) renderMessages(windowRecord, false);
    }
}

function renderHistoryEmotes(content) {
    processEmotes({ content, kind: 'message' });
    const height = SIZES[S.size].h;
    for (const wrapper of content.querySelectorAll(`.${cls('w')}`)) {
        Object.assign(wrapper.style, {
            display: 'inline-block',
            position: 'relative',
            verticalAlign: 'middle',
            lineHeight: '0'
        });
    }
    for (const image of content.querySelectorAll('img')) {
        if (image.classList.contains(cls('e'))) {
            image.style.display = 'block';
            image.style.height = height;
            image.style.width = `calc(${height} * ${image.style.getPropertyValue(cssVar('r')) || '1'})`;
            image.style.objectFit = 'contain';
        } else if (image.classList.contains(cls('zw'))) {
            Object.assign(image.style, {
                position: 'absolute',
                left: '50%',
                bottom: '0',
                transform: 'translateX(-50%)',
                height,
                width: 'auto',
                pointerEvents: 'none'
            });
        }
    }
}

export function savePlayerMessage(message) {
    const login = clean(message.login, 64);
    if (!login) return;
    const existingPlayer = players.get(playerKey(login));
    const previousName = existingPlayer && existingPlayer.name;
    const player = getPlayer(login, message.name);
    const id = clean(message.id, 200) || `${Number(message.at) || Date.now()}:${clean(message.text, 2000)}`;
    const existing = player.messages.get(id);
    const at = Number(message.at);
    const entry = {
        id,
        text: clean(message.text, 2000),
        at: Number.isFinite(at) && at > 0 && at <= 8.64e15 ? at : Date.now(),
        tab: HISTORY_TABS.some((item) => item.id === message.tab) ? message.tab : 'g',
        exactTimestamp: message.exactTimestamp === true
    };
    if (existing && existing.exactTimestamp && !entry.exactTimestamp) entry.at = existing.at;
    if (existing && existing.exactTimestamp) entry.exactTimestamp = true;
    const nextClass = clean(message.className, 64) || player.className;
    const nextGuild = clean(message.guild, 64) || player.guild;
    const changed = !existing || existing.text !== entry.text || existing.at !== entry.at
        || existing.tab !== entry.tab
        || previousName !== player.name
        || nextClass !== player.className || nextGuild !== player.guild;
    player.messages.set(id, entry);
    player.className = nextClass;
    player.guild = nextGuild;

    if (player.messages.size > HISTORY_LIMIT) {
        const oldest = [...player.messages.values()].sort((a, b) => a.at - b.at)[0];
        if (oldest) player.messages.delete(oldest.id);
    }
    if (changed) updateWindows(player.key);
}

function readRowTimestamp(row) {
    const title = row.title.trim();
    const time = /^(\d{1,2}):(\d{2})$/.exec(title);
    if (!time) {
        const timestamp = Date.parse(title);
        return Number.isFinite(timestamp) ? timestamp : Date.now();
    }
    const date = new Date();
    date.setHours(Number(time[1]), Number(time[2]), 0, 0);
    if (date.getTime() > Date.now() + 60_000) date.setDate(date.getDate() - 1);
    return date.getTime();
}

function readRowMetadata(row) {
    const classElement = row.querySelector(':scope > .cy-cls');
    const guildElement = row.querySelector(':scope > .cy-gt');
    const guildTitle = guildElement && guildElement.title;
    const guildMatch = guildTitle && /\[([^\]]+)\]/.exec(guildTitle);
    return {
        className: classElement && (classElement.getAttribute('aria-label') || classElement.title
            || classElement.textContent) || '',
        guild: guildMatch ? guildMatch[1] : guildElement ? guildElement.textContent.replace(/[\[\]]/g, '') : ''
    };
}

function openHistory(login, tab) {
    const player = players.get(playerKey(login));
    if (!player) return;

    const panel = document.createElement('section');
    panel.className = 't7-player-history-window';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', `История сообщений: ${player.name}`);

    const header = document.createElement('header');
    header.className = 't7-player-history-header';
    const identity = document.createElement('div');
    identity.className = 't7-player-history-identity';
    const name = document.createElement('strong');
    name.className = 't7-player-history-name';
    name.textContent = player.name;
    const metadata = document.createElement('span');
    metadata.className = 't7-player-history-meta';
    const playerClass = document.createElement('span');
    playerClass.textContent = `Класс: ${player.className || '—'}`;
    const guild = document.createElement('span');
    guild.textContent = `Гильдия: ${player.guild || '—'}`;
    metadata.append(playerClass, guild);
    identity.append(name, metadata);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 't7-player-history-close';
    close.setAttribute('aria-label', 'Закрыть историю');
    close.title = 'Закрыть';
    close.textContent = '×';
    header.append(identity, close);

    const tabs = document.createElement('nav');
    tabs.className = 't7-player-history-tabs';
    tabs.setAttribute('role', 'tablist');
    for (const tab of HISTORY_TABS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 't7-player-history-tab';
        button.dataset.historyTab = tab.id;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', 'false');
        button.textContent = tab.label;
        tabs.appendChild(button);
    }

    const list = document.createElement('ol');
    list.className = 't7-player-history-list';
    const empty = document.createElement('div');
    empty.className = 't7-player-history-empty';
    empty.textContent = 'Сообщений пока нет';
    panel.append(header, tabs, list, empty);
    getOverlayRoot().appendChild(panel);

    const offset = (nextWindowId++ % 8) * 24;
    panel.style.left = `${Math.min(40 + offset, Math.max(8, innerWidth - panel.offsetWidth - 8))}px`;
    panel.style.top = `${Math.min(80 + offset, Math.max(8, innerHeight - panel.offsetHeight - 8))}px`;

    const windowRecord = {
        panel,
        header,
        list,
        empty,
        player,
        selectedTab: HISTORY_TABS.some((item) => item.id === tab) ? tab : 'g'
    };
    windows.add(windowRecord);
    tabs.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-history-tab]');
        if (!button || !tabs.contains(button)) return;
        windowRecord.selectedTab = button.dataset.historyTab;
        renderMessages(windowRecord, true);
    });
    renderMessages(windowRecord, true);

    const onPointerMove = (event) => {
        if (event.pointerId !== dragPointerId) return;
        panel.style.left = `${Math.max(0, Math.min(innerWidth - panel.offsetWidth,
            dragLeft + event.clientX - dragX))}px`;
        panel.style.top = `${Math.max(0, Math.min(innerHeight - panel.offsetHeight,
            dragTop + event.clientY - dragY))}px`;
    };
    let dragPointerId = -1;
    let dragX = 0;
    let dragY = 0;
    let dragLeft = 0;
    let dragTop = 0;
    const onPointerDown = (event) => {
        if (event.button !== 0 || event.target.closest('button')) return;
        dragPointerId = event.pointerId;
        dragX = event.clientX;
        dragY = event.clientY;
        dragLeft = panel.offsetLeft;
        dragTop = panel.offsetTop;
        header.setPointerCapture(event.pointerId);
        event.preventDefault();
    };
    const onPointerEnd = (event) => {
        if (event.pointerId === dragPointerId) dragPointerId = -1;
    };
    const dispose = () => {
        header.removeEventListener('pointermove', onPointerMove);
        header.removeEventListener('pointerdown', onPointerDown);
        header.removeEventListener('pointerup', onPointerEnd);
        header.removeEventListener('pointercancel', onPointerEnd);
        windows.delete(windowRecord);
        panel.remove();
    };
    close.addEventListener('click', dispose, { once: true });
    header.addEventListener('pointermove', onPointerMove);
    header.addEventListener('pointerdown', onPointerDown);
    header.addEventListener('pointerup', onPointerEnd);
    header.addEventListener('pointercancel', onPointerEnd);
}

function renderMessages(windowRecord, scrollToEnd) {
    const { player, list, empty, panel, selectedTab } = windowRecord;
    if (!panel.isConnected) return;
    const wasAtEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 24;
    panel.querySelectorAll('[data-history-tab]').forEach((button) => {
        button.setAttribute('aria-selected', String(button.dataset.historyTab === selectedTab));
    });
    const entries = [...player.messages.values()]
        .filter((entry) => entry.tab === selectedTab)
        .sort((a, b) => a.at - b.at);
    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
        const item = document.createElement('li');
        const time = document.createElement('time');
        if (entry.at) {
            const date = new Date(entry.at);
            time.dateTime = date.toISOString();
            time.textContent = dateTime.format(date);
        } else {
            time.textContent = '—';
        }
        const text = document.createElement('span');
        const name = document.createElement('span');
        name.textContent = `${player.name}: `;
        const body = document.createElement('span');
        body.textContent = entry.text;
        renderHistoryEmotes(body);
        text.append(name, body);
        item.append(time, text);
        fragment.appendChild(item);
    }
    list.replaceChildren(fragment);
    empty.hidden = entries.length > 0;
    empty.textContent = `В разделе «${HISTORY_TABS.find((tab) => tab.id === selectedTab).label}» сообщений пока нет`;
    const meta = panel.querySelector('.t7-player-history-meta');
    const classValue = meta.firstElementChild;
    const guildValue = meta.lastElementChild;
    classValue.textContent = `Класс: ${player.className || '—'}`;
    guildValue.textContent = `Гильдия: ${player.guild || '—'}`;
    if (scrollToEnd || wasAtEnd) list.scrollTop = list.scrollHeight;
}

export function processPlayerHistory({ message, content, source, kind, room }) {
    if (kind !== 'message' || room === 'dm' || message.matches(`.${cls('archive-row')}`)) return;
    const nick = message.querySelector(':scope > b[data-nick]');
    if (!nick) return;
    const login = clean(nick.dataset.nick, 64);
    if (!login) return;
    const activeTab = message.closest('.cy-chat')
        ?.querySelector('.cy-chat-tabs [aria-selected="true"]')?.dataset.tab;
    const tab = activeTab || (message.dataset.rm === 'mine' ? 'mn' : 'g');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = cls(HISTORY_BUTTON);
    button.hidden = !isPlayerHistoryButtonEnabled();
    const clock = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    clock.setAttribute('viewBox', '0 0 16 16');
    clock.setAttribute('width', '12');
    clock.setAttribute('height', '12');
    clock.setAttribute('aria-hidden', 'true');
    const face = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    face.setAttribute('cx', '8');
    face.setAttribute('cy', '8');
    face.setAttribute('r', '5.75');
    const hands = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hands.setAttribute('d', 'M8 4.5V8l2.5 1.5');
    clock.append(face, hands);
    button.appendChild(clock);
    button.title = `История сообщений: ${nick.textContent.trim() || login}`;
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openHistory(login, tab);
    });
    message.querySelector(`:scope > .${cls(HISTORY_BUTTON)}`)?.remove();
    message.prepend(button);

    const metadata = readRowMetadata(message);
    savePlayerMessage({
        id: message.dataset.mid,
        login,
        name: nick.textContent,
        text: source || content.textContent,
        at: readRowTimestamp(message),
        tab,
        ...metadata,
        exactTimestamp: false
    });
}
