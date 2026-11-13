import { pingSystem } from '../pingSystem.js';
import { chatScroller } from '../messages/scrollState.js';
import { copyOriginalMessageSource, unmarkMessageProcessed } from '../messages/messageState.js';
import { store } from '../../core/store.js';
import { SEL, STORE } from '../../core/consts.js';
import { cls, getOverlayRoot } from '../../core/ui.js';

const PING_ONLY_KEY = STORE.pingOnly;
const PING_ARCHIVE_KEY = STORE.pingArchive;
const PING_ARCHIVE_LIMIT = 500;
const PING_PAGE_SIZE = 50;
const ROOM_IDS = ['city', 'mine', 'one'];
const CHAT_TABS = new Set(['g', 'tr', 'mn', 'dm', 'gl', 'lg']);
const NOTIFIED_LIMIT = 1000;
const DELETED_LIMIT = 500;
const PAGE_STARTED_AT = performance.timeOrigin || Date.now();
const CHAT_BOX_ATTRIBUTE = 'data-t7-box';
const states = new Set();
const stateByBox = new WeakMap();
const notifiedIds = new Set();
const blacklistMenuLists = new WeakSet();
const noPingIndicators = new WeakMap();
let pingOnly = store.get(PING_ONLY_KEY) === true;
let saveTimer = 0;
let documentObserver = null;
let blacklistAction = null;
let blacklistMenu = null;
let blacklistMenuObserver = null;
let storedArchive = readArchive();

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
    if (!id || row.classList.contains(cls('archive-row'))
        || row.classList.contains(cls('deleted-message'))) return;
    const existing = state.deletedRows.get(id);
    const children = row.parentElement ? [...row.parentElement.children] : [];
    const index = children.indexOf(row);
    const next = children.slice(index + 1).find((item) => item.dataset.mid);
    const previous = children.slice(0, index).reverse().find((item) => item.dataset.mid);
    const clone = row.cloneNode(true);
    const sourceSpans = row.querySelectorAll(SEL.messageContent);
    const cloneSpans = clone.querySelectorAll(SEL.messageContent);
    if (sourceSpans.length && cloneSpans.length)
        copyOriginalMessageSource(sourceSpans[sourceSpans.length - 1], cloneSpans[cloneSpans.length - 1]);
    state.deletedRows.set(id, {
        node: clone,
        tab: existing ? existing.tab : tab,
        beforeId: next?.dataset.mid || existing?.beforeId || '',
        afterId: previous?.dataset.mid || existing?.afterId || ''
    });
    if (state.deletedRows.size > DELETED_LIMIT)
        state.deletedRows.delete(state.deletedRows.keys().next().value);
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
    const label = pingSystem.filterLabel(message.l, message.t);
    if (label) {
        row.classList.add(cls('filtered'));
        row.classList.toggle(cls('filtered-blacklist'), label === 'В ЧС');
        addFilterLabel(row, label);
    } else if (pingSystem.isPinged(message.t)) {
        row.classList.add(cls('ping'));
    }
    return { node: row, tab: message.tab, beforeId: '', afterId: '' };
}

function restoreDeletedRows(state) {
    if (!state.list) return;
    for (const id of state.deletedIds) {
        const cached = state.deletedRows.get(id);
        if (!cached || cached.tab !== state.activeTab) continue;
        let row = [...state.list.children].find((item) => item.dataset.mid === id
            && !item.classList.contains(cls('archive-row')));
        if (!row) {
            row = cached.node.cloneNode(true);
            row.classList.remove(cls('archive-row'));
            unmarkMessageProcessed(row);
            const next = cached.beforeId && [...state.list.children]
                .find((item) => item.dataset.mid === cached.beforeId);
            const previous = cached.afterId && [...state.list.children]
                .find((item) => item.dataset.mid === cached.afterId);
            if (next) state.list.insertBefore(row, next);
            else if (previous) previous.after(row);
            else state.list.appendChild(row);
        }
        markDeletedRow(row);
    }
}

