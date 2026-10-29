import { store } from './store.js';

const RECENT_KEY = 't7recent';
const LIMIT_KEY = 't7recentLimit';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function getRecentLimit() {
    const value = Number(store.get(LIMIT_KEY));
    return Number.isInteger(value) ? Math.max(1, Math.min(MAX_LIMIT, value)) : DEFAULT_LIMIT;
}

export function setRecentLimit(value) {
    const parsed = Number(value);
    const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(MAX_LIMIT, Math.round(parsed))) : DEFAULT_LIMIT;
    store.set(LIMIT_KEY, limit);
    const recent = store.get(RECENT_KEY);
    if (Array.isArray(recent)) store.set(RECENT_KEY, recent.slice(-limit));
    document.dispatchEvent(new Event('t7-recent-limit-change'));
    return limit;
}