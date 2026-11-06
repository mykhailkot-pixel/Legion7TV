import { pingSystem } from '../pingSystem.js';
import { chatScroller } from '../messages/scrollState.js';
import { store } from '../../core/store.js';
import { SEL, STORE } from '../../core/consts.js';

const PING_ONLY_KEY = STORE.pingOnly;
const PING_ARCHIVE_KEY = STORE.pingArchive;
const PING_ARCHIVE_LIMIT = 500;
const PING_PAGE_SIZE = 50;
let pingOnly = store.get(PING_ONLY_KEY) === true;
const storedPingArchive = store.get(PING_ARCHIVE_KEY) || {};
const cityPingArchive = Array.isArray(storedPingArchive.city) ? storedPingArchive.city.filter((m) => m && m.id != null) : [];
const minePingArchive = Array.isArray(storedPingArchive.mine) ? storedPingArchive.mine.filter((m) => m && m.id != null) : [];
const unifiedPingArchive = Array.isArray(storedPingArchive.one) ? storedPingArchive.one.filter((m) => m && m.id != null) : [];
const ROOM_IDS = ['city', 'mine', 'one'];
const createRoomState = (archive = []) => ({
    instance: null,
    pings: {},
    archive,
    archiveIds: new Set(archive.map((m) => String(m.id))),
    archivePage: 0,
    injectedPings: new Set(),
    filterObserver: null,
    filterList: null
});
const rooms = {
    city: createRoomState(cityPingArchive),
    mine: createRoomState(minePingArchive),
    one: createRoomState(unifiedPingArchive)
};
let pingArchiveSaveTimer = 0;

export const hasUnifiedChat = () => !!rooms.one.instance;

export function setChatInstance(room, instance) {
    rooms[room].instance = instance;
}

export function resetPingCounts(room) {
    rooms[room].pings = {};
}

export function clearInjectedPings(room) {
    rooms[room].injectedPings.clear();
}

export function removePingArchiveMessages(room, ids) {
    const state = rooms[room];
    const deleted = new Set(ids);
    const kept = state.archive.filter((message) => !deleted.has(String(message.id)));
    if (kept.length === state.archive.length) return false;
    state.archive = kept;
    state.archiveIds = new Set(kept.map((message) => String(message.id)));
    schedulePingArchiveSave();
    return true;
}

pingSystem.subscribe(() => {
    for (const room of Object.values(rooms)) if (room.instance) room.instance.raw.render();
});

function schedulePingArchiveSave() {
    clearTimeout(pingArchiveSaveTimer);
    pingArchiveSaveTimer = setTimeout(() => {
        pingArchiveSaveTimer = 0;
        store.set(PING_ARCHIVE_KEY, Object.fromEntries(ROOM_IDS.map((room) => [room, rooms[room].archive])));
    }, 500);
}

