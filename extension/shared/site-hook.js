(function () {
    var real;
    var uid = 0;
    var wrappedLibraries = [];
    var bridgeReady = false;
    var pendingMessages = [];
    var activeContext = null;
    var guildSeenIds = new Set();
    var guildScopes = new WeakMap();
    var guildMonitor = 0;

    function emitMessage(payload) {
        if (!bridgeReady) {
            pendingMessages.push(payload);
            if (pendingMessages.length > 300) pendingMessages.shift();
            return;
        }
        window.postMessage(payload, location.origin);
    }

    window.addEventListener('message', function (event) {
        if (event.source !== window || event.origin !== location.origin
            || !event.data || event.data.source !== 't7-chat-ready') return;
        bridgeReady = true;
        while (pendingMessages.length) window.postMessage(pendingMessages.shift(), location.origin);
    });

    function rememberGuildId(id) {
        guildSeenIds.add(id);
        if (guildSeenIds.size > 1000)
            guildSeenIds.delete(guildSeenIds.values().next().value);
    }

    function emitGuildMessage(context, chat, box, message, id) {
        if (guildSeenIds.has(id)) return;
        rememberGuildId(id);
        var login = String(message.l || '').toLowerCase().slice(0, 64);
        if (!login) return;
        var me = String(context.X().login() || '').toLowerCase();

        var text = String(message.t || '').slice(0, 2000);
        var payload = {
            id: id,
            l: login,
            n: String(message.n || message.l).slice(0, 128),
            t: text,
            at: Number(message.at) || Date.now()
        };
        emitMessage({
            source: 't7-chat-history-msg',
            boxId: box.dataset.t7Box,
            msg: Object.assign({}, payload, {
                tb: 'gl',
                cn: String(message.cn || message.c || '').slice(0, 64),
                gt: String(message.gt || '').slice(0, 64)
            })
        });
        if ((chat.ign && chat.ign.has(login)) || login === me) return;
        var escapedMe = me.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var nativePingMatcher = me
            ? new RegExp('(^|\\s)@' + escapedMe + '(\\b|$)', 'i')
            : null;
        emitMessage({
            source: 't7-chat-msg',
            boxId: box.dataset.t7Box,
            msg: Object.assign({}, payload, {
                tab: 'gl',
                rm: '',
                nativePing: !!(nativePingMatcher && nativePingMatcher.test(text))
            }),
            open: !!chat.open,
            activeTab: String(chat.tab || ''),
            observedAt: Date.now()
        });
    }

    function scanGuildMessages() {
        var context = activeContext;
        if (!context || typeof context.state !== 'function') return;
        try {
            var state = context.state();
            var chat = state && state.chat;
            if (!chat || !chat.on || !chat.gl || !chat.glInit || !Array.isArray(chat.list)) return;
            var box = state.el && state.el.querySelector('.cy-chat');
            if (!box) return;
            if (!box.dataset.t7Box) box.dataset.t7Box = 't7b' + (++uid);

            var scope = String(chat.glG || '');
            if (guildScopes.get(chat) !== scope) {
                guildScopes.set(chat, scope);
                for (var i = 0; i < chat.list.length; i++) {
                    var existing = chat.list[i];
                    if (existing && existing.tb === 'gl' && existing.id != null)
                        rememberGuildId(String(existing.id));
                }
                return;
            }
            for (var j = 0; j < chat.list.length; j++) {
                var message = chat.list[j];
                if (!message || message.tb !== 'gl' || message.sys || message.ev || message.id == null) continue;
                emitGuildMessage(context, chat, box, message, String(message.id));
            }
        } catch (error) {
            console.warn('[t7 hook] не удалось проверить сообщения гильдии', error);
        }
    }

    window.addEventListener('lg-gchat', function (event) {
        var detail = event.detail;
        var context = activeContext;
        if (!detail || detail.k !== 'msgs' || !Array.isArray(detail.msgs)
            || !context || typeof context.state !== 'function') return;

        try {
            var state = context.state();
            var chat = state && state.chat;
            if (!chat || !chat.on || !chat.gl || !chat.glInit
                || (chat.glG && String(detail.g) !== String(chat.glG))) return;
            var box = state.el && state.el.querySelector('.cy-chat');
            if (!box) return;
            if (!box.dataset.t7Box) box.dataset.t7Box = 't7b' + (++uid);

            for (var i = 0; i < detail.msgs.length; i++) {
                var message = detail.msgs[i];
                if (!message || message.id == null || String(message.tid) === '0'
                    || !message.l || String(message.id).length > 199
                    || (chat.glLast && !(+message.id > +chat.glLast))) continue;
                emitGuildMessage(context, chat, box, message, 'g' + String(message.id));
            }
        } catch (error) {
            console.warn('[t7 hook] не удалось обработать сообщения гильдии', error);
        }
    }, true);

    function isWrapped(lib) {
        return wrappedLibraries.indexOf(lib) !== -1;
    }

    function wrap(lib) {
        if (!lib || typeof lib.make !== 'function' || isWrapped(lib)) return lib;
        wrappedLibraries.push(lib);
        var make = lib.make;
        var wrapped = Object.assign({}, lib, {
            make: function () {
                var args = arguments;
                activeContext = args[0] || activeContext;
                if (!guildMonitor) guildMonitor = window.setInterval(scanGuildMessages, 500);
                var api = make.apply(this, args);
                if (!api || typeof api.apply !== 'function') return api;

                var origApply = api.apply;
                try {
                    api.apply = function (d, rm) {
                        var before = null;
                        try {
                            var state = args[0].state();
                            var chat = state && state.chat;
                            if (d && Array.isArray(d.chatDel) && d.chatDel.length) {
                                var box = state && state.el && state.el.querySelector('.cy-chat');
                                if (box) {
                                    if (!box.dataset.t7Box) box.dataset.t7Box = 't7b' + (++uid);
                                    var deletedIds = d.chatDel.slice(0, 100).map(function (id) {
                                        return String(id);
                                    });
                                    var deletedSet = new Set(deletedIds);
                                    var deletedMessages = [];
                                    if (chat && Array.isArray(chat.list)) {
                                        for (var j = 0; j < chat.list.length; j++) {
                                            var deletedMessage = chat.list[j];
                                            if (!deletedMessage || !deletedSet.has(String(deletedMessage.id))) continue;
                                            var room = deletedMessage.rm === 'mine' || rm === 'mine' ? 'mine'
                                                : deletedMessage.rm === 'city' || rm === 'city' ? 'city' : '';
                                            deletedMessages.push({
                                                id: String(deletedMessage.id),
                                                l: String(deletedMessage.l || ''),
                                                n: String(deletedMessage.n || deletedMessage.l || ''),
                                                t: String(deletedMessage.t || ''),
                                                tab: deletedMessage.tb || (room === 'mine' ? 'mn'
                                                    : deletedMessage.k === 'tr' ? 'tr' : 'g')
                                            });
                                        }
                                    }
                                    emitMessage({
                                        source: 't7-chat-del',
                                        boxId: box.dataset.t7Box,
                                        ids: deletedIds,
                                        messages: deletedMessages
                                    });
                                }
                            }
                            if (chat && Array.isArray(chat.list)) {
                                before = new Set(chat.list.map(function (message) {
                                    return String(message.id);
                                }));
                            }
                        } catch (error) {
                            console.warn('[t7 hook] не удалось прочитать состояние чата', error);
                        }

                        var result = origApply.apply(this, arguments);
                        try {
                            var context = args[0];
                            var nextState = context.state();
                            var nextChat = nextState && nextState.chat;
                            if (!nextChat || !nextChat.on || !before) return result;
                            var box = nextState.el && nextState.el.querySelector('.cy-chat');
                            if (!box) return result;
                            if (!box.dataset.t7Box) box.dataset.t7Box = 't7b' + (++uid);

                            var me = String(context.X().login() || '').toLowerCase();
                            var escapedMe = me.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            var nativePingMatcher = me
                                ? new RegExp('(^|\\s)@' + escapedMe + '(\\b|$)', 'i')
                                : null;
                            var messages = d && d.chat || [];
                            for (var i = 0; i < messages.length; i++) {
                                var message = messages[i];
                                if (!message || message.id == null || before.has(String(message.id))
                                    || message.ev || message.sys || message.k === 'dm') continue;

                                var room = message.rm === 'mine' || rm === 'mine' ? 'mine'
                                    : message.rm === 'city' || rm === 'city' ? 'city' : '';
                                var tab = message.tb || (room === 'mine' ? 'mn'
                                    : message.k === 'tr' ? 'tr' : 'g');
                                emitMessage({
                                    source: 't7-chat-history-msg',
                                    boxId: box.dataset.t7Box,
                                    msg: {
                                        id: String(message.id),
                                        l: String(message.l || ''),
                                        n: String(message.n || message.l || ''),
                                        t: String(message.t || ''),
                                        at: Number(message.at) || Date.now(),
                                        tb: tab,
                                        cn: String(message.cn || message.c || ''),
                                        gt: String(message.gt || '')
                                    }
                                });
                                if (nextChat.ign && nextChat.ign.has(message.l)) continue;
                                if (String(message.l || '').toLowerCase() === me) continue;
                                emitMessage({
                                    source: 't7-chat-msg',
                                    boxId: box.dataset.t7Box,
                                    msg: {
                                        id: String(message.id),
                                        l: String(message.l || ''),
                                        n: String(message.n || message.l || ''),
                                        t: String(message.t || ''),
                                        at: Number(message.at) || Date.now(),
                                        tab: tab,
                                        rm: room,
                                        nativePing: !!(nativePingMatcher && nativePingMatcher.test(String(message.t || '')))
                                    },
                                    open: !!nextChat.open,
                                    activeTab: String(nextChat.tab || ''),
                                    observedAt: Date.now()
                                });
                            }
                        } catch (error) {
                            console.warn('[t7 hook]', error);
                        }
                        return result;
                    };
                } catch (error) {
                    console.warn('[t7 hook] не удалось обернуть чат', error);
                }
                wrappedLibraries.push(wrapped);
                return api;
            }
        });
        wrappedLibraries.push(wrapped);
        return wrapped;
    }

    try {
        var descriptor = Object.getOwnPropertyDescriptor(window, 'LGChat');
        if (descriptor && !descriptor.configurable) return;
        real = wrap(window.LGChat);
        Object.defineProperty(window, 'LGChat', {
            configurable: true,
            enumerable: descriptor ? descriptor.enumerable : true,
            get: function () {
                return real;
            },
            set: function (value) {
                try {
                    real = wrap(value);
                } catch (error) {
                    console.warn('[t7 hook] не удалось обернуть библиотеку чата', error);
                    real = value;
                }
            }
        });
    } catch (error) {
        console.warn('[t7 hook] не удалось установить перехват сообщений', error);
    }
})();
