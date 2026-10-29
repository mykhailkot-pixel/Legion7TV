import css from './styles.css';
import { SIZES, pageChan } from './config.js';
import { S, st } from './state.js';
import { store } from './store.js';
import { reload } from './emotes.js';
import { scan, rescanAll, applySize } from './chat.js';
import { renderGrid, place } from './popup.js';
import { updateSetStatus } from './settings.js';
import { ensureButtons } from './buttons.js';
import './minetabs.js';


function init() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    // Защита скролла личных сообщений от скачков на 1 сообщение назад
    document.addEventListener("DOMContentLoaded", () => {
        const dmx = document.querySelector(".cy-chat-dmx");
        if (!dmx) return;

        let lastScrollTop = dmx.scrollTop;

        dmx.addEventListener("scroll", () => {
            lastScrollTop = dmx.scrollTop;
        }, { passive: true });

        // Перехватываем попытки LGDm сместить скролл вверх без воли пользователя
        const observer = new MutationObserver(() => {
            // Если пользователь находился не в самом низу и произошло изменение, 
            // а скролл резко уменьшился (тот самый прыжок на 1 сообщение назад)
            if (dmx.scrollTop < lastScrollTop - 2 && dmx.scrollTop > 10) {
            // Возвращаем скролл на место, блокируя паразитный скачок
            dmx.scrollTop = lastScrollTop;
            }
        });

        observer.observe(dmx, { childList: true, subtree: true });
    });

    // сохранённые настройки
    const sz = store.get('t7size');
    if (SIZES[sz]) S.size = sz;
    S.nick = store.get('t7nick:' + pageChan) || pageChan;
    const p = store.get('t7pos');
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) st.pos = p;
    const w = store.get('t7win');
    if (w && Number.isFinite(w.w) && Number.isFinite(w.h)) st.win = w;
    applySize();
    if (store.get('t7on') === false) S.on = false;
    st.hooks.status = updateSetStatus;
    st.hooks.place = place;
    st.hooks.emotes = () => { rescanAll(); renderGrid(); };

    // связи между модулями
    st.hooks.emotes = () => { rescanAll(); renderGrid(); };

    // чат дорисовывается через innerHTML / insertAdjacentHTML, поэтому следим за страницей
    let queued = false;
    let needsButtons = false;
    let needsScan = false;
    const contains = (node, selector) => node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector));
    const schedule = (records) => {
        for (const record of records) {
            if (record.type !== "childList") continue;
                const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
                const form = target && target.closest("form.cy-chat-f");
            if (form && form.querySelector("input[type=text]") && !form.dataset.t7RecentBound) needsButtons = true;
            
            // Добавляем флаг необходимости сканирования при любых изменениях в .cy-chat (включая .cy-chat-dmx)
            if (target && target.closest(".cy-chat")) {
                needsScan = true;
            }

            for (const node of record.addedNodes) {
                if (contains(node, "form.cy-chat-f")) needsButtons = true;
                if (contains(node, ".cy-chat-l li") || contains(node, ".cy-chat-dmx")) needsScan = true;
            }
        }
        
        if (!needsButtons && !needsScan || queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            const addButtons = needsButtons;
            const scanMessages = needsScan;
            needsButtons = false;
            needsScan = false;
            if (addButtons) ensureButtons();
            if (scanMessages) scan();
        });
    };

    // Наблюдаем не только за body, но и за всем контейнером чата точечно или оставляем subtree на body
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    ensureButtons();
    scan();

    reload(false);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();