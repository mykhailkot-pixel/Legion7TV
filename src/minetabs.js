// Единые вкладки в чате города и шахты: Город · Личные · Достижения · Торговля · Шахта
import { pingSystem } from './pingSystem.js';
import { store } from './store.js';
import { SAY_RE, sendWithLinks } from './links.js';
import { getChatTabPrefs } from './chatTabPrefs.js';

const W = unsafeWindow;
const CITY = '/api/city/chat', MINE = '/api/mine/chat';
const MINE_ID = 'home'; 
const PING_ONLY_KEY = 't7PingOnly';
const PING_ARCHIVE_KEY = 't7PingArchive';
const PING_ARCHIVE_LIMIT = 500;
const PING_PAGE_SIZE = 50;
let pingOnly = store.get(PING_ONLY_KEY) === true;
const storedPingArchive = store.get(PING_ARCHIVE_KEY) || {};
const pingArchive = {
    city: Array.isArray(storedPingArchive.city) ? storedPingArchive.city.filter((m) => m && m.id != null) : [],
    mine: Array.isArray(storedPingArchive.mine) ? storedPingArchive.mine.filter((m) => m && m.id != null) : []
};
const pingArchiveIds = {
    city: new Set(pingArchive.city.map((m) => String(m.id))),
    mine: new Set(pingArchive.mine.map((m) => String(m.id)))
};
const injectedPingIds = { city: new Set(), mine: new Set() };
const pingArchivePage = { city: 0, mine: 0 };
let pingArchiveSaveTimer = 0;

const buf = { city: [], mine: [] };      // последние сообщения комнат (для истории при переходе)
const inst = { city: null, mine: null }; // { raw, K }
const filterObservers = { city: null, mine: null };
let lastRoom = '';

pingSystem.onChange = () => {
    for (const i of Object.values(inst)) if (i) i.raw.render();
};

const tagMn = (m) => (m && m.tb !== 'mn' ? { ...m, tb: 'mn' } : m);
const tagMsg = (r) => (r && r.msg ? { ...r, msg: tagMn(r.msg) } : r);
const byTime = (a, b) => (a.at || 0) - (b.at || 0);

function push(room, msgs) {
    const a = buf[room];
    for (const m of msgs || []) if (m && m.id && !a.some((x) => x.id === m.id)) a.push(m);
    a.sort(byTime);
    if (a.length > 300) a.splice(0, a.length - 300);
}
function schedulePingArchiveSave() {
    clearTimeout(pingArchiveSaveTimer);
    pingArchiveSaveTimer = setTimeout(() => {
        pingArchiveSaveTimer = 0;
        store.set(PING_ARCHIVE_KEY, pingArchive);
    }, 500);
}
function drop(ids) {
    for (const k of Object.keys(buf)) buf[k] = buf[k].filter((m) => !ids.includes(m.id));
}
function active(room) {
    const i = inst[room];
    const S = i && i.K.state();
    return !!(S && S.chat && S.chat.on);
}
function forward(room, d, sourceRoom) {
    if (!active(room)) return;
    const chat = chatOf(room);
    const forceUnread = !!(chat && sourceRoom && sourceRoom !== lastRoom);
    const wasOpen = forceUnread && chat.C.open;
    if (forceUnread) chat.C.open = false;
    let applied = false;
    try {
        inst[room].raw.apply(d);
        applied = true;
    } catch (e) { console.warn('[mine-tabs] forward', e); }
    finally {
        if (forceUnread) chat.C.open = wasOpen;
    }
    if (applied) {
        countPings(room, d && d.chat);
        if (pingOnly) refreshPingArchive(room);
    }
}

let mineHist = 0;   // история шахты за этот визит запрашивается один раз

