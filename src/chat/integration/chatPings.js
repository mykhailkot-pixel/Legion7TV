import { pingSystem } from '../pingSystem.js';
import { chatScroller } from '../messages/scrollState.js';
import { copyOriginalMessageSource, unmarkMessageProcessed } from '../messages/messageState.js';
import { store } from '../../core/store.js';
import { EV, on, SEL, STORE } from '../../core/consts.js';
import { cls } from '../../core/ui.js';
import { pageChan } from '../../core/config.js';
import { savePlayerMessage } from '../messages/playerHistory.js';
import { getChatHistoryLimit, setChatHistoryLimit } from './chatHistory.js';

const PING_ONLY_KEY = STORE.pingOnly;
const PING_ARCHIVE_KEY = STORE.pingArchive;
const DELETED_MESSAGES_KEY = STORE.deletedMessagesEnabled;
const PING_ARCHIVE_LIMIT = 500;
const PING_PAGE_SIZE = 50;
const ROOM_IDS = ['city', 'mine', 'one'];
const CHAT_TABS = new Set(['g', 'tr', 'mn', 'dm', 'gl', 'lg']);
const NOTIFIED_LIMIT = 1000;
const PAGE_STARTED_AT = performance.timeOrigin || Date.now();
const STARTUP_NOTIFICATION_GRACE_MS = 3000;
const CHAT_BOX_ATTRIBUTE = 'data-t7-box';
const GUILD_EVERYONE_RE = /(?<![\p{L}\p{N}_])@everyone(?![\p{L}\p{N}_])/iu;
const GUILD_EVERYONE_ROLES = Object.freeze({
    leader: 'guildEveryoneLeader',
    lead: 'guildEveryoneLead',
    trusted: 'guildEveryoneTrusted'
});
const states = new Set();
const stateByBox = new WeakMap();
const notifiedIds = new Set();
const guildEveryonePingIds = new Set();
const recentGuildEveryoneNotifications = new Map();
const noPingIndicators = new WeakMap();
let pointerSelectionTarget = null;
let pingOnly = store.get(PING_ONLY_KEY) === true;
let saveTimer = 0;
let documentObserver = null;
let storedArchive = readArchive();
let guildMembership = { guildId: '', role: '' };
let guildRolePromise = Promise.resolve();

async function refreshGuildRole() {
    if (!pageChan) return;
    try {
        const endpoint = new URL(`/c/${encodeURIComponent(pageChan)}/api/guildhall`, location.origin);
        const response = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) throw new Error(`guildhall request failed with status ${response.status}`);
        const data = await response.json();
        const role = data && data.ok === true
            && Object.prototype.hasOwnProperty.call(GUILD_EVERYONE_ROLES, data.role)
            ? data.role
            : '';
        const guildId = data && data.guild && data.guild.id != null
            ? String(data.guild.id).slice(0, 64)
            : '';
        guildMembership = role && guildId ? { guildId, role } : { guildId: '', role: '' };
    } catch (error) {
        console.warn('[Legion7TV] Не удалось получить роль гильдии для @everyone', error);
    }
}

function isGuildEveryonePing(message) {
    const preference = GUILD_EVERYONE_ROLES[guildMembership.role];
    return message.tab === 'gl'
        && !!guildMembership.guildId
        && message.guildId === guildMembership.guildId
        && !!preference
        && pingSystem.config[preference] !== false
        && GUILD_EVERYONE_RE.test(message.t);
}

async function loadGuildChatMessages() {
    if (!pageChan || !guildMembership.guildId) return;
    try {
        const endpoint = new URL(`/c/${encodeURIComponent(pageChan)}/api/guilds/chat`, location.origin);
        const response = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) throw new Error(`guild chat request failed with status ${response.status}`);
        const data = await response.json();
        if (!data || data.ok !== true || !Array.isArray(data.msgs)) {
            throw new Error('guild chat response has an unexpected format');
        }
        const guildId = String(data.guild || '');
        if (guildId !== guildMembership.guildId) return;

        for (const message of data.msgs) {
            if (!message || message.id == null) continue;
            const rawId = String(message.id);
            const id = rawId.startsWith('g') ? rawId : `g${rawId}`;
            rememberNotified(messageKey(id));
            if (typeof message.t !== 'string' || !GUILD_EVERYONE_RE.test(message.t)) continue;
            const messageGuildId = String(message.g == null ? guildId : message.g);
            if (!isGuildEveryonePing({ tab: 'gl', guildId: messageGuildId, t: message.t })) continue;
            rememberGuildEveryonePing(messageKey(id));
            const rowMessage = {
                id,
                l: String(message.l || '').toLowerCase(),
                t: message.t
            };
            for (const state of states) highlightGuildEveryoneRows(state, rowMessage);
        }
        for (const state of states) refreshRows(state, false);
    } catch (error) {
        console.warn('[Legion7TV] Не удалось загрузить сообщения гильдейского чата для подсветки @everyone', error);
    }
}

