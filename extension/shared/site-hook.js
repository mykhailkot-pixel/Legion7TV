(function () {
    if (new URL(location.href).searchParams.get('l7tv_chat_window') === '1') {
        var storageGetItem = Storage.prototype.getItem;
        var storageSetItem = Storage.prototype.setItem;
        Storage.prototype.getItem = function (key) {
            if (this === window.localStorage && key === 'lgTab') return 'news';
            return storageGetItem.call(this, key);
        };
        Storage.prototype.setItem = function (key, value) {
            if (this === window.localStorage && key === 'lgTab') return;
            return storageSetItem.call(this, key, value);
        };
    }

    var real;
    var uid = 0;
    var wrappedLibraries = [];
    var wrappedEmoteApis = new WeakMap();
    var observedEmoteContexts = new WeakSet();
    var emoteChannelStates = Object.create(null);
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
        if (event.source !== window || event.origin !== location.origin || !event.data
            || event.data.source !== 't7-chat-ready') return;
        bridgeReady = true;
        while (pendingMessages.length) window.postMessage(pendingMessages.shift(), location.origin);
    });

    function rememberGuildId(id) {
        guildSeenIds.add(id);
        if (guildSeenIds.size > 1000)
            guildSeenIds.delete(guildSeenIds.values().next().value);
    }

    function guildMessageId(id) {
        var value = String(id);
        return value.charAt(0) === 'g' ? value : 'g' + value;
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
                guildId: String(chat.glG || ''),
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
                        rememberGuildId(guildMessageId(existing.id));
                }
                return;
            }
            for (var j = 0; j < chat.list.length; j++) {
                var message = chat.list[j];
                if (!message || message.tb !== 'gl' || message.sys || message.ev || message.id == null) continue;
                emitGuildMessage(context, chat, box, message, guildMessageId(message.id));
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

            var me = String(context.X().login() || '').toLowerCase();
            for (var i = 0; i < detail.msgs.length; i++) {
                var message = detail.msgs[i];
                if (!message || message.id == null || String(message.tid) === '0'
                    || !message.l || String(message.id).length > 199
                    || (chat.glLast && !(+message.id > +chat.glLast))) continue;
                // The chat model scan sees the confirmed ID for our optimistic messages.
                if (String(message.l).toLowerCase() === me) continue;
                emitGuildMessage(context, chat, box, message, guildMessageId(message.id));
            }
        } catch (error) {
            console.warn('[t7 hook] не удалось обработать сообщения гильдии', error);
        }
    }, true);

    function isWrapped(lib) {
        return wrappedLibraries.indexOf(lib) !== -1;
    }

    function emoteEntries(response) {
        if (!response || typeof response !== 'object' || response.ok === false) return null;
        var source = response.emotes || response.e
            || (response.data && (response.data.emotes || response.data.e || response.data));
        if (!source && !Object.prototype.hasOwnProperty.call(response, 'ok')) source = response;
        if (!source || typeof source !== 'object') return null;
        var entries = [];
        var sourceKeys = Array.isArray(source) ? null : Object.keys(source);
        var count = Array.isArray(source) ? source.length : sourceKeys.length;
        for (var i = 0; i < Math.min(count, 5000); i++) {
            var name, value;
            if (Array.isArray(source)) {
                var item = source[i];
                name = item && item.name;
                value = item;
            } else {
                name = sourceKeys[i];
                value = source[name];
            }
            var id = typeof value === 'string' ? value : value && (value.id || value.emoteId);
            if (typeof name !== 'string' || !name || name.length > 64 || /\s/.test(name)
                || name === '__proto__' || name === 'constructor'
                || !/^[0-9A-Za-z]{20,32}$/.test(String(id || ''))) continue;
            entries.push([name, String(id)]);
        }
        return entries;
    }

    function wrapEmoteApi(api) {
        if (wrappedEmoteApis.has(api)) return wrappedEmoteApis.get(api);
        var wrapped = function (path) {
            var result = api.apply(this, arguments);
            if (String(path).split('?')[0] !== '/api/emotes') return result;
            return Promise.resolve(result).then(function (response) {
                try {
                    var entries = emoteEntries(response);
                    if (entries) publishEmoteCatalog(location.pathname, entries);
                } catch (error) {
                    console.warn('[t7 hook] не удалось передать каталог смайлов сайта', error);
                }
                return response;
            });
        };
        wrappedEmoteApis.set(api, wrapped);
        return wrapped;
    }

    function publishEmoteCatalog(channel, entries) {
        emoteChannelStates[channel] = true;
        emitMessage({
            source: 't7-site-emotes',
            channel: channel,
            base: typeof window.LG_BASE === 'string' ? window.LG_BASE : '',
            entries: entries
        });
    }

    function observeEmoteState(x) {
        if (!x || typeof x.hero !== 'function') return;
        var channel = location.pathname;
        if (Object.prototype.hasOwnProperty.call(emoteChannelStates, channel)) return;
        try {
            var hero = x.hero();
            if (hero && typeof hero === 'object') {
                if (hero.e7 === false) {
                    emoteChannelStates[channel] = false;
                    emitMessage({
                        source: 't7-site-emotes',
                        channel: channel,
                        entries: []
                    });
                } else if (hero.e7) {
                    emoteChannelStates[channel] = true;
                }
            }
        } catch (error) {
            console.warn('[t7 hook] не удалось проверить каталог смайлов канала', error);
        }
    }

    function observeEmoteContext(context) {
        if (!context || typeof context.X !== 'function' || observedEmoteContexts.has(context)) return;
        var originalX = context.X;
        var wrappedX = function () {
            var x = originalX.apply(this, arguments);
            try {
                if (x && typeof x.api === 'function') {
                    var wrappedApi = wrapEmoteApi(x.api);
                    if (wrappedApi !== x.api) {
                        x.api = wrappedApi;
                        if (x.api !== wrappedApi)
                            console.warn('[t7 hook] сайт не разрешил наблюдать каталог смайлов');
                    }
                }
                observeEmoteState(x);
            } catch (error) {
                console.warn('[t7 hook] не удалось наблюдать каталог смайлов сайта', error);
            }
            return x;
        };
        try {
            context.X = wrappedX;
            if (context.X === wrappedX) observedEmoteContexts.add(context);
        } catch (error) {
            console.warn('[t7 hook] не удалось установить наблюдатель каталога смайлов', error);
        }
    }

    function wrap(lib) {
        if (!lib || typeof lib.make !== 'function' || isWrapped(lib)) return lib;
        wrappedLibraries.push(lib);
        var make = lib.make;
        var wrapped = Object.assign({}, lib, {
            make: function () {
                var args = arguments;
                activeContext = args[0] || activeContext;
                observeEmoteContext(activeContext);
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
