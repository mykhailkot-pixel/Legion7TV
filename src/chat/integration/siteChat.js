import { setupTabs } from './chatTabs.js';
import { startChatPingIntegration } from './chatPings.js';
import { startDirectMessageObserver } from './directMessages.js';
import { store } from '../../core/store.js';

const OBSOLETE_HISTORY_KEYS = [
    't7ChatHistory',
    't7ChatHistoryLimit',
    't7DeletedMessagesEnabled',
    't7DeletedMessagesLimit',
    't7PlayerHistoryButton'
];

let started = false;

export function startSiteChatIntegration() {
    if (started) return;
    started = true;
    for (const key of OBSOLETE_HISTORY_KEYS) {
        const value = store.get(key);
        if (value !== undefined && value !== null) store.set(key, null);
    }
    setupTabs();
    startChatPingIntegration();
    startDirectMessageObserver();
}
