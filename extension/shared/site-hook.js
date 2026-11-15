(function () {
    var real;
    var uid = 0;
    var wrappedLibraries = [];
    var bridgeReady = false;
    var pendingMessages = [];
    var activeContext = null;
    var activeApi = null;
    var guildSeenIds = new Set();
    var guildScopes = new WeakMap();
    var guildMonitor = 0;
    var retentionChannel = location.pathname.replace(/\/+$/, '').toLowerCase() || '/';
    var retentionLimit = 150;
    var retainedTabs = Object.create(null);
    var retentionTabs = ['g', 'tr', 'mn', 'gl', 'dm'];

    function emitMessage(payload) {
        if (!bridgeReady) {
            pendingMessages.push(payload);
            if (pendingMessages.length > 300) pendingMessages.shift();
            return;
        }
        window.postMessage(payload, location.origin);
    }

    function tabOf(message, room) {
        var tab = message && (message.tb || message.tab);
        if (retentionTabs.indexOf(tab) !== -1) return tab;
        if ((message && message.rm === 'mine') || room === 'mine') return 'mn';
        if (message && message.k === 'tr') return 'tr';
        if (message && message.k === 'dm') return 'dm';
        return 'g';
    }

    function retentionKey(tab, id) {
        var value = String(id);
        if (tab === 'gl' && /^g\d+$/.test(value)) value = value.slice(1);
        return tab + '\u0000' + value;
    }

    function isConfirmedGuildId(id) {
        var value = String(id);
        if (value.charAt(0) === 'g') value = value.slice(1);
        return /^\d+$/.test(value);
    }

    function removeOwnGuildEchoes(messages, context) {
        var login;
        try {
            login = String(context.X().login() || '').toLowerCase();
        } catch (error) {
            console.warn('[t7 hook] не удалось определить отправителя гильдейских сообщений', error);
            return messages;
        }
        if (!login) return messages;

        var confirmed = messages.filter(function (message) {
            return tabOf(message) === 'gl'
                && String(message.l || '').toLowerCase() === login
                && isConfirmedGuildId(message.id);
        });
        if (!confirmed.length) return messages;

        return messages.filter(function (message) {
            if (tabOf(message) !== 'gl'
                || String(message.l || '').toLowerCase() !== login
                || isConfirmedGuildId(message.id)) return true;
            var at = Number(message.at) || 0;
            return !confirmed.some(function (candidate) {
                var candidateAt = Number(candidate.at) || 0;
                return message.t === candidate.t && at && candidateAt
                    && Math.abs(at - candidateAt) <= 10000;
            });
        });
    }

    function validRetentionMessage(message) {
        return message && typeof message === 'object' && message.id != null
            && String(message.id).length <= 200
            && typeof message.l === 'string' && message.l.length > 0 && message.l.length <= 64
            && typeof message.t === 'string' && message.t.length <= 2000
            && !message.sys && !message.ev && message.k !== 'sys';
    }

    function trimRetained(tab) {
        var current = Array.isArray(retainedTabs[tab]) ? retainedTabs[tab] : [];
        retainedTabs[tab] = current.slice(-retentionLimit);
    }

    function mergeRetained(tab, messages) {
        if (retentionTabs.indexOf(tab) === -1) return [];
        var current = Array.isArray(retainedTabs[tab]) ? retainedTabs[tab] : [];
        var byId = new Map(current.map(function (message) {
            return [String(message.id), message];
        }));
        var added = [];
        for (var i = 0; i < messages.length; i++) {
            var message = messages[i];
            if (!validRetentionMessage(message)) continue;
            var normalized = Object.assign({}, message, {
                id: String(message.id),
                tb: tab,
                at: Number(message.at) || Date.now()
            });
            if (byId.has(normalized.id)) continue;
            byId.set(normalized.id, normalized);
            added.push(normalized);
        }
        retainedTabs[tab] = Array.from(byId.values());
        trimRetained(tab);
        return added;
    }

    function saveRetained(tab, messages) {
        if (!messages.length) return;
        emitMessage({
            source: 't7-chat-retention-save',
            channel: retentionChannel,
            tab: tab,
            messages: messages
        });
    }

    function currentTab(context) {
        try {
            var state = context && typeof context.state === 'function' && context.state();
            var tab = state && state.chat && state.chat.tab;
            return retentionTabs.indexOf(tab) !== -1 ? tab : 'g';
        } catch (error) {
            console.warn('[t7 hook] не удалось определить вкладку чата', error);
            return 'g';
        }
    }

    function requestRetained(tab) {
        if (retentionTabs.indexOf(tab) === -1) return;
        window.postMessage({
            source: 't7-chat-retention-load',
            channel: retentionChannel,
            tab: tab
        }, location.origin);
    }

    function recordRetained(messages, room) {
        var grouped = Object.create(null);
        for (var i = 0; i < messages.length; i++) {
            var message = messages[i];
            if (!validRetentionMessage(message)) continue;
            var tab = tabOf(message, room);
            if (!grouped[tab]) grouped[tab] = [];
            grouped[tab].push(message);
        }
        for (var tab in grouped) saveRetained(tab, mergeRetained(tab, grouped[tab]));
    }

    function removeRetained(ids) {
        if (!Array.isArray(ids) || !ids.length) return;
        var deleted = new Set(ids.map(String));
        for (var i = 0; i < retentionTabs.length; i++) {
            var tab = retentionTabs[i];
            var messages = retainedTabs[tab];
            if (!Array.isArray(messages)) continue;
            var next = messages.filter(function (message) {
                return !deleted.has(String(message.id));
            });
            if (next.length !== messages.length) retainedTabs[tab] = next;
        }
        emitMessage({
            source: 't7-chat-retention-delete',
            channel: retentionChannel,
            ids: Array.from(deleted).slice(0, 1000)
        });
    }

    function restoreChatHistory(api, context) {
        if (!api || typeof api.render !== 'function' || !context || typeof context.state !== 'function') return;
        try {
            var state = context.state();
            var chat = state && state.chat;
            if (!chat || !Array.isArray(chat.list)) return;

            var byId = new Map();
            var other = [];
            for (var i = 0; i < chat.list.length; i++) {
                var message = chat.list[i];
                if (!validRetentionMessage(message)) {
                    other.push(message);
                    continue;
                }
                var tab = tabOf(message);
                byId.set(retentionKey(tab, message.id), message);
            }
            for (var t = 0; t < retentionTabs.length; t++) {
                var tabId = retentionTabs[t];
                var saved = retainedTabs[tabId];
                if (!Array.isArray(saved)) continue;
                for (var j = 0; j < saved.length; j++) {
                    var item = saved[j];
                    var key = retentionKey(tabId, item.id);
                    if (validRetentionMessage(item) && !byId.has(key)) byId.set(key, item);
                }
            }

            var counts = Object.create(null);
            var messages = Array.from(byId.values())
                .sort(function (a, b) { return (Number(a.at) || 0) - (Number(b.at) || 0); });
            messages = removeOwnGuildEchoes(messages, context);
            messages = messages.filter(function (message) {
                var tab = tabOf(message);
                counts[tab] = (counts[tab] || 0) + 1;
                return counts[tab] <= retentionLimit;
            });
            var next = other.concat(messages);
            for (var k = 0; k < next.length; k++) {
                var existing = next[k];
                if (existing && tabOf(existing) === 'gl' && existing.id != null)
                    rememberGuildId(guildMessageId(existing.id));
            }
            if (next.length === chat.list.length
                && next.every(function (message, index) { return message === chat.list[index]; })) return;
            chat.list = next;
            api.render();
        } catch (error) {
            console.warn('[t7 hook] не удалось восстановить историю чата', error);
        }
    }

    function loadRetained(data) {
        if (!data || data.channel !== retentionChannel
            || retentionTabs.indexOf(data.tab) === -1
            || !Array.isArray(data.messages) || data.messages.length > 5000) return;
        var limit = Number(data.limit);
        if (Number.isInteger(limit)) retentionLimit = Math.max(1, Math.min(5000, limit));
        for (var i = 0; i < retentionTabs.length; i++) trimRetained(retentionTabs[i]);
        mergeRetained(data.tab, data.messages.filter(validRetentionMessage).map(function (message) {
            if (data.tab === 'gl' && /^g\d+$/.test(String(message.id)))
                return Object.assign({}, message, { id: String(message.id).slice(1), tb: 'gl' });
            return message;
        }));
        restoreChatHistory(activeApi, activeContext);
    }

    window.addEventListener('message', function (event) {
        if (event.source !== window || event.origin !== location.origin || !event.data) return;
        if (event.data.source === 't7-chat-ready') {
            bridgeReady = true;
            while (pendingMessages.length) window.postMessage(pendingMessages.shift(), location.origin);
            requestRetained(currentTab(activeContext));
            return;
        }
        if (event.data.source === 't7-chat-retention-data') loadRetained(event.data);
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
        recordRetained([Object.assign({}, message, payload, {
            id: String(message.id),
            tb: 'gl'
        })]);
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
                activeApi = api;

                var origEnter = api.enter;
                if (typeof origEnter === 'function') {
                    try {
                        api.enter = function (data, room) {
                            if (data && Array.isArray(data.chat)) recordRetained(data.chat, room);
                            var result;
                            try {
                                result = origEnter.apply(this, arguments);
                            } finally {
                                restoreChatHistory(api, args[0]);
                            }
                            return result;
                        };
                    } catch (error) {
                        console.warn('[t7 hook] не удалось обернуть загрузку чата', error);
                    }
                }

                var origTab = api.tab;
                if (typeof origTab === 'function') {
                    try {
                        api.tab = function (tab) {
                            var result = origTab.apply(this, arguments);
                            requestRetained(tab);
                            return result;
                        };
                    } catch (error) {
                        console.warn('[t7 hook] не удалось обернуть переключение вкладок', error);
                    }
                }

                var origApply = api.apply;
                try {
                    api.apply = function (d, rm) {
                        if (d && Array.isArray(d.chat)) recordRetained(d.chat, rm);
                        if (d && Array.isArray(d.chatDel)) removeRetained(d.chatDel);
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
                            if (nextChat && nextChat.on) restoreChatHistory(api, context);
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