export function chatOf(room) {
    const i = rooms[room].instance;
    const S = i && i.K.state();
    return S && S.chat ? { S, C: S.chat } : null;
}
function tabOfMsg(C, m) {   // как tabOf в чате сайта
    return m.tb || (m.rm === 'mine' ? 'mn' : m.ev ? (C.tr ? 'ev' : 'g') : m.k === 'tr' ? 'tr' : m.k === 'dm' ? 'dm' : 'g');
}
function isPingMessage(room, m, me) {
    const o = chatOf(room);
    if (!m || m.id == null || String(m.l || '').toLowerCase() === me || m.ev || m.sys) return false;
    if (o && o.C.ign && o.C.ign.has(m.l)) return false;
    if (pingSystem.shouldIgnore(m.l, m.t)) return false;
    return pingSystem.isPinged(m.t, me ? [me] : []);
}
export function rememberPingMessages(room, msgs) {
    const roomState = rooms[room];
    const fallbackRoom = room === 'mine' ? 'city' : 'mine';
    const i = roomState.instance || rooms[fallbackRoom].instance;
    const x = i && i.K.X();
    const me = String((x && x.login && x.login()) || '').toLowerCase();
    const items = roomState.archive;
    const ids = roomState.archiveIds;
    let changed = false;
    for (const m of msgs || []) {
        if (!isPingMessage(room, m, me)) continue;
        const id = String(m.id);
        if (ids.has(id)) continue;
        items.push(m);
        ids.add(id);
        changed = true;
    }
    if (!changed) return;
    items.sort((a, b) => (a.at || 0) - (b.at || 0));
    while (items.length > PING_ARCHIVE_LIMIT) ids.delete(String(items.shift().id));
    schedulePingArchiveSave();
}
export function stripArchivedPings(room) {
    const o = chatOf(room);
    const injected = rooms[room].injectedPings;
    if (o && o.C.list && injected.size) {
        const list = o.C.list.filter((m) => !injected.has(String(m.id)));
        o.C.list.splice(0, o.C.list.length, ...list);
    }
    injected.clear();
}
function archivePage(room, C) {
    const roomState = rooms[room];
    const messages = roomState.archive.filter((m) => tabOfMsg(C, m) === C.tab);
    const pageCount = Math.max(1, Math.ceil(messages.length / PING_PAGE_SIZE));
    roomState.archivePage = Math.min(roomState.archivePage, pageCount - 1);
    const end = messages.length - roomState.archivePage * PING_PAGE_SIZE;
    return messages.slice(Math.max(0, end - PING_PAGE_SIZE), end);
}
function syncPingArchive(room) {
    const o = chatOf(room);
    if (!o || !o.C.list) return false;
    const injected = rooms[room].injectedPings;
    const wanted = pingOnly ? archivePage(room, o.C) : [];
    const wantedIds = new Set(wanted.map((m) => String(m.id)));
    const presentIds = new Set(o.C.list.map((m) => String(m.id)));
    let changed = false;
    for (const id of injected) {
        if (wantedIds.has(id) && presentIds.has(id)) continue;
        const index = o.C.list.findIndex((m) => String(m.id) === id);
        if (index >= 0) {
            o.C.list.splice(index, 1);
            changed = true;
        }
        injected.delete(id);
    }
    for (const message of wanted) {
        const id = String(message.id);
        if (presentIds.has(id)) continue;
        o.C.list.push(message);
        injected.add(id);
        presentIds.add(id);
        changed = true;
    }
    if (changed) o.C.list.sort((a, b) => (a.at || 0) - (b.at || 0));
    return changed;
}
export function refreshPingArchive(room) {
    const i = rooms[room].instance;
    if (!i) return;
    const o = chatOf(room);
    const list = o && o.S.el && o.S.el.querySelector(SEL.chatList);
    const update = () => {
        if (syncPingArchive(room)) i.raw.render();
        markFilteredMessages(room);
        applyPingOnly(room);
    };
    if (list) chatScroller.keep(list, update);
    else update();
    updatePingArchiveControl(room);
}
export function countPings(room, msgs) {
    const o = chatOf(room);
    if (!o) return;
    rememberPingMessages(room, msgs);
    const x = rooms[room].instance.K.X();
    const me = String((x && x.login && x.login()) || '').toLowerCase();
    const pg = rooms[room].pings;
    let hit = false;
    for (const m of msgs || []) {
        if (!m || String(m.l || '').toLowerCase() === me || m.ev || m.sys) continue;
        if (o.C.ign && o.C.ign.has(m.l)) continue;
        if (pingSystem.shouldIgnore(m.l, m.t)) continue;
        if (!pingSystem.isPinged(m.t, me ? [me] : [])) continue;
        const id = m.id == null ? '' : room + ':' + String(m.id);
        if (!id || !seenPings.has(id)) {
            pingSystem.play().catch((error) =>
                console.warn('[7TV] не удалось воспроизвести звук пинга', error));
            if (id) {
                seenPings.add(id);
                if (seenPings.size > 500) seenPings.delete(seenPings.values().next().value);
            }
        }
        const tb = tabOfMsg(o.C, m);
        if (!o.C.on || (o.C.open && o.C.tab === tb)) continue;
        pg[tb] = (pg[tb] || 0) + 1;
        hit = true;
    }
    if (hit && o.C.on) paint(room);
}

