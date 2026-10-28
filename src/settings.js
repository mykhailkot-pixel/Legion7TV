import { SIZES, pageChan } from './config.js';
import { S, st } from './state.js';
import { store } from './store.js';
import { parseNick } from './util.js';
import { reload, setStatus } from './emotes.js';
import { rescanAll, applySize } from './chat.js';
import { clearImgs } from './imgcache.js';

export function updateSetStatus(t) {
    const e = st.set && st.set.querySelector('.t7-sst');
    if (e) e.textContent = t;
}

function onKey(e) {
    if (e.key === 'Escape' && st.set) {
        e.stopPropagation();
        closeSettings();
    }
}

export function closeSettings() {
    if (!st.set) return;
    st.set.remove();
    st.set = null;
    document.removeEventListener('keydown', onKey, true);
}

export function openSettings() {
    if (st.set) return;
    const el = document.createElement('div');
    st.set = el;
    el.className = 't7-set';
    el.innerHTML = `
        <div class="t7-sw" role="dialog" aria-modal="true" aria-label="Настройки 7TV">
            <div class="t7-sth"><b>Настройки 7TV</b><button type="button" class="t7-x" aria-label="Закрыть">×</button></div>

            <div class="t7-sec">
                <h4>Эмоуты</h4>
                <label class="t7-chk"><input type="checkbox" class="t7-on"> Показывать эмоуты 7TV в чате</label>
            </div>

            <div class="t7-sec">
                <h4>Канал</h4>
                <form class="t7-row">
                    <label class="t7-fl">Ник стримера на Twitch<input type="text" class="t7-nick" maxlength="80" autocomplete="off" spellcheck="false"></label>
                    <button type="submit" class="t7-b p">Загрузить</button>
                </form>
                <div class="t7-sst" role="status"></div>
            </div>

            <div class="t7-sec">
                <h4>Размер эмоутов в чате</h4>
                <div class="t7-szb">${Object.keys(SIZES).map((k) => `<button type="button" data-sz="${k}" aria-pressed="false">${SIZES[k].label}</button>`).join('')}</div>
            </div>

            <div class="t7-sec">
                <h4>Данные</h4>
                <div class="t7-row t7-wrap">
                    <button type="button" class="t7-b" data-act="refresh">Обновить список</button>
                    <button type="button" class="t7-b" data-act="cache">Очистить кеш картинок</button>
                    <button type="button" class="t7-b" data-act="pos">Сбросить положение окошка</button>
                </div>
            </div>
        </div>`;
    // игра не должна ловить клавиши, пока печатаем в настройках
    ['keydown', 'keyup', 'keypress'].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation()));
    el.addEventListener('pointerdown', (e) => { if (e.target === el) closeSettings(); });

    el.querySelector('.t7-x').onclick = closeSettings;

    const on = el.querySelector('.t7-on');
    on.checked = S.on;
    on.addEventListener('change', () => {
        S.on = on.checked;
        store.set('t7on', S.on);
        rescanAll();
    });

    const nickInp = el.querySelector('.t7-nick');
    nickInp.value = S.nick;
    nickInp.placeholder = pageChan || 'например, zakvielchannel';
    el.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = nickInp.value.trim();
        const n = raw ? parseNick(raw) : pageChan;
        if (raw && !n) { setStatus('Неверный ник: нужны латинские буквы, цифры и _'); return; }
        S.nick = n;
        nickInp.value = n;
        store.set('t7nick:' + pageChan, n);
        reload(true);
    });

    const mark = () => el.querySelectorAll('[data-sz]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sz === S.size)));
    mark();
    el.querySelector('.t7-szb').addEventListener('click', (e) => {
        const b = e.target.closest('[data-sz]');
        if (!b || b.dataset.sz === S.size) return;
        S.size = b.dataset.sz;
        store.set('t7size', S.size);
        applySize();
        mark();
        rescanAll();
    });

    el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'refresh') reload(true);
        else if (b.dataset.act === 'cache') {
            await clearImgs();
            setStatus('Кеш картинок очищен');
            st.hooks.emotes();   // перерисовать чат и список (картинки скачаются заново)
        } else if (b.dataset.act === 'pos') {
            st.pos = null;
            st.win = null;
            store.set('t7pos', null);
            store.set('t7win', null);
            st.hooks.place();
            setStatus('Положение окошка сброшено');
        }
    });

    document.body.appendChild(el);
    updateSetStatus(st.status);
    document.addEventListener('keydown', onKey, true);
}