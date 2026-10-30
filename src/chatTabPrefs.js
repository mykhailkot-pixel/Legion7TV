import { store } from './store.js';

const KEY = 't7ChatTabPrefs';
const DEFAULT_ORDER = ['lg', 'g', 'mn', 'dm', 'tr', 'ev'];
const TAB_IDS = new Set(DEFAULT_ORDER);

export const CHAT_TABS = [
    { id: 'lg', label: 'Журнал' },
    { id: 'g', label: 'Город' },
    { id: 'mn', label: 'Шахта' },
    { id: 'dm', label: 'Личные' },
    { id: 'tr', label: 'Торговля' },
    { id: 'ev', label: 'Достижения' }
];

export function getChatTabPrefs() {
    const saved = store.get(KEY) || {};
    const savedOrder = Array.isArray(saved.order) ? saved.order.filter((id) => TAB_IDS.has(id)) : [];
    const order = [...new Set([...savedOrder, ...DEFAULT_ORDER])];
    const hidden = new Set(Array.isArray(saved.hidden) ? saved.hidden.filter((id) => TAB_IDS.has(id)) : []);
    if (hidden.size === order.length) hidden.delete(order[0]);
    return { order, hidden };
}

export function setChatTabPrefs(prefs) {
    const order = [...new Set([...(prefs.order || []).filter((id) => TAB_IDS.has(id)), ...DEFAULT_ORDER])];
    const hiddenValues = prefs.hidden instanceof Set ? [...prefs.hidden] : Array.isArray(prefs.hidden) ? prefs.hidden : [];
    const hidden = new Set(hiddenValues.filter((id) => TAB_IDS.has(id)));
    if (hidden.size === order.length) hidden.delete(order[0]);
    store.set(KEY, { order, hidden: [...hidden] });
    document.dispatchEvent(new Event('t7-chat-tabs-change'));
}