const seenPings = new Set();
function visibleChatMessages(C) {
    return C.list.filter((m) => tabOfMsg(C, m) === C.tab
        && !(C.ign && C.ign.has(m.l))
        && (C.tab !== 'dm' || !C.peer || m.sys || m.l === C.peer || m.to === C.peer));
}

function markFilteredMessages(room) {
    const o = chatOf(room);
    const list = o && o.S.el && o.S.el.querySelector(SEL.chatList);
    if (!list || !o.C) return;
    const messagesById = new Map(visibleChatMessages(o.C).map((message) => [String(message.id), message]));
    const rows = list.querySelectorAll(SEL.nonEmptyChatRows);
    const x = rooms[room].instance.K.X();
    const me = String((x && x.login && x.login()) || '').toLowerCase();
    rows.forEach((row) => {
        const m = messagesById.get(row.dataset.mid);
        if (!m) {
            row.classList.remove('ping', 't7-filtered', 't7-filtered-blacklist');
            const oldTag = row.querySelector(':scope > .t7-filter-label');
            if (oldTag) oldTag.remove();
            return;
        }
        const label = pingSystem.filterLabel(m.l, m.t);
        row.classList.toggle('t7-filtered', !!label);
        row.classList.toggle('t7-filtered-blacklist', label === 'В ЧС');
        row.classList.toggle('ping', !label && pingSystem.isPinged(m.t, me ? [me] : []));
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
        const text = label === 'В ЧС' ? `Пользователь ${m.n || m.l} в чёрном списке` : 'Сообщение скрыто фильтром';
        if (tag.textContent !== text) tag.textContent = text;
        tag.title = label === 'В ЧС' ? 'Отправитель в вашем черном списке' : 'В сообщении найдено слово или фраза из фильтра';
    });
}

function keepPingList(room, mutate) {
    const o = chatOf(room);
    const list = o && o.S.el && o.S.el.querySelector(SEL.chatList);
    if (list) chatScroller.keep(list, mutate);
    else mutate();
}

function applyPingOnly(room) {
    const o = chatOf(room);
    const list = o && o.S.el && o.S.el.querySelector(SEL.chatList);
    if (!list) return;
    const messagesById = new Map(visibleChatMessages(o.C).map((message) => [String(message.id), message]));
    const pageIds = new Set(archivePage(room, o.C).map((m) => String(m.id)));
    let hasPing = false;
    list.querySelectorAll(':scope > li').forEach((row) => {
        if (row.classList.contains('cy-chat-0')) return;
        const message = messagesById.get(row.dataset.mid);
        const onPage = message && (message.id == null || pageIds.has(String(message.id)));
        const keep = !pingOnly || row.classList.contains('ping') && onPage;
        row.classList.toggle('t7-ping-hidden', !keep);
        if (pingOnly && keep) hasPing = true;
    });
    list.dataset.t7NoPings = String(pingOnly && !hasPing);
}

function syncPingOnlyControls() {
    for (const room of (hasUnifiedChat() ? ['one'] : ['city', 'mine'])) {
        const o = chatOf(room);
        const input = o && o.S.el && o.S.el.querySelector('.t7-chat-filter input');
        if (input) input.checked = pingOnly;
        refreshPingArchive(room);
    }
}