export function areDeletedMessagesEnabled() {
    return store.get(DELETED_MESSAGES_KEY) !== false;
}

export function getDeletedMessagesLimit() {
    return getChatHistoryLimit();
}

export function setDeletedMessagesLimit(value) {
    return setChatHistoryLimit(value);
}

on(EV.chatHistoryLimitChange, (event) => {
    for (const state of states) trimDeletedMessages(state, event.detail);
});

export function setDeletedMessagesEnabled(enabled) {
    const active = !!enabled;
    store.set(DELETED_MESSAGES_KEY, active);
    if (active) return;
    for (const state of states) clearDeletedRows(state);
}

function readArchive() {
    const saved = store.get(PING_ARCHIVE_KEY);
    const archive = Object.fromEntries(ROOM_IDS.map((room) => [room, []]));
    for (const room of ROOM_IDS) {
        const values = saved && Array.isArray(saved[room]) ? saved[room] : [];
        for (const message of values) {
            if (!message || message.id == null) continue;
            const text = typeof message.text === 'string' ? message.text : String(message.t || '');
            const login = String(message.login || message.l || '');
            const name = String(message.name || message.n || login);
            const tab = String(message.tab || message.tb || inferTab(message));
            archive[room].push({
                id: String(message.id),
                login,
                name,
                text,
                tab,
                at: Number(message.at) || 0
            });
        }
    }
    return archive;
}

function inferTab(message) {
    if (message.rm === 'mine') return 'mn';
    if (message.k === 'tr') return 'tr';
    if (message.k === 'dm') return 'dm';
    return 'g';
}

function saveArchiveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveTimer = 0;
        store.set(PING_ARCHIVE_KEY, storedArchive);
    }, 500);
}

function getRoom(box, row) {
    if (box.closest('.co-host, .co-float')) return 'one';
    if (row.dataset.rm === 'mine' || box.closest('.mn')) return 'mine';
    if (row.dataset.rm === 'city') return 'city';
    return 'city';
}