async function loadMineHistory(K) {
    if (mineHist) return;
    mineHist = 1;
    try {
        const x = K.X();
        if (!x) { mineHist = 0; return; }
        const r = await x.api('/api/mine/state?c=' + MINE_ID + '&mc=0');
        const src = r && r.mchat && Array.isArray(r.mchat.chat) ? r.mchat.chat : null;
        if (!src) { console.log('[mine-tabs] история шахты: в ответе нет mchat', r); return; }

        const msgs = src.map(tagMn).filter((m) => m && m.id);
        push('mine', msgs);
        rememberPingMessages('mine', msgs);
        rememberPingMessages('city', msgs);

        const i = inst.city;
        const c = i && i.K.state() && i.K.state().chat;
        if (!c || !c.on) return;

        // кладём прямо в список чата: apply() дал бы облачка над героями и счётчики «новых»
        const have = new Set(c.list.map((m) => m.id));
        for (const m of msgs.slice(-80)) if (!have.has(m.id)) c.list.push(m);
        c.list.sort((a, b) => (a.at || 0) - (b.at || 0));
        i.raw.render();
        if (pingOnly) refreshPingArchive('city');
    } catch (e) {
        mineHist = 0;
        console.warn('[mine-tabs] история шахты', e);
    }
}

/* ---------- кнопка «Шахта», порядок и подписи ---------- */
function setupTabs(K) {
    const S = K.state();
    if (!S || !S.chat || !S.el) return;
    const C = S.chat;
    C.mn = true;
    C.un = C.un || {};
    if (C.un.mn == null) C.un.mn = 0;
    const tabs = S.el.querySelector('.cy-chat-tabs');
    if (!tabs) return;
    if (!tabs.querySelector('[data-tab="mn"]')) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', 'false');
        b.dataset.tab = 'mn';
        b.title = 'Сообщения из шахты';
        b.innerHTML = 'Шахта<b class="cy-chat-tn" hidden></b>';
        tabs.appendChild(b);
    }
    const prefs = getChatTabPrefs();
    for (const k of prefs.order) {
        const e = tabs.querySelector(`[data-tab="${k}"]`);
        if (!e) continue;
        // Принудительно скрываем, если вкладка вprefs.hidden ИЛИ заблокирована логикой чата
        const shouldBeHidden = prefs.hidden.has(k) || (k !== "g" && k !== "mn" && !C[k]);
        e.hidden = shouldBeHidden;
        tabs.appendChild(e);
    }
    tabs.querySelectorAll('[data-tab]').forEach((b) => {
    if (b._t7h) return;
        b._t7h = 1;
        // библиотека сбрасывает hidden на каждом рендере - возвращаем скрытие из настроек
        new MutationObserver(() => {
            if (!b.hidden && getChatTabPrefs().hidden.has(b.dataset.tab)) b.hidden = true;
        }).observe(b, { attributes: true, attributeFilter: ['hidden'] });
    });
    const cityTab = tabs.querySelector('[data-tab="g"]');
    if (cityTab && cityTab.firstChild && cityTab.firstChild.nodeType === 3) cityTab.firstChild.nodeValue = 'Город';
    if (prefs.hidden.has(C.tab)) {
        const fallback = prefs.order.find((id) => !prefs.hidden.has(id) && tabs.querySelector(`[data-tab="${id}"]`));
        if (fallback) selectTab(K, fallback);
    }
    if (!tabs._t7) {
        tabs._t7 = 1;
        // библиотека прячет ряд вкладок, если нет «Торговли» и «Личных» - у нас всегда есть «Шахта»
        new MutationObserver(() => {
            const c = K.state() && K.state().chat;
            if (tabs.hidden && c && !c.panel) tabs.hidden = false;
        }).observe(tabs, { attributes: true, attributeFilter: ['hidden'] });
    }
    if (!C.panel) tabs.hidden = false;
}

document.addEventListener('t7-chat-tabs-change', () => {
    for (const i of Object.values(inst)) if (i) setupTabs(i.K);
});

function selectTab(K, t) {
    const S = K.state();
    const b = S && S.el && S.el.querySelector(`.cy-chat-tabs [data-tab="${t}"]`);
    if (b) b.click();
}

// отправка в город из шахты: если сервер говорит «не в городе» - тихо входим, пишем, позже выходим
let cityIn = false, cityOutT = 0;
async function cityPost(api, b) {
    let r = await api('/api/city/say', b);
    if (r && r.ok === false && /не в городе/.test(r.error || '')) {
        const e = await api('/api/city/enter', { x: 1000, y: 1010, town: 'fair' });
        if (e && e.ok) {
            cityIn = true;
            r = await api('/api/city/say', b);
        }
    }
    if (cityIn) {
        clearTimeout(cityOutT);
        cityOutT = setTimeout(() => {
            cityIn = false;
            try { api('/api/city/leave', {}); } catch (e) {}
        }, 20000);
    }
    return r;
}

