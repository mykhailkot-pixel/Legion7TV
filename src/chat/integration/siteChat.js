import { setupTabs } from './chatTabs.js';
import { startChatPingIntegration } from './chatPings.js';
import { startDirectMessageObserver } from './directMessages.js';
import { startChatHistoryRetention } from './chatHistory.js';

let started = false;

export function startSiteChatIntegration() {
    if (started) return;
    started = true;
    setupTabs();
    startChatHistoryRetention();
    startChatPingIntegration();
    startDirectMessageObserver();
}
