import { SIZES, pageChan } from './config.js';
import { S, st } from './state.js';
import { store } from './store.js';
import { parseNick } from './util.js';
import { reload, setStatus } from './emotes.js';
import { rescanAll, applySize } from './chat.js';
import { clearImgs } from './imgcache.js';
import { clamp } from './util.js';
import { pingSystem } from './pingSystem.js';

// смещение окна настроек от центра экрана
let SOFF = (() => {
    const p = store.get('t7spos');
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : { x: 0, y: 0 };
})();

function setupDrag(el) {
    const win = el.querySelector('.t7-sw');
    const hd = el.querySelector('.t7-sth');
    const put = () => { win.style.transform = (SOFF.x || SOFF.y) ? `translate(${SOFF.x}px, ${SOFF.y}px)` : ''; };

    // если экран стал меньше, чем при прошлом открытии, возвращаем окно в видимую область
    put();
    const r0 = win.getBoundingClientRect();
    let fx = 0, fy = 0;
    if (r0.left < 8) fx = 8 - r0.left; else if (r0.right > innerWidth - 8) fx = innerWidth - 8 - r0.right;
    if (r0.top < 8) fy = 8 - r0.top; else if (r0.bottom > innerHeight - 8) fy = innerHeight - 8 - r0.bottom;
    if (fx || fy) { SOFF = { x: SOFF.x + fx, y: SOFF.y + fy }; put(); }

    hd.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || e.button > 0) return;   // кнопка × остаётся кнопкой
        const r = win.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, pid = e.pointerId, ox = SOFF.x, oy = SOFF.y;
        let started = false, nx = ox, ny = oy, raf = 0;
        const apply = () => { raf = 0; SOFF = { x: nx, y: ny }; put(); };
        const move = (ev) => {
            if (!started) {
                if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
                started = true;
                win.classList.add('t7-drag');
                try { hd.setPointerCapture(pid); } catch {}
            }
            nx = ox + clamp(ev.clientX - sx, 8 - r.left, innerWidth - r.width - 8 - r.left);
            ny = oy + clamp(ev.clientY - sy, 8 - r.top, innerHeight - r.height - 8 - r.top);
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const up = () => {
        const customOption = preset.querySelector('option[value="custom"]');
        customOption.disabled = !pingSystem.config.customSound;
            hd.removeEventListener('pointermove', move);
            hd.removeEventListener('pointerup', up);
            hd.removeEventListener('pointercancel', up);
            if (raf) cancelAnimationFrame(raf);
            if (!started) return;
            win.classList.remove('t7-drag');
            SOFF = { x: nx, y: ny };
            put();
            store.set('t7spos', SOFF);
        };
        hd.addEventListener('pointermove', move);
        hd.addEventListener('pointerup', up);
        hd.addEventListener('pointercancel', up);
    });

    hd.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        SOFF = { x: 0, y: 0 };
        store.set('t7spos', null);
        put();
    });
}

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
                <h4>Пинги и фильтры</h4>
                <label class="t7-fl">Ники и варианты для пинга<textarea class="t7-ping-aliases" rows="2" placeholder="ник, nick, @ник"></textarea></label>
                <label class="t7-fl">Черный список ников<textarea class="t7-ping-blacklist" rows="2" placeholder="по одному нику на строку"></textarea></label>
                <label class="t7-fl">Игнорировать сообщения со словами или фразами<textarea class="t7-ping-stopwords" rows="2" placeholder="по одному слову или фразе на строку"></textarea></label>
                <label class="t7-fl">Звук пинга<select class="t7-ping-preset"><option value="bell">Колокольчик</option><option value="chime">Звон</option><option value="pop">Короткий сигнал</option><option value="custom">Свой звук</option></select></label>
                <label class="t7-fl t7-volume">Громкость<input class="t7-ping-volume" type="range" min="0" max="1" step="0.05"><output class="t7-volume-value"></output></label>
                <div class="t7-row t7-wrap">
                    <button type="button" class="t7-b" data-act="custom-sound">Загрузить свой звук</button>
                    <button type="button" class="t7-b" data-act="test-ping">Проверить звук</button>
                    <input type="file" class="t7-ping-file" accept="audio/*" hidden>
                </div>
                <div class="t7-ping-status" role="status"></div>
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

    const pingFields = [
        ['.t7-ping-aliases', 'aliases'],
        ['.t7-ping-blacklist', 'blacklist'],
        ['.t7-ping-stopwords', 'stopWords']
    ];
    for (const [selector, key] of pingFields) {
        const input = el.querySelector(selector);
        input.value = pingSystem.config[key].join('\n');
        input.addEventListener('change', () => pingSystem.setList(key, input.value));
    }
    const preset = el.querySelector('.t7-ping-preset');
    preset.value = pingSystem.config.selectedPreset;
    preset.addEventListener('change', () => pingSystem.setPreset(preset.value));
    const volume = el.querySelector('.t7-ping-volume');
    const volumeValue = el.querySelector('.t7-volume-value');
    volume.value = String(pingSystem.config.volume);
    volumeValue.value = Math.round(pingSystem.config.volume * 100) + '%';
    volume.addEventListener('input', () => {
        pingSystem.setVolume(volume.value);
        volumeValue.value = Math.round(pingSystem.config.volume * 100) + '%';
    });
    const pingStatus = el.querySelector('.t7-ping-status');
    const pingFile = el.querySelector('.t7-ping-file');
    pingFile.addEventListener('change', async () => {
        try {
            await pingSystem.saveCustomSound(pingFile.files[0]);
            customOption.disabled = false;
            preset.value = pingSystem.config.selectedPreset;
            pingStatus.textContent = 'Свой звук сохранен';
        } catch (error) {
            pingStatus.textContent = error.message;
        }
        pingFile.value = '';
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
        if (b.dataset.act === 'custom-sound') pingFile.click();
        else if (b.dataset.act === 'test-ping') pingSystem.play();
        else if (b.dataset.act === 'refresh') reload(true);
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
            SOFF = { x: 0, y: 0 };
            store.set('t7spos', null);
            el.querySelector('.t7-sw').style.transform = '';
            setStatus('Положение окошка сброшено');
        }
    });

    document.body.appendChild(el);
    const px = el.querySelector('.t7-px'), pxs = el.querySelector('.t7-pxs');
    setupDrag(el);
    updateSetStatus(st.status);
    document.addEventListener('keydown', onKey, true);
}