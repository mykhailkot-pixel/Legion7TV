// Integrates the site's chat instances with extension features.
import { chatScroller } from '../messages/scrollState.js';
import { SAY_RE, sendWithLinks } from '../messages/links.js';
import { setupTabs } from './chatTabs.js';
import { wrapDm } from './directMessages.js';
import {
    chatOf,
    clearInjectedPings,
    countPings,
    hasUnifiedChat,
    isPingOnly,
    paint,
    pingBind,
    refreshPingArchive,
    rememberPingMessages,
    removePingArchiveMessages,
    resetPingCounts,
    setChatInstance,
    stripArchivedPings
} from './chatPings.js';
import { SEL } from '../../core/consts.js';

const W = globalThis.__L7TV_EXTENSION_PAGE__
    ? window
    : typeof unsafeWindow !== 'undefined' ? unsafeWindow : null;
const CITY = '/api/city/chat', MINE = '/api/mine/chat';
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
        const result = api(p, b);
        if (room !== 'mine' || p !== K.say) return result;
        const o = chatOf(room);
        const list = o && o.S.el && o.S.el.querySelector(SEL.chatList);
        const endIntent = list && chatScroller.captureEndIntent(list);
        return Promise.resolve(result).then((response) => {
            if (response && response.ok && list && endIntent) chatScroller.settleAtEnd(list, endIntent);
            return response;
        });
    };
    return {
        ...K,
        flags: room === 'mine' && !K.one ? () => {
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

/* ---------- chat instance lifecycle ---------- */
function wrapInst(raw, K, room) {
    const unified = !!K.one;
    return {
        ...raw,
        init() { raw.init(); setupTabs(K); pingBind(room); },
        enter(r, rm) {
            if (unified) {
                const enter = () => {
                    raw.enter(r, rm);
                    if (r && Array.isArray(r.chat)) rememberPingMessages(room, r.chat);
                    resetPingCounts(room);
                    setupTabs(K);
                    pingBind(room);
                    paint(room);
                    if (isPingOnly()) refreshPingArchive(room);
                };
                enter();
                return;
            }
            const enter = () => {
                if (isPingOnly()) stripArchivedPings(room);
                raw.enter(r);
                clearInjectedPings(room);
                if (r && Array.isArray(r.chat)) rememberPingMessages(room, r.chat);
                setupTabs(K);
                resetPingCounts(room);
                pingBind(room);
                paint(room);
                if (isPingOnly()) refreshPingArchive(room);
            };
            enter();
        },
        apply(d, rm) {
            if (unified) {
                raw.apply(d, rm);
                if (d && Array.isArray(d.chat)) countPings(room, d.chat);
                if (d && Array.isArray(d.chatDel)) {
                    removePingArchiveMessages(room, d.chatDel.map(String));
                }
                if (isPingOnly()) refreshPingArchive(room);
                return;
            }
            raw.apply(d);
            if (d && d.chat) countPings(room, d.chat);
            if (isPingOnly()) refreshPingArchive(room);
        }
    };
}

function wrapChat(v) {
    if (!v || v.__t7 || typeof v.make !== 'function') return v;
    const make = v.make;
    const w = {
        ...v,
        make(K) {
            const room = K && K.one ? 'one' : K && K.base === MINE ? 'mine' : K && K.base === CITY ? 'city' : null;
            if (!room) return make(K);
            const KK = patchK(K, room);
            const raw = make(KK);
            setChatInstance(room, { raw, K: KK });
            return wrapInst(raw, KK, room);
        }
    };
    w.__t7 = 1;
    return w;
}

/* ---------- обработка событий и удалений в пределах своей ленты ---------- */
function wrapCity(v) {
    if (!v || v.__t7 || typeof v.onEvent !== 'function') return v;
    const o = v.onEvent;
    v.onEvent = function (d) {
        try {
            if (d) {
                if (Array.isArray(d.chatDel) && d.chatDel.length) {
                    const archiveRoom = hasUnifiedChat() ? 'one' : 'city';
                    removePingArchiveMessages(archiveRoom, d.chatDel.map(String));
                }
            }
        } catch (e) { console.warn('[7TV] city chat event', e); }
        return o.apply(this, arguments);
    };
    v.__t7 = 1;
    return v;
}

function wrapMine(v) {
    if (!v || v.__t7) return v;
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
    } catch (e) { console.warn('[7TV] chat hook', name, e); }
}

if (W) {
    hook('LGChat', wrapChat);
    hook('LGCity', wrapCity);
    hook('LGMine', wrapMine);
    hook('LGDm', wrapDm);
}