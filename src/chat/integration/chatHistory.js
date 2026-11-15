import { store } from '../../core/store.js';
import { emit, EV, STORE } from '../../core/consts.js';

const HISTORY_KEY = STORE.chatHistory;
const LIMIT_KEY = STORE.chatHistoryLimit;
const DEFAULT_LIMIT = 150;
const MAX_LIMIT = 5000;
const TABS = new Set(['g', 'tr', 'mn', 'gl', 'dm']);
const MESSAGE_FIELDS = ['id', 'l', 'n', 't', 'at', 'tb', 'rm', 'k', 'r', 'c', 'cn', 'gt', 'aw', 'to'];

function normalizeLimit(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
        ? Math.max(1, Math.min(MAX_LIMIT, Math.round(parsed)))
        : DEFAULT_LIMIT;
}

function normalizeMessage(value, tab) {
    if (!value || typeof value !== 'object' || value.id == null
        || String(value.id).length > 200
        || typeof value.l !== 'string' || !value.l || value.l.length > 64
        || typeof value.t !== 'string' || value.t.length > 2000
        || value.sys || value.ev || value.k === 'sys') return null;
    const result = {};
    for (const field of MESSAGE_FIELDS) {
        const entry = value[field];
        if (typeof entry === 'string') result[field] = entry.slice(0, field === 't' ? 2000 : 200);
        else if (typeof entry === 'number' && Number.isFinite(entry)) result[field] = entry;
        else if (field === 'aw' && Array.isArray(entry)) {
            result.aw = entry.slice(0, 8).map((badge) => ({
                id: String(badge && badge.id || '').slice(0, 128),
                n: String(badge && badge.n || '').slice(0, 128),
                d: String(badge && badge.d || '').slice(0, 500),
                i: String(badge && badge.i || '').slice(0, 16),
                t: String(badge && badge.t || '').slice(0, 64)
            }));
        }
    }
    result.id = String(value.id).slice(0, 200);
    result.n = String(value.n || value.l).slice(0, 128);
    result.at = Number(value.at) || Date.now();
    result.tb = tab;
    return result;
}

function readHistory() {
    const saved = store.get(HISTORY_KEY);
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
}

function currentChannel() {
    return location.pathname.replace(/\/+$/, '').toLowerCase() || '/';
}

function currentLimit() {
    const savedLimit = store.get(LIMIT_KEY);
    return normalizeLimit(savedLimit === undefined
        ? store.get(STORE.deletedMessagesLimit)
        : savedLimit);
}

let histories = readHistory();

function historyFor(channel) {
    const value = histories[channel];
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function trimAllHistories(limit) {
    for (const [channel, tabs] of Object.entries(histories)) {
        if (!tabs || typeof tabs !== 'object' || Array.isArray(tabs)) {
            delete histories[channel];
            continue;
        }
        for (const [tab, messages] of Object.entries(tabs)) {
            if (!Array.isArray(messages)) {
                delete tabs[tab];
                continue;
            }
            tabs[tab] = messages.slice(-limit);
        }
        if (!Object.keys(tabs).length) delete histories[channel];
    }
}

function postHistory(channel, tab) {
    if (!TABS.has(tab)) return;
    window.postMessage({
        source: 't7-chat-retention-data',
        channel,
        limit: currentLimit(),
        tab,
        messages: historyFor(channel)[tab] || []
    }, location.origin);
}

function onHistoryMessage(event) {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.source === 't7-chat-retention-load') {
        if (data.channel === currentChannel() && TABS.has(data.tab))
            postHistory(data.channel, data.tab);
        return;
    }
    if (data.source === 't7-chat-retention-delete') {
        if (data.channel !== currentChannel() || !Array.isArray(data.ids)
            || data.ids.length > 1000
            || data.ids.some((id) => typeof id !== 'string' || !id || id.length > 200)) return;
        const deleted = new Set(data.ids);
        const tabs = { ...historyFor(data.channel) };
        let changed = false;
        for (const [tab, messages] of Object.entries(tabs)) {
            if (!Array.isArray(messages)) continue;
            const next = messages.filter((message) => !deleted.has(String(message.id)));
            if (next.length !== messages.length) {
                tabs[tab] = next;
                changed = true;
            }
        }
        if (changed) {
            histories = { ...histories, [data.channel]: tabs };
            store.set(HISTORY_KEY, histories);
        }
        return;
    }
    if (data.source !== 't7-chat-retention-save'
        || data.channel !== currentChannel()
        || typeof data.tab !== 'string' || !TABS.has(data.tab)
        || !Array.isArray(data.messages) || data.messages.length > MAX_LIMIT) return;

    const channel = data.channel;
    const tabs = { ...historyFor(channel) };
    const messages = Array.isArray(tabs[data.tab]) ? tabs[data.tab] : [];
    const byId = new Map(messages.map((message) => [String(message.id), message]));
    for (const value of data.messages) {
        const message = normalizeMessage(value, data.tab);
        if (message) byId.set(message.id, message);
    }
    tabs[data.tab] = [...byId.values()]
        .sort((a, b) => a.at - b.at)
        .slice(-currentLimit());
    histories = { ...histories, [channel]: tabs };
    store.set(HISTORY_KEY, histories);
}

function requestTabHistory(event) {
    const button = event.target instanceof Element
        ? event.target.closest('.cy-chat-tabs [data-tab]')
        : null;
    const tab = button && button.dataset.tab;
    if (!TABS.has(tab)) return;
    window.postMessage({
        source: 't7-chat-retention-load',
        channel: currentChannel(),
        tab
    }, location.origin);
}

export function getChatHistoryLimit() {
    return currentLimit();
}

export function setChatHistoryLimit(value) {
    const limit = normalizeLimit(value);
    store.set(LIMIT_KEY, limit);
    trimAllHistories(limit);
    store.set(HISTORY_KEY, histories);
    const selectedTab = document.querySelector('.cy-chat-tabs [data-tab][aria-selected="true"]')?.dataset.tab;
    const activeTab = TABS.has(selectedTab) ? selectedTab : 'g';
    postHistory(currentChannel(), activeTab);
    emit(EV.chatHistoryLimitChange, limit);
    return limit;
}

export function startChatHistoryRetention() {
    window.addEventListener('message', onHistoryMessage);
    document.addEventListener('click', requestTabHistory, true);
}
