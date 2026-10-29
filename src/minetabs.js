// Единые вкладки в чате города и шахты: Город · Личные · Достижения · Торговля · Шахта
const W = unsafeWindow;
const CITY = '/api/city/chat', MINE = '/api/mine/chat';
const ORDER = ['g', 'dm', 'ev', 'tr', 'mn'];
const MINE_ID = 'home'; 

const buf = { city: [], mine: [] };      // последние сообщения комнат (для истории при переходе)
const inst = { city: null, mine: null }; // { raw, K }
let lastRoom = '';

const tagMn = (m) => (m && m.tb !== 'mn' ? { ...m, tb: 'mn' } : m);
const tagMsg = (r) => (r && r.msg ? { ...r, msg: tagMn(r.msg) } : r);
const byTime = (a, b) => (a.at || 0) - (b.at || 0);

function push(room, msgs) {
    const a = buf[room];
    for (const m of msgs || []) if (m && m.id && !a.some((x) => x.id === m.id)) a.push(m);
    a.sort(byTime);
    if (a.length > 300) a.splice(0, a.length - 300);
}
function drop(ids) {
    for (const k of Object.keys(buf)) buf[k] = buf[k].filter((m) => !ids.includes(m.id));
}
function active(room) {
    const i = inst[room];
    const S = i && i.K.state();
    return !!(S && S.chat && S.chat.on);
}
function forward(room, d) {
    if (!active(room)) return;
    try { inst[room].raw.apply(d); } catch (e) { console.warn('[mine-tabs] forward', e); }
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

        const i = inst.city;
        const c = i && i.K.state() && i.K.state().chat;
        if (!c || !c.on) return;

        // кладём прямо в список чата: apply() дал бы облачка над героями и счётчики «новых»
        const have = new Set(c.list.map((m) => m.id));
        for (const m of msgs.slice(-80)) if (!have.has(m.id)) c.list.push(m);
        c.list.sort((a, b) => (a.at || 0) - (b.at || 0));
        i.raw.render();
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
    const g = tabs.querySelector('[data-tab="g"]');
    if (g && g.firstChild && g.firstChild.nodeType === 3) g.firstChild.nodeValue = 'Город';
    for (const k of ORDER) {
        const e = tabs.querySelector(`[data-tab="${k}"]`);
        if (e) tabs.appendChild(e);
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
                const api = (...a) => x.api(...a);
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

function wrapInst(raw, K, room) {
    const other = room === 'mine' ? 'city' : 'mine';
    const mine = room === 'mine';
    const byTime = (a, b) => (a.at || 0) - (b.at || 0);
    return {
        ...raw,
        init() { raw.init(); setupTabs(K); },
        enter(r) {
            let rr = r;
            if (r && Array.isArray(r.chat)) {
                const own = mine ? r.chat.map(tagMn) : r.chat;
                push(room, own);
                const extra = buf[other].filter((m) => !own.some((x) => x.id === m.id));
                rr = { ...r, chat: own.concat(extra).sort(byTime) };
            }
            raw.enter(rr);
            setupTabs(K);
            if (lastRoom !== room) {     // зашли в другое место - выбрать «его» вкладку
                lastRoom = room;
                selectTab(K, mine ? 'mn' : 'g');
            }
            if (!mine && typeof loadMineHistory === 'function') {
                try { loadMineHistory(K); } catch (e) { console.warn('[mine-tabs] история', e); }
            }
        },
        apply(d) {
            let dd = d;
            if (d && Array.isArray(d.chat)) {
                const own = mine ? d.chat.map(tagMn) : d.chat;
                push(room, own);
                dd = { ...d, chat: own };
            }
            raw.apply(dd);
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
                if (Array.isArray(d.chatDel) && d.chatDel.length) drop(d.chatDel);
                if (d.chat || d.chatDel) forward('mine', { chat: d.chat, chatDel: d.chatDel });  // без d.c: счётчик у комнат свой
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
            if (d && d.chatRoom === 'mine' && Array.isArray(d.chat) && !v.on) {   // шахта закрыта, мы в городе
                const t = d.chat.map(tagMn);
                push('mine', t);
                forward('city', { chat: t });
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