function addPingOnlyControl(room, box) {
    const header = box.querySelector(SEL.chatHeader);
    if (!header) return;
    let label = header.querySelector('.t7-chat-filter');
    if (!label) {
        label = document.createElement('label');
        label.className = 't7-chat-filter';
        label.title = 'Показывать только сообщения с упоминанием';
        const input = document.createElement('input');
        input.type = 'checkbox';
        const text = document.createElement('span');
        text.textContent = 'Только пинги';
        label.append(input, text);
        label.addEventListener('click', (e) => e.stopPropagation());
        label.querySelector('input').addEventListener('change', (e) => {
            pingOnly = e.currentTarget.checked;
            store.set(PING_ONLY_KEY, pingOnly);
            syncPingOnlyControls();
        });
    }
    label.querySelector('input').checked = pingOnly;
    const close = header.querySelector(SEL.chatCloseButton);
    if (!label.isConnected) header.insertBefore(label, close || null);

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
        nav.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-direction]');
            if (!button) return;
            e.stopPropagation();
            const roomState = rooms[room];
            roomState.archivePage = Math.max(0, roomState.archivePage + (button.dataset.direction === 'older' ? 1 : -1));
            refreshPingArchive(room);
            updatePingArchiveControl(room);
        });
        header.insertBefore(nav, close || null);
    }
    updatePingArchiveControl(room);
    keepPingList(room, () => applyPingOnly(room));
}
function updatePingArchiveControl(room) {
    const o = chatOf(room);
    const header = o && o.S.el && o.S.el.querySelector(SEL.chatHeader);
    const nav = header && header.querySelector('.t7-ping-nav');
    if (!nav || !o.C) return;
    const roomState = rooms[room];
    const count = roomState.archive.filter((m) => tabOfMsg(o.C, m) === o.C.tab).length;
    const pages = Math.ceil(count / PING_PAGE_SIZE);
    roomState.archivePage = Math.min(roomState.archivePage, Math.max(0, pages - 1));
    nav.hidden = !pingOnly || pages < 2;
    const older = nav.querySelector('[data-direction="older"]');
    const newer = nav.querySelector('[data-direction="newer"]');
    if (older) older.disabled = roomState.archivePage >= pages - 1;
    if (newer) newer.disabled = roomState.archivePage === 0;
}

const num = (n) => (n > 99 ? '99+' : String(n));
function badge(parent, cls, n, title) {
    let b = parent.querySelector(':scope > .' + cls);
    if (!b) {
        b = document.createElement('b');
        b.className = cls;
        parent.appendChild(b);
    }
    b.hidden = !n;
    b.textContent = n ? num(n) : '';
    b.title = n ? title + ': ' + n : '';
}
export function paint(room) {
    const o = chatOf(room);
    const box = o && o.S.el && o.S.el.querySelector('.cy-chat');
    if (!box) return;
    const pg = rooms[room].pings;
    if (o.C.open) pg[o.C.tab] = 0;   // открытая вкладка прочитана
    let total = 0;
    box.querySelectorAll(SEL.chatTabButtons).forEach((b) => {
        const n = pg[b.dataset.tab] || 0;
        total += n;
        badge(b, 'cy-chat-tp', n, 'Упоминаний');
    });
    const t = box.querySelector(SEL.chatToggleButton);
    if (t) badge(t, 'cy-chat-pn', o.C.open ? 0 : total, 'Упоминаний');
}
export function pingBind(room) {
    const o = chatOf(room);
    const box = o && o.S.el && o.S.el.querySelector(SEL.chatRoot);
    if (!box || box.dataset.t7pg) return;
    box.dataset.t7pg = '1';
    addPingOnlyControl(room, box);
    box.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)
            || !event.target.closest(`${SEL.chatTabButtons}, ${SEL.chatToggleButton}, ${SEL.chatCloseButton}`)) return;
        refreshPingArchive(room);
        updatePingArchiveControl(room);
        paint(room);
    });   // вкладка / «Чат» / × → пересчитать
    const list = box.querySelector(SEL.chatList);
    if (list && !list.dataset.t7BlacklistMenu) {
        list.dataset.t7BlacklistMenu = '1';
        list.addEventListener('contextmenu', (e) => {
            const nick = e.target.closest(SEL.nickButton);
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
    const roomState = rooms[room];
    if (list) chatScroller.register(list, room, true);
    if (list && roomState.filterList !== list) {
        if (roomState.filterObserver) roomState.filterObserver.disconnect();
        roomState.filterObserver = new MutationObserver(() => {
            chatScroller.keep(list, () => {
                markFilteredMessages(room);
                applyPingOnly(room);
            });
        });
        roomState.filterObserver.observe(list, { childList: true });
        roomState.filterList = list;
    }
    keepPingList(room, () => {
        markFilteredMessages(room);
        applyPingOnly(room);
    });
    updatePingArchiveControl(room);
}

export const isPingOnly = () => pingOnly;
