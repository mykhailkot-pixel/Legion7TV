import { pingSystem } from '../pingSystem.js';
import { chatScroller } from '../messages/scrollState.js';
import { store } from '../../core/store.js';
import { SEL, STORE } from '../../core/consts.js';

const PING_ONLY_KEY = STORE.pingOnly;
const PING_ARCHIVE_KEY = STORE.pingArchive;
const PING_ARCHIVE_LIMIT = 500;
const PING_PAGE_SIZE = 50;
const ROOM_IDS = ['city', 'mine', 'one'];
const states = new Set();
const stateByBox = new WeakMap();
let pingOnly = store.get(PING_ONLY_KEY) === true;
let saveTimer = 0;
let documentObserver = null;
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
        || row.classList.contains('t7-archive-row')) return null;
    const nick = row.querySelector(':scope > b[data-nick]');
    const content = row.querySelector(':scope > span:not([class])');
    const login = nick && String(nick.dataset.nick || '').trim();
    const text = content ? content.textContent : '';
    if (!login || !text) return null;
    return { login, name: nick.textContent.trim() || login, text };
}

function archiveMessage(room, tab, row, message) {
    if (!row.dataset.mid) return;
    const id = `${room}:${row.dataset.mid}`;
    if (storedArchive[room].some((item) => `${room}:${item.id}` === id)) return;
    storedArchive[room].push({
        id: row.dataset.mid,
        login: message.login,
        name: message.name,
        text: message.text,
        tab,
        at: Date.now()
    });
    storedArchive[room].sort((a, b) => a.at - b.at);
    if (storedArchive[room].length > PING_ARCHIVE_LIMIT)
        storedArchive[room].splice(0, storedArchive[room].length - PING_ARCHIVE_LIMIT);
    saveArchiveSoon();
}

function addFilterLabel(row, label) {
    let tag = row.querySelector(':scope > .t7-filter-label');
    if (!label) {
        if (tag) tag.remove();
        return;
    }
    if (!tag) {
        tag = document.createElement('i');
        tag.className = 't7-filter-label';
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
    const message = getMessage(row);
    if (!message) return false;
    const room = getRoom(state.box, row);
    const tab = getTab(state.box, row);
    const key = row.dataset.mid ? `${room}:${row.dataset.mid}` : '';
    const previouslySeen = key && state.seen.has(key);
    if (key) state.seen.add(key);
    row.dataset.t7PingProcessed = '1';

    const label = pingSystem.filterLabel(message.login, message.text);
    addFilterLabel(row, label);
    row.classList.toggle('t7-filtered', !!label);
    row.classList.toggle('t7-filtered-blacklist', label === 'В ЧС');

    const nativePing = row.classList.contains('ping');
    const pinged = !label && !row.classList.contains('me')
        && (nativePing || pingSystem.isPinged(message.text));
    row.classList.toggle('t7-ping', pinged && !nativePing);
    if (pinged) {
        archiveMessage(room, tab, row, message);
        const currentTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
        if (!previouslySeen && notify) {
            state.counts[tab] = (state.counts[tab] || 0) + (tab === currentTab ? 0 : 1);
            if (notificationBatch) notificationBatch.play = true;
            else playPingNotification();
        }
    }
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
    if (activeTab) state.counts[activeTab] = 0;
    let total = 0;
    state.box.querySelectorAll(SEL.chatTabButtons).forEach((button) => {
        const count = state.counts[button.dataset.tab] || 0;
        total += count;
        badge(button, 'cy-chat-tp', count, 'Упоминаний');
    });
    const toggle = state.box.querySelector(SEL.chatToggleButton);
    if (toggle) badge(toggle, 'cy-chat-pn', state.box.classList.contains('open') ? 0 : total, 'Упоминаний');
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

function archiveRow(message, room) {
    const row = document.createElement('li');
    row.className = 't7-archive-row ping';
    row.dataset.mid = message.id;
    row.dataset.t7ArchiveRoom = room;
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
    const nav = state.box.querySelector('.t7-ping-nav');
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
        list.querySelectorAll(':scope > li:not(.t7-archive-row)').forEach((row) => {
            const keep = state.page === 0
                && (row.classList.contains('ping') || row.classList.contains('t7-ping'));
            row.classList.toggle('t7-ping-hidden', pingOnly && !keep);
        });
        list.querySelectorAll(':scope > .t7-archive-row').forEach((row) => {
            if (!wanted.has(row.dataset.mid)) row.remove();
        });
        if (pingOnly) {
            const present = new Set([...list.querySelectorAll(':scope > li[data-mid]')].map((row) => row.dataset.mid));
            const room = state.box.closest('.mn') ? 'mine'
                : state.box.closest('.co-host, .co-float') ? 'one' : 'city';
            const missing = pageMessages.filter((message) => !present.has(message.id))
                .map((message) => archiveRow(message, room));
            if (missing.length) {
                const firstLiveRow = list.querySelector(':scope > li:not(.t7-archive-row)');
                if (firstLiveRow) firstLiveRow.before(...missing);
                else list.append(...missing);
            }
        }
        list.dataset.t7NoPings = String(pingOnly && !pageMessages.length);
    });
    updateArchiveControls(state);
}