function getTab(box, row) {
    if (row.dataset.rm === 'mine') return 'mn';
    const selected = box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`);
    return selected && selected.dataset.tab || 'g';
}

function getMessage(row) {
    if (row.matches(`${SEL.emptyMessage}, ${SEL.systemMessage}, ${SEL.eventMessage}`)
        || row.classList.contains(cls('archive-row'))) return null;
    const nick = row.querySelector(':scope > b[data-nick]');
    const content = row.querySelector(':scope > span:not([class])');
    const login = nick && String(nick.dataset.nick || '').trim();
    const text = content ? content.textContent : '';
    if (!login || !text) return null;
    return { login, name: nick.textContent.trim() || login, text };
}

function archiveMessage(room, tab, message) {
    if (!message.id) return;
    const id = `${room}:${message.id}`;
    if (storedArchive[room].some((item) => `${room}:${item.id}` === id)) return;
    storedArchive[room].push({
        id: message.id,
        login: message.login,
        name: message.name,
        text: message.text,
        tab,
        at: Number(message.at) || Date.now()
    });
    storedArchive[room].sort((a, b) => a.at - b.at);
    if (storedArchive[room].length > PING_ARCHIVE_LIMIT)
        storedArchive[room].splice(0, storedArchive[room].length - PING_ARCHIVE_LIMIT);
    saveArchiveSoon();
}

function messageKey(id) {
    return String(id);
}

function cacheRow(state, row, tab) {
    const id = row.dataset.mid;
    if (!areDeletedMessagesEnabled() || !id || row.classList.contains(cls('archive-row'))
        || row.classList.contains(cls('deleted-message'))) return;
    const existing = state.deletedRows.get(id);
    const children = row.parentElement ? [...row.parentElement.children] : [];
    const index = children.indexOf(row);
    const isMessageRow = (item) => item.dataset.mid
        && !item.classList.contains(cls('archive-row'));
    const next = children.slice(index + 1).find(isMessageRow);
    const previous = children.slice(0, index).reverse().find(isMessageRow);
    const clone = row.cloneNode(true);
    const sourceSpans = row.querySelectorAll(SEL.messageContent);
    const cloneSpans = clone.querySelectorAll(SEL.messageContent);
    if (sourceSpans.length && cloneSpans.length)
        copyOriginalMessageSource(sourceSpans[sourceSpans.length - 1], cloneSpans[cloneSpans.length - 1]);
    state.deletedRows.set(id, {
        node: clone,
        tab: existing ? existing.tab : tab,
        beforeId: next?.dataset.mid || existing?.beforeId || '',
        afterId: previous?.dataset.mid || existing?.afterId || '',
        position: index >= 0 ? index : existing?.position ?? -1
    });
    trimDeletedMessages(state);
}

function markDeletedRow(row) {
    row.classList.add(cls('deleted-message'));
    let label = row.querySelector(`:scope > .${cls('deleted-label')}`);
    if (!label) {
        label = document.createElement('span');
        label.className = cls('deleted-label');
        row.appendChild(label);
    }
    label.textContent = ' - deleted';
}

function createDeletedSnapshot(message) {
    if (!CHAT_TABS.has(message.tab)) return null;
    const row = document.createElement('li');
    row.dataset.mid = message.id;
    const nick = document.createElement('b');
    nick.dataset.nick = message.l;
    nick.tabIndex = 0;
    nick.textContent = message.n || message.l;
    const text = document.createElement('span');
    text.textContent = message.t;
    row.append(nick, document.createTextNode(' '), text);
    if (pingSystem.isPinged(message.t)) {
        row.classList.add(cls('ping'));
    }
    return { node: row, tab: message.tab, beforeId: '', afterId: '', position: -1 };
}

function restoreDeletedRows(state) {
    if (!areDeletedMessagesEnabled() || !state.list) return;
    const pending = [];
    for (const id of state.deletedIds) {
        const cached = state.deletedRows.get(id);
        if (!cached || cached.tab !== state.activeTab) continue;
        const trackedRow = state.restoredDeletedRows.get(id);
        let row = trackedRow && trackedRow.isConnected && trackedRow.parentElement === state.list
            ? trackedRow
            : [...state.list.children].find((item) => item.dataset.mid === id
                && !item.classList.contains(cls('archive-row')));
        if (row) {
            if (row !== trackedRow) state.restoredDeletedRows.delete(id);
            markDeletedRow(row);
        } else pending.push({ id, cached });
    }

    pending.sort((left, right) => {
        const leftPosition = left.cached.position >= 0 ? left.cached.position : Number.MAX_SAFE_INTEGER;
        const rightPosition = right.cached.position >= 0 ? right.cached.position : Number.MAX_SAFE_INTEGER;
        return leftPosition - rightPosition;
    });
    if (!pending.length) return;

    chatScroller.keep(state.list, () => {
        for (const { id, cached } of pending) {
            const row = cached.node.cloneNode(true);
            row.classList.remove(cls('archive-row'));
            unmarkMessageProcessed(row);
            const children = [...state.list.children];
            const next = cached.beforeId && children.find((item) =>
                item.dataset.mid === cached.beforeId
                && !item.classList.contains(cls('archive-row')));
            const previous = cached.afterId && children.find((item) =>
                item.dataset.mid === cached.afterId
                && !item.classList.contains(cls('archive-row')));
            if (next) {
                state.list.insertBefore(row, next);
            } else if (previous) {
                previous.after(row);
            } else if (cached.position >= 0) {
                state.list.insertBefore(row, children[Math.min(cached.position, children.length)] || null);
            } else {
                state.list.appendChild(row);
            }
            state.restoredDeletedRows.set(id, row);
            markDeletedRow(row);
        }
    });
}

function clearDeletedRows(state) {
    const deletedIds = new Set(state.deletedIds);
    const restoredRows = new Set(state.restoredDeletedRows.values());
    for (const row of restoredRows) {
        if (row.isConnected) row.remove();
    }
    if (state.list) {
        state.list.querySelectorAll(':scope > li[data-mid]').forEach((row) => {
            if (!deletedIds.has(row.dataset.mid) || restoredRows.has(row)) return;
            row.classList.remove(cls('deleted-message'));
            row.querySelector(`:scope > .${cls('deleted-label')}`)?.remove();
        });
    }
    state.deletedRows.clear();
    state.deletedIds.clear();
    state.restoredDeletedRows.clear();
}

function discardDeletedRow(state, id) {
    const restored = state.restoredDeletedRows.get(id);
    if (restored) {
        if (restored.isConnected) restored.remove();
        state.restoredDeletedRows.delete(id);
    }
    if (!state.list) return;
    const row = [...state.list.querySelectorAll(':scope > li[data-mid]')]
        .find((item) => item.dataset.mid === id);
    if (!row) return;
    row.classList.remove(cls('deleted-message'));
    row.querySelector(`:scope > .${cls('deleted-label')}`)?.remove();
}

function trimDeletedMessages(state, limit = getDeletedMessagesLimit()) {
    const discardedIds = new Set();
    while (state.deletedRows.size > limit) {
        const id = state.deletedRows.keys().next().value;
        state.deletedRows.delete(id);
        if (state.deletedIds.delete(id)) discardedIds.add(id);
    }
    while (state.deletedIds.size > limit) {
        const id = state.deletedIds.values().next().value;
        state.deletedIds.delete(id);
        discardedIds.add(id);
    }
    if (!discardedIds.size) return;

    const discardRows = () => {
        for (const id of discardedIds) discardDeletedRow(state, id);
    };
    if (state.list) chatScroller.keep(state.list, discardRows);
    else discardRows();
}

function handleExternalDelete(state, ids, messages) {
    if (!areDeletedMessagesEnabled()) return;
    const messagesById = new Map(messages.map((message) => [message.id, message]));
    for (const id of ids) {
        if (!state.deletedRows.has(id)) {
            const message = messagesById.get(id);
            const snapshot = message && createDeletedSnapshot(message);
            if (snapshot) {
                state.deletedRows.set(id, snapshot);
            }
        }
        if (!state.deletedIds.has(id)) state.deletedIds.add(id);
    }
    trimDeletedMessages(state);
    restoreDeletedRows(state);
}

function rememberNotified(key) {
    if (notifiedIds.has(key)) return;
    notifiedIds.add(key);
    if (notifiedIds.size > NOTIFIED_LIMIT)
        notifiedIds.delete(notifiedIds.values().next().value);
}

function rememberGuildEveryonePing(key) {
    if (!key) return;
    guildEveryonePingIds.add(key);
    if (guildEveryonePingIds.size > NOTIFIED_LIMIT)
        guildEveryonePingIds.delete(guildEveryonePingIds.values().next().value);
}

function isDuplicateGuildEveryoneNotification(message) {
    const now = Date.now();
    const login = String(message.l || message.login || '').toLowerCase();
    const text = typeof message.t === 'string' ? message.t : String(message.text || '');
    const signature = `${login}\u0000${text}`;
    const previous = recentGuildEveryoneNotifications.get(signature);
    recentGuildEveryoneNotifications.set(signature, now);
    for (const [key, at] of recentGuildEveryoneNotifications) {
        if (now - at > 2000) recentGuildEveryoneNotifications.delete(key);
    }
    while (recentGuildEveryoneNotifications.size > NOTIFIED_LIMIT)
        recentGuildEveryoneNotifications.delete(recentGuildEveryoneNotifications.keys().next().value);
    return previous !== undefined && now - previous <= 2000;
}

function highlightGuildEveryoneRows(state, message) {
    if (!state.list) return;
    for (const row of state.list.querySelectorAll(':scope > li[data-mid]')) {
        if (getTab(state.box, row) !== 'gl') continue;
        const rowMessage = getMessage(row);
        const sameId = row.dataset.mid === message.id;
        if (!sameId && (!rowMessage
            || rowMessage.login.toLowerCase() !== message.l.toLowerCase()
            || rowMessage.text !== message.t)) continue;
        row.classList.add(cls('ping'));
    }
}

function playPingNotification() {
    pingSystem.play().catch((error) =>
        console.warn('[7TV] не удалось воспроизвести звук пинга', error));
}

function processRow(state, row, notify, notificationBatch = null) {
    if (row.classList.contains(cls('deleted-message'))) return false;
    const message = getMessage(row);
    if (!message) return false;
    const room = getRoom(state.box, row);
    const tab = getTab(state.box, row);
    const key = row.dataset.mid ? messageKey(row.dataset.mid) : '';
    const previouslySeen = key && state.seen.has(key);
    if (key) state.seen.add(key);

    const nativePing = row.classList.contains('ping');
    const pinged = !row.classList.contains('me')
        && (nativePing || pingSystem.isPinged(message.text) || guildEveryonePingIds.has(key));
    row.classList.toggle(cls('ping'), pinged && !nativePing);
    if (pinged) {
        const id = row.dataset.mid || '';
        archiveMessage(room, tab, { ...message, id });
        const currentTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
        if (!previouslySeen && notify) {
            const alreadyNotified = key && notifiedIds.has(key);
            if (key) rememberNotified(key);
            const duplicateEveryone = !alreadyNotified && tab === 'gl'
                && GUILD_EVERYONE_RE.test(message.text)
                && isDuplicateGuildEveryoneNotification(message);
            if (!alreadyNotified && !duplicateEveryone
                && Date.now() - PAGE_STARTED_AT >= STARTUP_NOTIFICATION_GRACE_MS) {
                if (!(state.box.classList.contains('open') && tab === currentTab))
                    state.counts[tab] = (state.counts[tab] || 0) + 1;
                if (notificationBatch) notificationBatch.play = true;
                else playPingNotification();
            }
        }
    }
    cacheRow(state, row, tab);
    return pinged;
}

function nickAtSelectionPoint(node) {
    const element = node instanceof Element ? node : node && node.parentElement;
    return element && element.closest('b[data-nick]');
}

function selectionOffset(nick, node, offset) {
    const range = document.createRange();
    range.selectNodeContents(nick);
    range.setEnd(node, offset);
    return range.toString().length;
}

function rememberNickSelection(state) {
    if (pointerSelectionTarget && pointerSelectionTarget.state !== state) return;
    if (!pointerSelectionTarget && state.nickSelection) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount || !state.list) return;
    const anchorNick = nickAtSelectionPoint(selection.anchorNode);
    const focusNick = nickAtSelectionPoint(selection.focusNode);
    if (!anchorNick || anchorNick !== focusNick) return;
    const row = anchorNick.closest('li[data-mid]');
    if (!row || !state.list.contains(row)
        || (pointerSelectionTarget && (row.dataset.mid !== pointerSelectionTarget.id
            || anchorNick.dataset.nick !== pointerSelectionTarget.login))) return;

    state.nickSelection = {
        id: row.dataset.mid,
        login: anchorNick.dataset.nick,
        anchorOffset: selectionOffset(anchorNick, selection.anchorNode, selection.anchorOffset),
        focusOffset: selectionOffset(focusNick, selection.focusNode, selection.focusOffset)
    };
}

function restoreNickSelection(state) {
    const saved = state.nickSelection;
    if (!saved || !state.list) return;
    const selection = window.getSelection();
    const row = [...state.list.querySelectorAll(':scope > li[data-mid]')]
        .find((item) => item.dataset.mid === saved.id);
    const nick = row && row.querySelector(':scope > b[data-nick]');
    const text = nick && nick.firstChild;
    if (!nick || nick.dataset.nick !== saved.login || !text || text.nodeType !== Node.TEXT_NODE) {
        state.nickSelection = null;
        return;
    }

    const anchorOffset = Math.min(saved.anchorOffset, text.length);
    const focusOffset = Math.min(saved.focusOffset, text.length);
    if (!selection) return;
    if (typeof selection.setBaseAndExtent === 'function') {
        selection.setBaseAndExtent(text, anchorOffset, text, focusOffset);
    } else {
        const range = document.createRange();
        range.setStart(text, Math.min(anchorOffset, focusOffset));
        range.setEnd(text, Math.max(anchorOffset, focusOffset));
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function rememberSelectionInChats() {
    for (const state of states) rememberNickSelection(state);
}

function clearSelectionsInChats() {
    for (const state of states) state.nickSelection = null;
    pointerSelectionTarget = null;
}

function beginNickSelection(event) {
    clearSelectionsInChats();
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    const nick = event.target.closest('b[data-nick]');
    const row = nick && nick.closest('li[data-mid]');
    if (!nick || !row) return;
    const state = [...states].find((item) => item.list && item.list.contains(row));
    if (state) pointerSelectionTarget = {
        state,
        id: row.dataset.mid,
        login: nick.dataset.nick
    };
}

function finishNickSelection() {
    const target = pointerSelectionTarget;
    if (!target) return;
    rememberSelectionInChats();
    window.setTimeout(() => {
        if (pointerSelectionTarget !== target) return;
        rememberSelectionInChats();
        pointerSelectionTarget = null;
    }, 100);
}

function cancelNickSelection() {
    pointerSelectionTarget = null;
}

function clearSelectionOnKey(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') return;
    clearSelectionsInChats();
}

function badge(parent, className, count, title) {
    let element = parent.querySelector(`:scope > .${className}`);
    if (!element) {
        element = document.createElement('b');
        element.className = className;
        parent.appendChild(element);
    }
    element.hidden = count <= 0;
    element.textContent = count > 99 ? '99+' : count ? String(count) : '';
    element.title = count > 0 ? `${title}: ${count}` : '';
}

function paint(state) {
    const activeTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
    if (state.box.classList.contains('open') && activeTab) state.counts[activeTab] = 0;
    let total = 0;
    state.box.querySelectorAll(SEL.chatTabButtons).forEach((button) => {
        const count = state.counts[button.dataset.tab] || 0;
        total += count;
        badge(button, cls('chat-tp'), count, 'Упоминаний');
    });
    const toggle = state.box.querySelector(SEL.chatToggleButton);
    if (toggle) badge(toggle, cls('chat-pn'), state.box.classList.contains('open') ? 0 : total, 'Упоминаний');
}

async function handleExternalMessage(state, payload) {
    const { msg } = payload;
    const room = msg.rm === 'mine' ? 'mine' : 'city';
    const key = messageKey(msg.id);
    if (notifiedIds.has(key)) return;

    const regularPing = msg.nativePing || pingSystem.isPinged(msg.t);
    const everyoneMention = msg.tab === 'gl' && GUILD_EVERYONE_RE.test(msg.t);
    if (!regularPing && !everyoneMention) return;
    rememberNotified(key);
    let guildEveryonePing = false;
    if (everyoneMention) {
        await guildRolePromise;
        guildEveryonePing = isGuildEveryonePing(msg);
        if (!regularPing && !guildEveryonePing) return;
    }
    if (guildEveryonePing) {
        rememberGuildEveryonePing(key);
        highlightGuildEveryoneRows(state, msg);
        if (isDuplicateGuildEveryoneNotification(msg)) return;
    }
    if (payload.observedAt - PAGE_STARTED_AT < STARTUP_NOTIFICATION_GRACE_MS
        || Date.now() - msg.at > 60_000) return;

    archiveMessage(room, msg.tab, {
        id: msg.id,
        login: msg.l,
        name: msg.n,
        text: msg.t,
        at: msg.at
    });
    if (!(payload.open && msg.tab === payload.activeTab))
        state.counts[msg.tab] = (state.counts[msg.tab] || 0) + 1;
    paint(state);
    playPingNotification();
}

function onExternalMessage(event) {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || typeof data.boxId !== 'string' || !/^t7b\d{1,12}$/.test(data.boxId)) return;

    if (data.source === 't7-chat-del') {
        if (!Array.isArray(data.ids) || data.ids.length > 100
            || data.ids.some((id) => typeof id !== 'string' || !id || id.length > 200)
            || !Array.isArray(data.messages) || data.messages.length > 100
            || data.messages.some((message) => !message || typeof message !== 'object'
                || typeof message.id !== 'string' || !message.id || message.id.length > 200
                || typeof message.l !== 'string' || message.l.length > 64
                || typeof message.n !== 'string' || message.n.length > 128
                || typeof message.t !== 'string' || message.t.length > 2000
                || typeof message.tab !== 'string' || !CHAT_TABS.has(message.tab))) return;
        const box = document.querySelector(`[${CHAT_BOX_ATTRIBUTE}="${CSS.escape(data.boxId)}"]`);
        if (!box) return;
        let state = stateByBox.get(box);
        if (!state) {
            observeBox(box);
            state = stateByBox.get(box);
        }
        if (state) handleExternalDelete(state, data.ids, data.messages);
        return;
    }

    if (data.source === 't7-chat-history-msg') {
        const msg = data.msg;
        if (!msg || typeof msg !== 'object'
            || typeof msg.id !== 'string' || !msg.id || msg.id.length > 200
            || typeof msg.l !== 'string' || !msg.l || msg.l.length > 64
            || typeof msg.n !== 'string' || msg.n.length > 128
            || typeof msg.t !== 'string' || msg.t.length > 2000
            || typeof msg.at !== 'number' || !Number.isFinite(msg.at)
            || !['g', 'mn', 'gl', 'tr'].includes(msg.tb)
            || typeof msg.cn !== 'string' || msg.cn.length > 64
            || typeof msg.gt !== 'string' || msg.gt.length > 64) return;
        savePlayerMessage({
            id: msg.id,
            login: msg.l,
            name: msg.n,
            text: msg.t,
            at: msg.at,
            tab: msg.tb,
            className: msg.cn,
            guild: msg.gt,
            exactTimestamp: true
        });
        return;
    }

    if (data.source !== 't7-chat-msg'
        || !data.msg || typeof data.msg !== 'object'
        || typeof data.msg.id !== 'string' || !data.msg.id || data.msg.id.length > 200
        || typeof data.msg.l !== 'string' || data.msg.l.length > 64
        || typeof data.msg.n !== 'string' || data.msg.n.length > 128
        || typeof data.msg.t !== 'string' || data.msg.t.length > 2000
        || typeof data.msg.at !== 'number' || !Number.isFinite(data.msg.at)
        || typeof data.msg.tab !== 'string' || !CHAT_TABS.has(data.msg.tab)
        || typeof data.msg.rm !== 'string' || !['', 'city', 'mine'].includes(data.msg.rm)
        || (data.msg.guildId !== undefined
            && (typeof data.msg.guildId !== 'string' || data.msg.guildId.length > 64))
        || typeof data.msg.nativePing !== 'boolean'
        || typeof data.open !== 'boolean'
        || typeof data.activeTab !== 'string'
        || typeof data.observedAt !== 'number' || !Number.isFinite(data.observedAt)) return;

    const box = document.querySelector(`[${CHAT_BOX_ATTRIBUTE}="${CSS.escape(data.boxId)}"]`);
    if (!box) return;
    let state = stateByBox.get(box);
    if (!state) {
        observeBox(box);
        state = stateByBox.get(box);
    }
    if (state) {
        void handleExternalMessage(state, data).catch((error) => {
            console.error('[Legion7TV] Не удалось обработать пинг', error);
        });
    }
}

function visibleArchive(state) {
    const activeTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
    const rooms = state.box.closest('.mn') ? ['mine']
        : state.box.closest('.co-host, .co-float') ? ['one', 'city', 'mine'] : ['city'];
    const messages = rooms.flatMap((room) => storedArchive[room] || []);
    return [...new Map(messages.map((item) => [item.id, item])).values()]
        .filter((item) => item.tab === activeTab)
        .sort((a, b) => a.at - b.at);
}

function archiveRow(message) {
    const row = document.createElement('li');
    row.className = `${cls('archive-row')} ping`;
    row.dataset.mid = message.id;
    row.title = message.at ? new Date(message.at).toLocaleTimeString() : '';
    const nick = document.createElement('b');
    nick.dataset.nick = message.login;
    nick.tabIndex = 0;
    nick.textContent = message.name || message.login;
    const text = document.createElement('span');
    text.textContent = message.text;
    row.append(nick, document.createTextNode(' '), text);
    return row;
}

function updateArchiveControls(state) {
    const nav = state.box.querySelector(`.${cls('ping-nav')}`);
    if (!nav) return;
    const messages = visibleArchive(state);
    const pages = Math.ceil(messages.length / PING_PAGE_SIZE);
    state.page = Math.min(state.page, Math.max(0, pages - 1));
    nav.hidden = !pingOnly || pages < 2;
    const older = nav.querySelector('[data-direction="older"]');
    const newer = nav.querySelector('[data-direction="newer"]');
    if (older) older.disabled = state.page >= pages - 1;
    if (newer) newer.disabled = state.page === 0;
}

function renderArchivePage(state) {
    const list = state.list;
    if (!list) return;
    const messages = visibleArchive(state);
    const start = Math.max(0, messages.length - (state.page + 1) * PING_PAGE_SIZE);
    const end = messages.length - state.page * PING_PAGE_SIZE;
    const pageMessages = messages.slice(start, end);
    const wanted = new Set(pageMessages.map((message) => message.id));

    chatScroller.keep(list, () => {
        list.querySelectorAll(`:scope > li:not(.${cls('archive-row')})`).forEach((row) => {
            if (noPingIndicators.get(list) === row) return;
            const keep = state.page === 0
                && (row.classList.contains('ping') || row.classList.contains(cls('ping')));
            row.classList.toggle(cls('ping-hidden'), pingOnly && !keep);
        });
        list.querySelectorAll(`:scope > .${cls('archive-row')}`).forEach((row) => {
            if (!wanted.has(row.dataset.mid)) row.remove();
        });
        if (pingOnly) {
            const present = new Set([...list.querySelectorAll(':scope > li[data-mid]')].map((row) => row.dataset.mid));
            const missing = pageMessages.filter((message) => !present.has(message.id))
                    .map(archiveRow);
            if (missing.length) {
                const firstLiveRow = list.querySelector(`:scope > li:not(.${cls('archive-row')})`);
                if (firstLiveRow) firstLiveRow.before(...missing);
                else list.append(...missing);
            }
        }
        updateNoPingIndicator(list, pingOnly && !pageMessages.length);
    });
    updateArchiveControls(state);
}

function updateNoPingIndicator(list, visible) {
    let indicator = noPingIndicators.get(list);
    if (!visible) {
        if (indicator) indicator.remove();
        noPingIndicators.delete(list);
        return;
    }
    if (!indicator) {
        indicator = document.createElement('li');
        indicator.textContent = 'Пингов пока нет';
        Object.assign(indicator.style, {
            display: 'block',
            padding: '12px 6px',
            color: '#aaa',
            font: '12px/1.4 system-ui, sans-serif',
            textAlign: 'center'
        });
        noPingIndicators.set(list, indicator);
    }
    if (indicator.parentElement !== list) list.appendChild(indicator);
}

function ensureControls(state) {
    const header = state.box.querySelector(SEL.chatHeader);
    if (!header) return;

    let filter = header.querySelector(`.${cls('chat-filter')}`);
    if (!filter) {
        filter = document.createElement('label');
        filter.className = cls('chat-filter');
        filter.title = 'Показывать только сообщения с упоминанием';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        const text = document.createElement('span');
        text.textContent = 'Только пинги';
        filter.append(checkbox, text);
        filter.addEventListener('click', (event) => event.stopPropagation());
        checkbox.addEventListener('change', () => {
            pingOnly = checkbox.checked;
            store.set(PING_ONLY_KEY, pingOnly);
            for (const current of states) {
                const input = current.box.querySelector(`.${cls('chat-filter')} input`);
                if (input) input.checked = pingOnly;
                current.page = 0;
                renderArchivePage(current);
            }
        });
    }
    filter.querySelector('input').checked = pingOnly;
    const close = header.querySelector(SEL.chatCloseButton);
    if (!filter.isConnected) header.insertBefore(filter, close || null);

    let nav = header.querySelector(`.${cls('ping-nav')}`);
    if (!nav) {
        nav = document.createElement('span');
        nav.className = cls('ping-nav');
        for (const [direction, title, symbol] of [
            ['older', 'Показать более старые пинги', '‹'],
            ['newer', 'Показать более новые пинги', '›']
        ]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.direction = direction;
            button.title = title;
            button.setAttribute('aria-label', title);
            button.textContent = symbol;
            nav.appendChild(button);
        }
        nav.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-direction]');
            if (!button) return;
            event.stopPropagation();
            state.page = Math.max(0, state.page + (button.dataset.direction === 'older' ? 1 : -1));
            renderArchivePage(state);
        });
        header.insertBefore(nav, close || null);
    }
}

function refreshRows(state, notify = false) {
    if (!state.box.isConnected) return;
    const activeTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab || '';
    if (state.activeTab !== activeTab) {
        if (state.activeTab) state.quietTab = activeTab;
        state.activeTab = activeTab;
        state.page = 0;
        notify = false;
    }
    const tabs = state.box.querySelector(SEL.chatTabs);
    if (tabs !== state.tabs) {
        state.tabsObserver?.disconnect();
        state.tabs = tabs;
        if (tabs) {
            state.tabsObserver = new MutationObserver(() => refreshRows(state, false));
            state.tabsObserver.observe(tabs, {
                attributes: true,
                attributeFilter: ['aria-selected'],
                subtree: true
            });
        }
    }
    const list = state.box.querySelector(SEL.chatList);
    if (list !== state.list) {
        state.listObserver?.disconnect();
        state.list = list;
        state.page = 0;
        notify = false;
        if (list) {
            chatScroller.register(list);
            state.listObserver = new MutationObserver((records) => {
                for (const record of records) {
                    for (const node of record.removedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE && node.matches('li[data-mid]'))
                            cacheRow(state, node, state.activeTab);
                    }
                }
                const currentTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab || '';
                if (currentTab !== state.activeTab) {
                    refreshRows(state, false);
                    return;
                }
                const quietLoad = state.quietTab === currentTab;
                const notificationBatch = { play: false };
                list.querySelectorAll(`:scope > li:not(.${cls('archive-row')})`)
                    .forEach((row) => processRow(state, row, !quietLoad, notificationBatch));
                if (quietLoad) state.quietTab = null;
                restoreDeletedRows(state);
                paint(state);
                renderArchivePage(state);
                if (notificationBatch.play) playPingNotification();
                restoreNickSelection(state);
            });
            state.listObserver.observe(list, { childList: true });
        }
    }
    ensureControls(state);
    if (state.list) {
        const notificationBatch = { play: false };
        state.list.querySelectorAll(`:scope > li:not(.${cls('archive-row')})`)
            .forEach((row) => processRow(state, row, notify, notificationBatch));
        if (notificationBatch.play) playPingNotification();
    }
    restoreDeletedRows(state);
    paint(state);
    renderArchivePage(state);
}

function observeBox(box) {
    if (stateByBox.has(box)) return;
    const state = {
        box,
        list: null,
        listObserver: null,
        counts: {},
        page: 0,
        seen: new Set(),
        deletedRows: new Map(),
        deletedIds: new Set(),
        restoredDeletedRows: new Map(),
        quietTab: null
    };
    stateByBox.set(box, state);
    states.add(state);
    state.boxObserver = new MutationObserver(() => refreshRows(state, true));
    state.boxObserver.observe(box, { childList: true });
    box.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) return;
        const nick = event.target.closest('b[data-nick]');
        const selection = window.getSelection();
        if (!nick || !selection || selection.isCollapsed || !selection.rangeCount
            || !selection.getRangeAt(0).intersectsNode(nick)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);
    box.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)
            || !event.target.closest(`${SEL.chatTabButtons}, ${SEL.chatToggleButton}, ${SEL.chatCloseButton}`)) return;
        queueMicrotask(() => refreshRows(state, false));
    });
    refreshRows(state, false);
}

function startDocumentObserver() {
    if (documentObserver || !document.documentElement) return;
    documentObserver = new MutationObserver((records) => {
        for (const record of records) {
            for (const node of record.removedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                const removedBoxes = [];
                if (node.matches(SEL.chatRoot)) removedBoxes.push(node);
                removedBoxes.push(...node.querySelectorAll(SEL.chatRoot));
                for (const box of removedBoxes) {
                    const state = stateByBox.get(box);
                    if (!state || box.isConnected) continue;
                    state.boxObserver.disconnect();
                    state.listObserver?.disconnect();
                    state.tabsObserver?.disconnect();
                    states.delete(state);
                    stateByBox.delete(box);
                }
            }
            for (const node of record.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                if (node.matches(SEL.chatRoot)) observeBox(node);
                node.querySelectorAll(SEL.chatRoot).forEach(observeBox);
            }
        }
    });
    documentObserver.observe(document.documentElement, { childList: true, subtree: true });
    document.querySelectorAll(SEL.chatRoot).forEach(observeBox);
}

pingSystem.subscribe(() => {
    for (const state of states) refreshRows(state, false);
});

export function startChatPingIntegration() {
    guildRolePromise = refreshGuildRole();
    void guildRolePromise.then(loadGuildChatMessages);
    if (pageChan) window.setInterval(() => {
        guildRolePromise = refreshGuildRole();
    }, 5 * 60 * 1000);
    window.addEventListener('message', onExternalMessage);
    document.addEventListener('selectionchange', rememberSelectionInChats);
    document.addEventListener('pointerdown', beginNickSelection, true);
    document.addEventListener('pointerup', finishNickSelection, true);
    document.addEventListener('mouseup', finishNickSelection, true);
    document.addEventListener('pointercancel', cancelNickSelection, true);
    document.addEventListener('keydown', clearSelectionOnKey, true);
    window.postMessage({ source: 't7-chat-ready' }, location.origin);
    startDocumentObserver();
}
