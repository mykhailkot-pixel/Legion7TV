import css from './styles.css';
import { SIZES, pageChan } from './config.js';
import { S, st } from './state.js';
import { store } from './store.js';
import { reload } from './emotes.js';
import { scan, rescanAll, applySize } from './chat.js';
import { updateStatus, renderGrid } from './popup.js';
import { ensureButtons } from './buttons.js';

function init() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // сохранённые настройки
    const sz = store.get('t7size');
    if (SIZES[sz]) S.size = sz;
    S.nick = store.get('t7nick:' + pageChan) || pageChan;
    const p = store.get('t7pos');
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) st.pos = p;
    const w = store.get('t7win');
    if (w && Number.isFinite(w.w) && Number.isFinite(w.h)) st.win = w;
    applySize();

    // связи между модулями
    st.hooks.status = updateStatus;
    st.hooks.emotes = () => { rescanAll(); renderGrid(); };

    // чат дорисовывается через innerHTML / insertAdjacentHTML, поэтому следим за страницей
    let queued = false;
    const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; ensureButtons(); scan(); });
    };
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    ensureButtons();

    reload(false);
}

init();