function ensureControls(state) {
    const header = state.box.querySelector(SEL.chatHeader);
    if (!header) return;

    let filter = header.querySelector('.t7-chat-filter');
    if (!filter) {
        filter = document.createElement('label');
        filter.className = 't7-chat-filter';
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
                const input = current.box.querySelector('.t7-chat-filter input');
                if (input) input.checked = pingOnly;
                current.page = 0;
                renderArchivePage(current);
            }
        });
    }
    filter.querySelector('input').checked = pingOnly;
    const close = header.querySelector(SEL.chatCloseButton);
    if (!filter.isConnected) header.insertBefore(filter, close || null);

    let nav = header.querySelector('.t7-ping-nav');
    if (!nav) {
        nav = document.createElement('span');
        nav.className = 't7-ping-nav';
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

function addBlacklistMenu(state) {
    const list = state.list;
    if (!list || list.dataset.t7BlacklistMenu) return;
    list.dataset.t7BlacklistMenu = '1';
    list.addEventListener('contextmenu', (event) => {
        const nick = event.target.closest(SEL.nickButton);
        if (!nick || !list.contains(nick)) return;
        const login = String(nick.dataset.nick || '').trim();
        if (!login) return;
        requestAnimationFrame(() => {
            const menu = document.querySelector('.cy-nm');
            if (!menu || menu.dataset.t7BlacklistAction) return;
            menu.dataset.t7BlacklistAction = '1';
            const blocked = pingSystem.config.blacklist.includes(login.toLowerCase());
            const action = document.createElement('button');
            action.type = 'button';
            action.setAttribute('role', 'menuitem');
            action.dataset.nm = 't7-blacklist';
            action.textContent = blocked ? 'Убрать из ЧС' : 'В чёрный список';
            action.addEventListener('click', () => pingSystem.toggleBlacklist(login));
            menu.appendChild(action);
        });
    }, true);
}

function refreshRows(state, notify = false) {
    if (!state.box.isConnected) return;
    const activeTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab || '';
    if (state.activeTab !== activeTab) {
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
            state.listObserver = new MutationObserver(() => {
                const currentTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab || '';
                if (currentTab !== state.activeTab) {
                    refreshRows(state, false);
                    return;
                }
                const notificationBatch = { play: false };
                list.querySelectorAll(':scope > li:not(.t7-archive-row)')
                    .forEach((row) => processRow(state, row, true, notificationBatch));
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
        state.list.querySelectorAll(':scope > li:not(.t7-archive-row)')
            .forEach((row) => processRow(state, row, notify, notificationBatch));
        addBlacklistMenu(state);
        if (notificationBatch.play) playPingNotification();
    }
    paint(state);
    renderArchivePage(state);
}

function observeBox(box) {
    if (stateByBox.has(box)) return;
    const state = { box, list: null, listObserver: null, counts: {}, page: 0, seen: new Set() };
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
    startDocumentObserver();
}