function handleExternalDelete(state, ids, messages) {
    const messagesById = new Map(messages.map((message) => [message.id, message]));
    for (const id of ids) {
        if (!state.deletedRows.has(id)) {
            const message = messagesById.get(id);
            const snapshot = message && createDeletedSnapshot(message);
            if (snapshot) {
                state.deletedRows.set(id, snapshot);
                if (state.deletedRows.size > DELETED_LIMIT)
                    state.deletedRows.delete(state.deletedRows.keys().next().value);
            }
        }
        if (!state.deletedIds.has(id)) state.deletedIds.add(id);
        if (state.deletedIds.size > DELETED_LIMIT)
            state.deletedIds.delete(state.deletedIds.values().next().value);
    }
    restoreDeletedRows(state);
}

function rememberNotified(key) {
    if (notifiedIds.has(key)) return;
    notifiedIds.add(key);
    if (notifiedIds.size > NOTIFIED_LIMIT)
        notifiedIds.delete(notifiedIds.values().next().value);
}

function addFilterLabel(row, label) {
    let tag = row.querySelector(`:scope > .${cls('filter-label')}`);
    if (!label) {
        if (tag) tag.remove();
        return;
    }
    if (!tag) {
        tag = document.createElement('i');
        tag.className = cls('filter-label');
        row.prepend(tag);
    }
    const text = label === 'В ЧС'
        ? `Пользователь ${row.querySelector(':scope > b[data-nick]')?.textContent || ''} в чёрном списке`
        : 'Сообщение скрыто фильтром';
    if (tag.textContent !== text) tag.textContent = text;
    tag.title = label === 'В ЧС'
        ? 'Отправитель в вашем черном списке'
        : 'В сообщении найдено слово или фраза из фильтра';
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

    const label = pingSystem.filterLabel(message.login, message.text);
    addFilterLabel(row, label);
    row.classList.toggle(cls('filtered'), !!label);
    row.classList.toggle(cls('filtered-blacklist'), label === 'В ЧС');

    const nativePing = row.classList.contains('ping');
    const pinged = !label && !row.classList.contains('me')
        && (nativePing || pingSystem.isPinged(message.text));
    row.classList.toggle(cls('ping'), pinged && !nativePing);
    if (pinged) {
        const id = row.dataset.mid || '';
        archiveMessage(room, tab, { ...message, id });
        const currentTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
        if (!previouslySeen && notify && (!key || !notifiedIds.has(key))) {
            if (key) rememberNotified(key);
            if (!(state.box.classList.contains('open') && tab === currentTab))
                state.counts[tab] = (state.counts[tab] || 0) + 1;
            if (notificationBatch) notificationBatch.play = true;
            else playPingNotification();
        }
    }
    cacheRow(state, row, tab);
    return pinged;
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

function handleExternalMessage(state, payload) {
    const { msg } = payload;
    const room = msg.rm === 'mine' ? 'mine' : 'city';
    const key = messageKey(msg.id);
    if (notifiedIds.has(key)) return;

    if (pingSystem.filterLabel(msg.l, msg.t)
        || (!msg.nativePing && !pingSystem.isPinged(msg.t))) return;
    rememberNotified(key);
    if (payload.observedAt - PAGE_STARTED_AT < 3000 || Date.now() - msg.at > 60_000) return;

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

    if (data.source !== 't7-chat-msg'
        || !data.msg || typeof data.msg !== 'object'
        || typeof data.msg.id !== 'string' || !data.msg.id || data.msg.id.length > 200
        || typeof data.msg.l !== 'string' || data.msg.l.length > 64
        || typeof data.msg.n !== 'string' || data.msg.n.length > 128
        || typeof data.msg.t !== 'string' || data.msg.t.length > 2000
        || typeof data.msg.at !== 'number' || !Number.isFinite(data.msg.at)
        || typeof data.msg.tab !== 'string' || !CHAT_TABS.has(data.msg.tab)
        || typeof data.msg.rm !== 'string' || !['', 'city', 'mine'].includes(data.msg.rm)
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
    if (state) handleExternalMessage(state, data);
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

function closeBlacklistAction() {
    if (blacklistMenuObserver) blacklistMenuObserver.disconnect();
    blacklistMenuObserver = null;
    if (blacklistMenu) blacklistMenu.removeEventListener('click', closeBlacklistAction);
    blacklistMenu = null;
    if (blacklistAction) blacklistAction.remove();
    blacklistAction = null;
}

function closeBlacklistActionOutside(event) {
    if (!blacklistAction) return;
    const root = getOverlayRoot();
    if (event.target !== root.host && (!blacklistMenu || !blacklistMenu.contains(event.target)))
        closeBlacklistAction();
}

function addBlacklistMenu(state) {
    const list = state.list;
    if (!list || blacklistMenuLists.has(list)) return;
    blacklistMenuLists.add(list);
    list.addEventListener('contextmenu', (event) => {
        const nick = event.target.closest(SEL.nickButton);
        if (!nick || !list.contains(nick)) return;
        const login = String(nick.dataset.nick || '').trim();
        if (!login) return;
        requestAnimationFrame(() => {
            const menu = document.querySelector('.cy-nm');
            if (!menu) return;
            closeBlacklistAction();
            const blocked = pingSystem.config.blacklist.includes(login.toLowerCase());
            const action = document.createElement('button');
            action.type = 'button';
            action.setAttribute('role', 'menuitem');
            action.textContent = blocked ? 'Убрать из ЧС' : 'В чёрный список';
            action.className = 't7-blacklist-action';
            ['keydown', 'keyup', 'keypress'].forEach((type) =>
                action.addEventListener(type, (keyEvent) => keyEvent.stopPropagation()));
            const rect = menu.getBoundingClientRect();
            const width = Math.min(Math.max(rect.width, 160), innerWidth - 16);
            action.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - width - 8))}px`;
            action.style.top = `${Math.max(8, Math.min(rect.bottom, innerHeight - 36))}px`;
            action.style.width = `${width}px`;
            action.addEventListener('click', (clickEvent) => {
                clickEvent.preventDefault();
                clickEvent.stopPropagation();
                pingSystem.toggleBlacklist(login);
                closeBlacklistAction();
            });
            blacklistAction = action;
            blacklistMenu = menu;
            getOverlayRoot().appendChild(action);
            menu.addEventListener('click', closeBlacklistAction);
            blacklistMenuObserver = new MutationObserver(() => {
                if (!menu.isConnected || menu.hidden || getComputedStyle(menu).display === 'none')
                    closeBlacklistAction();
            });
            blacklistMenuObserver.observe(menu, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
        });
    }, true);
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
            addBlacklistMenu(state);
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
                paint(state);
                renderArchivePage(state);
                if (notificationBatch.play) playPingNotification();
            });
            state.listObserver.observe(list, { childList: true });
        }
    }
    ensureControls(state);
    if (state.list) {
        const notificationBatch = { play: false };
        state.list.querySelectorAll(`:scope > li:not(.${cls('archive-row')})`)
            .forEach((row) => processRow(state, row, notify, notificationBatch));
        addBlacklistMenu(state);
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
        quietTab: null
    };
    stateByBox.set(box, state);
    states.add(state);
    state.boxObserver = new MutationObserver(() => refreshRows(state, true));
    state.boxObserver.observe(box, { childList: true });
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
    document.addEventListener('pointerdown', closeBlacklistActionOutside, true);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeBlacklistAction();
    }, true);
    window.addEventListener('message', onExternalMessage);
    window.postMessage({ source: 't7-chat-ready' }, location.origin);
    startDocumentObserver();
}