const CHAT_JS = '/lib/site-chat.js';   // адрес проверь, см. ниже
let chatLoad = null;
function loadChatLib() {
    if (W.LGChat) return Promise.resolve();
    if (!chatLoad) chatLoad = new Promise((ok) => {
        const sc = document.createElement('script');
        sc.src = CHAT_JS;
        sc.onload = sc.onerror = () => ok();
        document.head.appendChild(sc);
    });
    return chatLoad;
}

/* ---------- параметры чата: флаги и маршрут отправки ---------- */
function patchK(K, room) {
    const cache = new WeakMap();
    const route = (api, p, b) => {
        const C = (K.state() || {}).chat;
        const tab = C && C.tab;
        if (p === K.say) {
            if (room === 'mine') {
                if (tab === 'mn') return Promise.resolve(api(p, b)).then(tagMsg);
                return cityPost(api, b);      // город, торговля, личные - в городской чат
            }
            if (tab === 'mn') {
                // из города в шахту: тот же запрос, что делает сама шахта
                return Promise.resolve(api('/api/mine/chat/say?c=' + MINE_ID, { text: b.text }))
                    .then((r) => {
                        if (r && r.msg) push('mine', [tagMn(r.msg)]);
                        return tagMsg(r);
                    });
            }
        }
        return api(p, b);
    };
    return {
        ...K,
        flags: room === 'mine' ? () => {
            const x = K.X();
            const h = (x && x.hero && x.hero()) || {};
            return { on: K.flags(h).on, tr: !!h.ct, dm: !!h.cd };
        } : K.flags,
        X: () => {
            const x = K.X();
            if (!x) return x;
            let m = cache.get(x);
            if (!m) {
                const raw = (...a) => x.api(...a);
                const api = (p, b) => (SAY_RE.test(p) ? sendWithLinks(raw, p, b) : raw(p, b));
                m = new Proxy(x, {
                    get(t, k) {
                        if (k === 'api') return (p, b) => route(api, p, b);
                        const v = t[k];
                        return typeof v === 'function' ? v.bind(t) : v;
                    }
                });
                cache.set(x, m);
            }
            return m;
        }
    };
}

/* ---------- пинги (@ник): жёлтые кружки ---------- */
const pings = { city: {}, mine: {} };   // комната → { вкладка: сколько упоминаний }

