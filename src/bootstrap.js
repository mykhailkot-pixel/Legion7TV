import css from './styles.css';
import { SIZES } from './core/config.js';
import { STORE } from './core/consts.js';
import { S, st } from './core/state.js';
import { store } from './core/store.js';
import { reload } from './emotes/emotes.js';
import { scan, refreshEmotes, applySize } from './chat/messages/chat.js';
import { renderGrid, place } from './emotes/popup.js';
import { updateSetStatus } from './settings/settings.js';
import { ensureButtons } from './chat/ui/chatInput.js';
import { startChatObservers } from './chat/ui/chatObservers.js';
import { applyChatFont } from './chat/ui/chatFonts.js';
import { initializeChatCustomCss } from './chat/ui/chatCustomCss.js';
import { pingSystem } from './chat/pingSystem.js';
import { initEmoteTooltip } from './emotes/tooltip.js';
import { startSiteChatIntegration } from './chat/integration/siteChat.js';
import { startChatWindowIntegration } from './chat/ui/chatWindow.js';
import { initializeUiIdentity, installUiStyles } from './core/ui.js';

let started = false;

function initialize() {
    initializeUiIdentity();
    installUiStyles(css);
    initializeChatCustomCss();

    const size = store.get(STORE.emoteSize);
    if (SIZES[size]) S.size = size;
    const position = store.get(STORE.popupPosition);
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) st.pos = position;
    const windowSize = store.get(STORE.popupSize);
    if (windowSize && Number.isFinite(windowSize.w) && Number.isFinite(windowSize.h)) st.win = windowSize;
    if (store.get(STORE.emotesEnabled) === false) S.on = false;

    applySize();
    st.hooks.status = updateSetStatus;
    st.hooks.place = place;
    st.hooks.emotes = () => { refreshEmotes(); renderGrid(); };
    pingSystem.applyPingColor();
    applyChatFont();
    initEmoteTooltip();

    startChatObservers();
    startSiteChatIntegration();
    startChatWindowIntegration();
    ensureButtons();
    scan();
    reload(false);
}

export function startApp() {
    if (started) return;
    started = true;
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else
        initialize();
}
