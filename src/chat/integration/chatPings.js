import { pingSystem } from '../pingSystem.js';
import { chatScroller } from '../messages/scrollState.js';
import { SEL } from '../../core/consts.js';
import { cls } from '../../core/ui.js';
import { pageChan } from '../../core/config.js';
import { CHAT_WINDOW_QUERY } from '../ui/chatWindow.js';

const CHAT_TABS = new Set(['g', 'tr', 'mn', 'dm', 'gl', 'lg']);
const NOTIFIED_LIMIT = 1000;
const PAGE_STARTED_AT = performance.timeOrigin || Date.now();
const STARTUP_NOTIFICATION_GRACE_MS = 3000;
const CHAT_BOX_ATTRIBUTE = 'data-t7-box';
const CHAT_READ_MESSAGE = 'LEGION7TV_CHAT_READ';
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
let pointerSelectionTarget = null;
let documentObserver = null;
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

function getTab(box, row) {
    if (row.dataset.rm === 'mine') return 'mn';
    const selected = box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`);
    return selected && selected.dataset.tab || 'g';
}

function getMessage(row) {
    if (row.matches(`${SEL.emptyMessage}, ${SEL.systemMessage}, ${SEL.eventMessage}`)) return null;
    const nick = row.querySelector(':scope > b[data-nick]');
    const content = row.querySelector(':scope > span:not([class])');
    const login = nick && String(nick.dataset.nick || '').trim();
    const text = content ? content.textContent : '';
    if (!login || !text) return null;
    return { login, name: nick.textContent.trim() || login, text };
}

function messageKey(id) {
    return String(id);
}

function getChatReadScope() {
    const url = new URL(location.href);
    url.searchParams.delete(CHAT_WINDOW_QUERY);
    url.hash = '';
    return url.href;
}

function isReadMessage(state, tab, id) {
    return !!id && !!state.readIds.get(tab)?.has(id);
}

function getMessageIds(collection, tab) {
    let ids = collection.get(tab);
    if (!ids) {
        ids = new Set();
        collection.set(tab, ids);
    }
    return ids;
}

export function applyReadMarker(state, tab, ids) {
    const readIds = getMessageIds(state.readIds, tab);
    const unreadIds = getMessageIds(state.unreadIds, tab);
    const unreadMessageIds = getMessageIds(state.unreadMessageIds, tab);
    state.trackedMessageTabs.add(tab);
    let removed = 0;
    for (const id of ids) {
        if (typeof id !== 'string' || !id || id.length > 200) continue;
        readIds.add(id);
        if (unreadIds.delete(id)) removed++;
        unreadMessageIds.delete(id);
    }
    while (readIds.size > NOTIFIED_LIMIT)
        readIds.delete(readIds.values().next().value);
    if (removed)
        state.counts[tab] = Math.max(0, (state.counts[tab] || 0) - removed);
    return removed;
}

function sendReadMarker(tab, ids) {
    const api = globalThis.browser || globalThis.chrome;
    if (!api?.runtime || typeof api.runtime.sendMessage !== 'function') {
        console.warn('[Legion7TV] API расширения недоступно для синхронизации прочитанных сообщений');
        return;
    }
    try {
        Promise.resolve(api.runtime.sendMessage({
            type: CHAT_READ_MESSAGE,
            tab,
            ids
        })).then((result) => {
            if (!result || result.ok !== true)
                console.warn('[Legion7TV] Не удалось синхронизировать прочитанные сообщения', result?.error);
        }).catch((error) => {
            console.warn('[Legion7TV] Не удалось синхронизировать прочитанные сообщения', error);
        });
    } catch (error) {
        console.warn('[Legion7TV] Не удалось синхронизировать прочитанные сообщения', error);
    }
}

function markMessagesRead(tab, ids) {
    const uniqueIds = [...new Set(ids)].filter((id) =>
        typeof id === 'string' && id.length > 0 && id.length <= 200);
    if (!uniqueIds.length) return;
    const boundedIds = uniqueIds.slice(-NOTIFIED_LIMIT);
    for (const current of states) {
        applyReadMarker(current, tab, boundedIds);
        renderBadges(current);
    }
    sendReadMarker(tab, boundedIds);
}

function markTabRead(state, tab) {
    const ids = new Set(getMessageIds(state.unreadIds, tab));
    for (const id of getMessageIds(state.unreadMessageIds, tab)) ids.add(id);
    if (state.list) {
        state.list.querySelectorAll(':scope > li[data-mid]').forEach((row) => {
            if (getTab(state.box, row) !== tab || !getMessage(row)) return;
            const id = messageKey(row.dataset.mid);
            if (!isReadMessage(state, tab, id)) ids.add(id);
        });
    }
    markMessagesRead(tab, [...ids]);
}

function onChatReadMessage(message) {
    if (!message || message.type !== CHAT_READ_MESSAGE
        || message.scope !== getChatReadScope()
        || !CHAT_TABS.has(message.tab)
        || !Array.isArray(message.ids) || message.ids.length > NOTIFIED_LIMIT) return;
    const ids = message.ids.filter((id) =>
        typeof id === 'string' && id.length > 0 && id.length <= 200);
    for (const state of states) {
        applyReadMarker(state, message.tab, ids);
        paint(state);
    }
}

export function getAppendedRowsAfterSeen(list, records, seen) {
    const rows = [...list.children].filter((row) => row.tagName === 'LI');
    let lastSeenIndex = -1;
    rows.forEach((row, index) => {
        if (row.dataset.mid && seen.has(messageKey(row.dataset.mid))) lastSeenIndex = index;
    });

    const rowIndices = new Map(rows.map((row, index) => [row, index]));
    const appendedRows = new Set();
    for (const record of records) {
        if (record.target !== list) continue;
        for (const node of record.addedNodes) {
            if (node.nodeType !== 1 || node.tagName !== 'LI') continue;
            if (rowIndices.get(node) > lastSeenIndex) appendedRows.add(node);
        }
    }
    return appendedRows;
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
    const message = getMessage(row);
    if (!message) return false;
    const tab = getTab(state.box, row);
    const key = row.dataset.mid ? messageKey(row.dataset.mid) : '';
    const previouslySeen = key && state.seen.has(key);
    if (key) state.seen.add(key);
    const alreadyRead = isReadMessage(state, tab, key);
    if (!previouslySeen && notify && key && !row.classList.contains('me')
        && !alreadyRead
        && Date.now() - PAGE_STARTED_AT >= STARTUP_NOTIFICATION_GRACE_MS) {
        const activeTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
        if (!isTabVisible(state, tab, activeTab)) {
            getMessageIds(state.unreadMessageIds, tab).add(key);
            state.trackedMessageTabs.add(tab);
        }
    }

    const nativePing = row.classList.contains('ping');
    const pinged = !row.classList.contains('me')
        && (nativePing || pingSystem.isPinged(message.text) || guildEveryonePingIds.has(key));
    row.classList.toggle(cls('ping'), pinged && !nativePing);
    if (pinged) {
        const currentTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
        if (!previouslySeen && notify) {
            const alreadyNotified = key && notifiedIds.has(key);
            if (key) rememberNotified(key);
            const duplicateEveryone = !alreadyNotified && tab === 'gl'
                && GUILD_EVERYONE_RE.test(message.text)
                && isDuplicateGuildEveryoneNotification(message);
            if (!alreadyNotified && !duplicateEveryone && !alreadyRead
                && Date.now() - PAGE_STARTED_AT >= STARTUP_NOTIFICATION_GRACE_MS) {
                if (!isTabVisible(state, tab, currentTab)) {
                    state.counts[tab] = (state.counts[tab] || 0) + 1;
                    if (key) getMessageIds(state.unreadIds, tab).add(key);
                }
                if (notificationBatch) notificationBatch.play = true;
                else playPingNotification();
            }
        }
    }
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
    let element = parent.querySelector(`:scope > .${className}`)
        || parent.querySelector(`.${className}`);
    if (!element) {
        element = document.createElement('b');
        element.className = className;
        parent.appendChild(element);
    }
    const hidden = count <= 0;
    const text = count > 99 ? '99+' : count ? String(count) : '';
    const tooltip = count > 0 ? `${title}: ${count}` : '';
    if (element.hidden !== hidden) element.hidden = hidden;
    if (element.textContent !== text) element.textContent = text;
    if (element.title !== tooltip) element.title = tooltip;
}

function isTabVisible(state, tab, activeTab) {
    const selectedTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
    return state.box.classList.contains('open')
        && tab === activeTab
        && tab === selectedTab
        && document.visibilityState === 'visible'
        && document.hasFocus();
}

function renderBadges(state) {
    let total = 0;
    let newMessageTotal = 0;
    state.box.querySelectorAll(SEL.chatTabButtons).forEach((button) => {
        const count = state.counts[button.dataset.tab] || 0;
        total += count;
        badge(button, cls('chat-tp'), count, 'Упоминаний');
        const tracked = state.trackedMessageTabs.has(button.dataset.tab);
        const newMessages = tracked
            ? state.unreadMessageIds.get(button.dataset.tab)?.size || 0
            : readBadgeCount(button, 'cy-chat-tn');
        newMessageTotal += newMessages;
        if (tracked)
            badge(button, 'cy-chat-tn', newMessages, 'Новых сообщений');
    });
    const toggle = state.box.querySelector(SEL.chatToggleButton);
    if (toggle) badge(toggle, cls('chat-pn'), state.box.classList.contains('open') ? 0 : total, 'Упоминаний');
    if (toggle && state.trackedMessageTabs.size)
        badge(toggle, 'cy-chat-n', state.box.classList.contains('open') ? 0 : newMessageTotal,
            'Новых сообщений');
}

function readBadgeCount(parent, className) {
    const element = parent.querySelector(`:scope > .${className}`)
        || parent.querySelector(`.${className}`);
    if (!element || element.hidden) return 0;
    const text = element.textContent.trim();
    const value = Number.parseInt(text, 10);
    return Number.isFinite(value) ? value : 0;
}

function observeBadgeTargets(state) {
    const targets = [
        state.box.querySelector(SEL.chatTabs),
        state.box.querySelector(SEL.chatToggleButton)
    ].filter(Boolean);
    if (targets.length === state.badgeTargets.length
        && targets.every((target, index) => target === state.badgeTargets[index])) return;

    state.badgeObserver?.disconnect();
    state.badgeTargets = targets;
    state.badgeObserver = new MutationObserver(() => renderBadges(state));
    for (const target of targets) {
        state.badgeObserver.observe(target, {
            attributes: true,
            attributeFilter: ['hidden'],
            childList: true,
            characterData: true,
            subtree: true
        });
    }
}

function paint(state) {
    const activeTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
    if (activeTab && isTabVisible(state, activeTab, activeTab)) {
        markTabRead(state, activeTab);
        state.counts[activeTab] = 0;
    }
    renderBadges(state);
}

async function handleExternalMessage(state, payload) {
    const { msg } = payload;
    const key = messageKey(msg.id);
    const alreadyReadAtArrival = isReadMessage(state, msg.tab, key);
    if (payload.observedAt - PAGE_STARTED_AT >= STARTUP_NOTIFICATION_GRACE_MS
        && Date.now() - msg.at <= 60_000
        && !alreadyReadAtArrival) {
        if (isTabVisible(state, msg.tab, payload.activeTab)) {
            markMessagesRead(msg.tab, [key]);
        } else {
            getMessageIds(state.unreadMessageIds, msg.tab).add(key);
            state.trackedMessageTabs.add(msg.tab);
        }
        paint(state);
    }
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

    const alreadyRead = alreadyReadAtArrival;
    if (!alreadyRead) {
        if (!isTabVisible(state, msg.tab, payload.activeTab)) {
            state.counts[msg.tab] = (state.counts[msg.tab] || 0) + 1;
            getMessageIds(state.unreadIds, msg.tab).add(key);
        }
    }
    paint(state);
    if (!alreadyRead) playPingNotification();
}

function onExternalMessage(event) {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || typeof data.boxId !== 'string' || !/^t7b\d{1,12}$/.test(data.boxId)) return;

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

function refreshRows(state, notify = false) {
    if (!state.box.isConnected) return;
    const activeTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab || '';
    if (state.activeTab !== activeTab) {
        if (state.activeTab) state.quietTab = activeTab;
        state.activeTab = activeTab;
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
    observeBadgeTargets(state);
    const list = state.box.querySelector(SEL.chatList);
    if (list !== state.list) {
        state.listObserver?.disconnect();
        state.list = list;
        notify = false;
        if (list) {
            chatScroller.register(list);
            state.listObserver = new MutationObserver((records) => {
                const currentTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab || '';
                if (currentTab !== state.activeTab) {
                    refreshRows(state, false);
                    return;
                }
                const quietLoad = state.quietTab === currentTab;
                const notificationRows = getAppendedRowsAfterSeen(list, records, state.seen);
                const notificationBatch = { play: false };
                list.querySelectorAll(':scope > li')
                    .forEach((row) => processRow(state, row,
                        !quietLoad && notificationRows.has(row), notificationBatch));
                if (quietLoad) state.quietTab = null;
                paint(state);
                if (notificationBatch.play) playPingNotification();
                restoreNickSelection(state);
            });
            state.listObserver.observe(list, { childList: true });
        }
    }
    if (state.list) {
        const notificationBatch = { play: false };
        state.list.querySelectorAll(':scope > li')
            .forEach((row) => processRow(state, row, notify, notificationBatch));
        if (notificationBatch.play) playPingNotification();
    }
    paint(state);
}

function observeBox(box) {
    if (stateByBox.has(box)) return;
    const state = {
        box,
        list: null,
        listObserver: null,
        counts: {},
        seen: new Set(),
        unreadIds: new Map(),
        unreadMessageIds: new Map(),
        readIds: new Map(),
        trackedMessageTabs: new Set(),
        badgeTargets: [],
        badgeObserver: null,
        quietTab: null
    };
    stateByBox.set(box, state);
    states.add(state);
    state.boxObserver = new MutationObserver(() => refreshRows(state, false));
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
                    state.badgeObserver?.disconnect();
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
    const api = globalThis.browser || globalThis.chrome;
    api?.runtime?.onMessage?.addListener(onChatReadMessage);
    window.addEventListener('message', onExternalMessage);
    const refreshVisibleReadState = () => states.forEach(paint);
    document.addEventListener('visibilitychange', refreshVisibleReadState);
    window.addEventListener('focus', refreshVisibleReadState);
    document.addEventListener('selectionchange', rememberSelectionInChats);
    document.addEventListener('pointerdown', beginNickSelection, true);
    document.addEventListener('pointerup', finishNickSelection, true);
    document.addEventListener('mouseup', finishNickSelection, true);
    document.addEventListener('pointercancel', cancelNickSelection, true);
    document.addEventListener('keydown', clearSelectionOnKey, true);
    window.postMessage({ source: 't7-chat-ready' }, location.origin);
    startDocumentObserver();
}