function chatOf(room) {
    const i = inst[room];
    const S = i && i.K.state();
    return S && S.chat ? { S, C: S.chat } : null;
}
function tabOfMsg(C, m) {   // как tabOf в чате сайта
    return m.tb || (m.ev ? (C.tr ? 'ev' : 'g') : m.k === 'tr' ? 'tr' : m.k === 'dm' ? 'dm' : 'g');
}
function isPingMessage(room, m, me) {
    const o = chatOf(room);
    if (!m || m.id == null || String(m.l || '').toLowerCase() === me || m.ev || m.sys) return false;
    if (o && o.C.ign && o.C.ign.has(m.l)) return false;
    if (pingSystem.shouldIgnore(m.l, m.t)) return false;
    return pingSystem.isPinged(m.t, me ? [me] : []);
}
function rememberPingMessages(room, msgs) {
    const i = inst[room] || inst[room === 'mine' ? 'city' : 'mine'];
    const x = i && i.K.X();
    const me = String((x && x.login && x.login()) || '').toLowerCase();
    const items = pingArchive[room];
    const ids = pingArchiveIds[room];
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
function stripArchivedPings(room) {
    const o = chatOf(room);
    const injected = injectedPingIds[room];
    if (o && o.C.list && injected.size) {
        const list = o.C.list.filter((m) => !injected.has(String(m.id)));
        o.C.list.splice(0, o.C.list.length, ...list);
    }
    injected.clear();
}
function archivePage(room, C) {
    const messages = pingArchive[room].filter((m) => tabOfMsg(C, m) === C.tab);
    const pageCount = Math.max(1, Math.ceil(messages.length / PING_PAGE_SIZE));
    pingArchivePage[room] = Math.min(pingArchivePage[room], pageCount - 1);
    const end = messages.length - pingArchivePage[room] * PING_PAGE_SIZE;
    return messages.slice(Math.max(0, end - PING_PAGE_SIZE), end);
}
function syncPingArchive(room) {
    const o = chatOf(room);
    if (!o || !o.C.list) return false;
    const injected = injectedPingIds[room];
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
function refreshPingArchive(room) {
    const i = inst[room];
    if (!i) return;
    if (syncPingArchive(room)) i.raw.render();
    markFilteredMessages(room);
    applyPingOnly(room);
    updatePingArchiveControl(room);
}
function countPings(room, msgs) {
    const o = chatOf(room);
    if (!o) return;
    rememberPingMessages(room, msgs);
    const x = inst[room].K.X();
    const me = String((x && x.login && x.login()) || '').toLowerCase();
    const pg = pings[room];
    let hit = false;
    for (const m of msgs || []) {
        if (!m || String(m.l || '').toLowerCase() === me || m.ev || m.sys) continue;
        if (o.C.ign && o.C.ign.has(m.l)) continue;
        if (pingSystem.shouldIgnore(m.l, m.t)) continue;
        if (!pingSystem.isPinged(m.t, me ? [me] : [])) continue;
        const id = m.id == null ? '' : room + ':' + String(m.id);
        if (!id || !seenPings.has(id)) {
            pingSystem.play();
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
function markFilteredMessages(room) {
    const o = chatOf(room);
    const list = o && o.S.el && o.S.el.querySelector('.cy-chat-l');
    if (!list || !o.C) return;
    const visible = o.C.list.filter((m) => tabOfMsg(o.C, m) === o.C.tab && !(o.C.ign && o.C.ign.has(m.l)) && (o.C.tab !== 'dm' || !o.C.peer || m.sys || m.l === o.C.peer || m.to === o.C.peer));
    const rows = list.querySelectorAll(':scope > li:not(.cy-chat-0)');
    const x = inst[room].K.X();
    const me = String((x && x.login && x.login()) || '').toLowerCase();
    visible.forEach((m, index) => {
        const row = rows[index];
        if (!row) return;
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
        tag.textContent = label === 'В ЧС' ? `Пользователь ${m.n || m.l} в чёрном списке` : 'Сообщение скрыто фильтром';
        tag.title = label === 'В ЧС' ? 'Отправитель в вашем черном списке' : 'В сообщении найдено слово или фраза из фильтра';
    });
}

function applyPingOnly(room) {
    const o = chatOf(room);
    const list = o && o.S.el && o.S.el.querySelector('.cy-chat-l');
    if (!list) return;
    const visible = o.C.list.filter((m) => tabOfMsg(o.C, m) === o.C.tab && !(o.C.ign && o.C.ign.has(m.l)) && (o.C.tab !== 'dm' || !o.C.peer || m.sys || m.l === o.C.peer || m.to === o.C.peer));
    const pageIds = new Set(archivePage(room, o.C).map((m) => String(m.id)));
    let messageIndex = 0;
    let hasPing = false;
    list.querySelectorAll(':scope > li').forEach((row) => {
        if (row.classList.contains('cy-chat-0')) return;
        const message = visible[messageIndex++];
        const onPage = message && (message.id == null || pageIds.has(String(message.id)));
        const keep = !pingOnly || row.classList.contains('ping') && onPage;
        row.classList.toggle('t7-ping-hidden', !keep);
        if (pingOnly && keep) hasPing = true;
    });
    list.dataset.t7NoPings = String(pingOnly && !hasPing);
}

function syncPingOnlyControls() {
    for (const room of ['city', 'mine']) {
        const o = chatOf(room);
        const input = o && o.S.el && o.S.el.querySelector('.t7-chat-filter input');
        if (input) input.checked = pingOnly;
        refreshPingArchive(room);
        applyPingOnly(room);
        updatePingArchiveControl(room);
    }
}

function addPingOnlyControl(room, box) {
    const header = box.querySelector('.cy-chat-h');
    if (!header) return;
    let label = header.querySelector('.t7-chat-filter');
    if (!label) {
        label = document.createElement('label');
        label.className = 't7-chat-filter';
        label.title = 'Показывать только сообщения с упоминанием';
        label.innerHTML = '<input type="checkbox"><span>Только пинги</span>';
        label.addEventListener('click', (e) => e.stopPropagation());
        label.querySelector('input').addEventListener('change', (e) => {
            pingOnly = e.currentTarget.checked;
            store.set(PING_ONLY_KEY, pingOnly);
            syncPingOnlyControls();
        });
    }
    label.querySelector('input').checked = pingOnly;
    const close = header.querySelector('.cy-chat-x');
    if (!label.isConnected) header.insertBefore(label, close || null);

    let nav = header.querySelector('.t7-ping-nav');
    if (!nav) {
        nav = document.createElement('span');
        nav.className = 't7-ping-nav';
        nav.innerHTML = '<button type="button" data-direction="older" title="Показать более старые пинги" aria-label="Показать более старые пинги">‹</button><button type="button" data-direction="newer" title="Показать более новые пинги" aria-label="Показать более новые пинги">›</button>';
        nav.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-direction]');
            if (!button) return;
            e.stopPropagation();
            pingArchivePage[room] = Math.max(0, pingArchivePage[room] + (button.dataset.direction === 'older' ? 1 : -1));
            refreshPingArchive(room);
            updatePingArchiveControl(room);
        });
        header.insertBefore(nav, close || null);
    }
    updatePingArchiveControl(room);
    applyPingOnly(room);
}
function updatePingArchiveControl(room) {
    const o = chatOf(room);
    const header = o && o.S.el && o.S.el.querySelector('.cy-chat-h');
    const nav = header && header.querySelector('.t7-ping-nav');
    if (!nav || !o.C) return;
    const count = pingArchive[room].filter((m) => tabOfMsg(o.C, m) === o.C.tab).length;
    const pages = Math.ceil(count / PING_PAGE_SIZE);
    pingArchivePage[room] = Math.min(pingArchivePage[room], Math.max(0, pages - 1));
    nav.hidden = !pingOnly || pages < 2;
    const older = nav.querySelector('[data-direction="older"]');
    const newer = nav.querySelector('[data-direction="newer"]');
    if (older) older.disabled = pingArchivePage[room] >= pages - 1;
    if (newer) newer.disabled = pingArchivePage[room] === 0;
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
function paint(room) {
    const o = chatOf(room);
    const box = o && o.S.el && o.S.el.querySelector('.cy-chat');
    if (!box) return;
    const pg = pings[room];
    if (o.C.open) pg[o.C.tab] = 0;   // открытая вкладка прочитана
    let total = 0;
    box.querySelectorAll('.cy-chat-tabs [data-tab]').forEach((b) => {
        const n = pg[b.dataset.tab] || 0;
        total += n;
        badge(b, 'cy-chat-tp', n, 'Упоминаний');
    });
    const t = box.querySelector('.cy-chat-t');
    if (t) badge(t, 'cy-chat-pn', o.C.open ? 0 : total, 'Упоминаний');
}
function pingBind(room) {
    const o = chatOf(room);
    const box = o && o.S.el && o.S.el.querySelector('.cy-chat');
    if (!box || box.dataset.t7pg) return;
    box.dataset.t7pg = '1';
    addPingOnlyControl(room, box);
    box.addEventListener('click', () => {
        refreshPingArchive(room);
        updatePingArchiveControl(room);
        paint(room);
    });   // вкладка / «Чат» / × → пересчитать
    const list = box.querySelector('.cy-chat-l');
    if (list && !list.dataset.t7BlacklistMenu) {
        list.dataset.t7BlacklistMenu = '1';
        list.addEventListener('contextmenu', (e) => {
            const nick = e.target.closest('b[data-nick]');
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
    if (list && !filterObservers[room]) {
        filterObservers[room] = new MutationObserver(() => {
            markFilteredMessages(room);
            applyPingOnly(room);
        });
        filterObservers[room].observe(list, { childList: true });
    }
    markFilteredMessages(room);
    applyPingOnly(room);
    updatePingArchiveControl(room);
}

function wrapInst(raw, K, room) {
    const other = room === 'mine' ? 'city' : 'mine';
    const mine = room === 'mine';
    const byTime = (a, b) => (a.at || 0) - (b.at || 0);
    return {
        ...raw,
        init() { raw.init(); setupTabs(K); pingBind(room); },
        enter(r) {
            if (pingOnly) stripArchivedPings(room);
            let rr = r;
            if (r && Array.isArray(r.chat)) {
                const own = mine ? r.chat.map(tagMn) : r.chat;
                push(room, own);
                const extra = buf[other].filter((m) => !own.some((x) => x.id === m.id));
                rr = { ...r, chat: own.concat(extra).sort(byTime) };
            }
            raw.enter(rr);
            injectedPingIds[room].clear();
            if (rr && Array.isArray(rr.chat)) rememberPingMessages(room, rr.chat);
            setupTabs(K);
            pings[room] = {};
            pingBind(room);
            paint(room);
            if (lastRoom !== room) {
                lastRoom = room;
                selectTab(K, mine ? 'mn' : 'g');
            }
            if (!mine && typeof loadMineHistory === 'function') {
                try { loadMineHistory(K); } catch (e) { console.warn('[mine-tabs] история', e); }
            }
            if (pingOnly) refreshPingArchive(room);
        },
        apply(d) {
            let dd = d;
            if (d && Array.isArray(d.chat)) {
                const own = mine ? d.chat.map(tagMn) : d.chat;
                push(room, own);
                dd = { ...d, chat: own };
            }
            raw.apply(dd);
            if (dd && dd.chat) countPings(room, dd.chat);
            if (pingOnly) refreshPingArchive(room);
        }
    };
}

function wrapChat(v) {
    if (!v || v.__t7 || typeof v.make !== 'function') return v;
    const make = v.make;
    const w = {
        ...v,
        make(K) {
            const room = K && K.base === MINE ? 'mine' : K && K.base === CITY ? 'city' : null;
            if (!room) return make(K);
            const KK = patchK(K, room);
            const raw = make(KK);
            inst[room] = { raw, K: KK };
            return wrapInst(raw, KK, room);
        }
    };
    w.__t7 = 1;
    return w;
}

/* ---------- события: город и шахта доставляют их только «своей» комнате ---------- */
function wrapCity(v) {
    if (!v || v.__t7 || typeof v.onEvent !== 'function') return v;
    const o = v.onEvent;
    v.onEvent = function (d) {
        try {
            if (d) {
                if (Array.isArray(d.chat) && d.chat.length) push('city', d.chat);
                if (Array.isArray(d.chatDel) && d.chatDel.length) {
                    drop(d.chatDel);
                    const deleted = new Set(d.chatDel.map(String));
                    let changed = false;
                    for (const room of ['city', 'mine']) {
                        const kept = pingArchive[room].filter((m) => !deleted.has(String(m.id)));
                        if (kept.length !== pingArchive[room].length) {
                            pingArchive[room] = kept;
                            pingArchiveIds[room] = new Set(kept.map((m) => String(m.id)));
                            changed = true;
                        }
                    }
                    if (changed) schedulePingArchiveSave();
                }
                if (d.chat || d.chatDel) forward('mine', { chat: d.chat, chatDel: d.chatDel }, 'city');
            }
        } catch (e) { console.warn('[mine-tabs] city', e); }
        return o.apply(this, arguments);
    };
    v.__t7 = 1;
    return v;
}

function wrapMine(v) {
    if (!v || v.__t7 || typeof v.onEvent !== 'function') return v;
    const o = v.onEvent;
    v.onEvent = function (d) {
        try {
            if (d && d.chatRoom === 'mine' && Array.isArray(d.chat) && !v.on) {
                const t = d.chat.map(tagMn);
                push('mine', t);
                forward('city', { chat: t }, 'mine');
            }
        } catch (e) { console.warn('[mine-tabs] mine', e); }
        return o.apply(this, arguments);
    };
    const op = v.open;
    if (typeof op === 'function') {
        v.open = function () {
            if (W.LGChat) return op.apply(this, arguments);
            const args = arguments, self = this;
            loadChatLib().then(() => op.apply(self, args));   // шахта открывается, когда библиотека чата уже есть
        };
    }
    v.__t7 = 1;
    return v;
}

function hook(name, fn) {
    let val = W[name];
    if (val) val = fn(val);
    try {
        Object.defineProperty(W, name, {
            configurable: true, enumerable: true,
            get: () => val,
            set: (v) => { val = fn(v); }
        });
    } catch (e) { console.warn('[mine-tabs] hook', name, e); }
}

hook('LGChat', wrapChat);
hook('LGCity', wrapCity);
hook('LGMine', wrapMine);