import { CACHE_TTL } from './config.js';
import { S, EM, st } from './state.js';
import { store } from './store.js';
import { getJson } from './net.js';

function addSet(map, set, isGlobal) {
    for (const e of (set && set.emotes) || []) {
        const host = e.data && e.data.host;
        if (!host || !host.url || e.name === '__proto__') continue;
        const files = (host.files || []).filter((f) => f.format === 'WEBP').map((f) => f.name);
        map[e.name] = {
            base: 'https:' + host.url,
            f: files.length ? files : ['1x.webp', '2x.webp'],
            zw: !!(e.data.flags & 256),   // zero-width эмоут
            g: isGlobal
        };
    }
}

// адрес файла нужного разрешения (n = 1..4)
export function urlFor(em, n) {
    let best = null;
    for (const f of em.f) {
        const l = parseInt(f, 10);
        if (l <= n && (best === null || l > parseInt(best, 10))) best = f;
    }
    return em.base + '/' + (best || em.f[0]);
}

async function loadEmotes(nick, force) {
    const key = 't7c2:' + nick;
    if (!force) {
        const c = store.get(key);
        if (c) return { map: c.map, msg: c.msg, stale: Date.now() - c.at >= CACHE_TTL };
    }
    const map = {};
    let err = '';
    try { addSet(map, await getJson('https://7tv.io/v3/emote-sets/global'), true); }
    catch (e) { err = 'глобальные не загрузились'; console.warn('[7TV]', e); }

    let chanMsg = '';
    if (!nick) {
        chanMsg = 'укажи ник стримера';
    } else {
        try {
            const u = await getJson('https://api.ivr.fi/v2/twitch/user?login=' + encodeURIComponent(nick));
            const id = u && u[0] && u[0].id;
            if (!id) chanMsg = 'Twitch-канал «' + nick + '» не найден';
            else {
                const user = await getJson('https://7tv.io/v3/users/twitch/' + id);
                const set = user && user.emote_set;
                if (set && set.emotes && set.emotes.length) addSet(map, set, false);
                else chanMsg = 'у канала нет эмоутов 7TV';
            }
        } catch (e) {
            chanMsg = 'эмоуты канала не загрузились (нет аккаунта 7TV или сервис недоступен)';
            console.warn('[7TV]', e);
        }
    }

    const names = Object.keys(map);
    const nc = names.filter((n) => !map[n].g).length;
    let msg = `Канал: ${nc} · глобальные: ${names.length - nc}`;
    if (chanMsg) msg += ' · ' + chanMsg;
    if (err) msg += ' · ' + err;
    if (names.length && !chanMsg && !err) store.set(key, { at: Date.now(), map, msg });
    return { map, msg, stale: false };
}

export function setStatus(t) {
    st.status = t;
    st.hooks.status(t);
}

export async function reload(force) {
    const my = ++st.loadToken;
    if (force) setStatus('Загрузка…');
    const { map, msg, stale } = await loadEmotes(S.nick, force);
    if (my !== st.loadToken) return;
    for (const k of Object.keys(EM)) delete EM[k];
    Object.assign(EM, map);
    setStatus(msg);
    st.hooks.emotes();            // перерисовать чат и список
    if (stale) reload(true);      // старый список уже показан, свежий подтянется фоном
}