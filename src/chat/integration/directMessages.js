import { pingSystem } from '../pingSystem.js';
import { chatScroller } from '../messages/scrollState.js';
import { SAY_RE, sendWithLinks } from '../messages/links.js';

export function wrapDm(v) {
    if (!v || v.__t7 || typeof v.init !== 'function') return v;
    const init = v.init;
    let lastContext = '';
    const dmSoundSeen = new Set();
    let lastSig = '';
    let lastParent = null;
    const wrapped = {
        ...v,
        place() {
            try {
                const list = document.querySelector('.dm-l');
                const dm = list && list.closest('.dm');
                if (dm && dm.isConnected && dm.getClientRects().length) {
                    const active = v.active();
                    const conv = v.conv(active) || [];
                    const last = conv[conv.length - 1];
                    const sig = [
                        active,
                        v.tabs().join(','),
                        v.unread(),
                        conv.length,
                        last && last.id
                    ].join('|');
                    if (sig === lastSig && dm.parentNode === lastParent) return;
                    lastSig = sig;
                    lastParent = dm.parentNode;
                }
            } catch (e) {
                return v.place.apply(this, arguments);
            }
            return v.place.apply(this, arguments);
        },
        onEvent(d) {
            try {
                const message = d && d.m;
                if (message && message.id != null) {
                    const id = String(message.id);
                    if (!dmSoundSeen.has(id)) {
                        dmSoundSeen.add(id);
                        if (dmSoundSeen.size > 500) {
                            dmSoundSeen.delete(dmSoundSeen.values().next().value);
                        }
                        const fresh = !Number.isFinite(message.at)
                            || Date.now() - message.at < 5 * 60 * 1000;
                        if (fresh && pingSystem.shouldNotifyDm(message.fl)) {
                            pingSystem.playDm().catch((error) =>
                                console.warn('[7TV] не удалось воспроизвести звук ЛС', error));
                        }
                    }
                }
            } catch (error) {
                console.warn('[7TV] не удалось воспроизвести звук ЛС', error);
            }
            if (typeof v.onEvent === 'function') return v.onEvent.apply(this, arguments);
        },
        init(ctx) {
            let context = '';
            try {
                const user = String(ctx && ctx.me && ctx.me() || '').toLowerCase();
                context = `${user}|${String(ctx && ctx.ch || '').toLowerCase()}`;
                pingSystem.setDmUser(user);
            } catch (e) {}
            const list = context && context === lastContext ? document.querySelector('.dm-l') : null;
            let dmContext = ctx;
            if (ctx && typeof ctx.api === 'function') {
                const api = ctx.api.bind(ctx);
                dmContext = new Proxy(ctx, {
                    get(target, key) {
                        if (key === 'api') {
                            return (path, body) => SAY_RE.test(path)
                                ? sendWithLinks(api, path, body)
                                : api(path, body);
                        }
                        const value = Reflect.get(target, key, target);
                        return typeof value === 'function' ? value.bind(target) : value;
                    }
                });
            }
            const args = [...arguments];
            args[0] = dmContext;
            let result;
            if (list && list.isConnected) {
                result = chatScroller.reinitialize(list, () => init.apply(this, args));
            } else {
                result = init.apply(this, args);
            }
            lastContext = context;
            return result;
        },
        open(login, options) {
            return v.open.apply(this, arguments);
        },
        setActive(login) {
            return v.setActive.apply(this, arguments);
        }
    };
    wrapped.__t7 = 1;
    return wrapped;
}
