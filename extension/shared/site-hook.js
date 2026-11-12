(function () {
    var real;
    var uid = 0;
    var wrappedLibraries = [];
    var bridgeReady = false;
    var pendingMessages = [];

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
                                if (nextChat.ign && nextChat.ign.has(message.l)) continue;
                                if (String(message.l || '').toLowerCase() === me) continue;

                                var room = message.rm === 'mine' || rm === 'mine' ? 'mine'
                                    : message.rm === 'city' || rm === 'city' ? 'city' : '';
                                var tab = message.tb || (room === 'mine' ? 'mn'
                                    : message.k === 'tr' ? 'tr' : 'g');
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
