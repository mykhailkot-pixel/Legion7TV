import { SIZES, pageChan } from './config.js';
import { S, EM, st } from './state.js';
import { store } from './store.js';
import { clamp, parseNick } from './util.js';
import { fetchImg } from './imgcache.js';
import { reload, urlFor, setStatus } from './emotes.js';
import { rescanAll, applySize } from './chat.js';

export function updateStatus(t) {
    const e = st.pop && st.pop.querySelector('.t7-st');
    if (e) e.textContent = t;
}

/* ---------- вставка эмоута в поле чата ---------- */
function chatInput() {
    const f = st.anchor && st.anchor.closest('form');
    return f && f.querySelector('input[type=text]');
}

function insertEmote(name) {
    const inp = chatInput();
    if (!inp || inp.disabled) return;
    const v = inp.value;
    const a = inp.selectionStart != null ? inp.selectionStart : v.length;
    const b = inp.selectionEnd != null ? inp.selectionEnd : a;
    const pre = v.slice(0, a), post = v.slice(b);
    const add = (pre && !/\s$/.test(pre) ? ' ' : '') + name + (/^\s/.test(post) ? '' : ' ');
    const nv = pre + add + post;
    if (inp.maxLength > 0 && nv.length > inp.maxLength) return;
    inp.value = nv;
    const pos = (pre + add).length;
    try { inp.setSelectionRange(pos, pos); } catch {}
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    if (!matchMedia('(pointer: coarse)').matches) inp.focus({ preventScroll: true });
}

/* ---------- список эмоутов ---------- */
function onVis(entries) {
    for (const en of entries) {
        if (!en.isIntersecting) continue;
        const el = en.target;
        if (st.io) st.io.unobserve(el);
        const em = EM[el.dataset.name];
        if (!em || el.dataset.l) continue;
        el.dataset.l = '1';
        fetchImg(urlFor(em, 1), false).then((d) => { el.firstChild.src = d; }, () => {});
    }
}

function filterGrid() {
    if (!st.pop) return;
    const q = st.pop.querySelector('.t7-q').value.trim().toLowerCase();
    st.pop.querySelectorAll('.t7-gw').forEach((w) => {
        let vis = 0;
        w.childNodes.forEach((b) => {
            const show = !q || b.dataset.name.toLowerCase().includes(q);
            b.hidden = !show;
            if (show) vis++;
        });
        w.hidden = !vis;
        w.previousElementSibling.hidden = !vis;
    });
}

export function renderGrid() {
    if (!st.pop) return;
    const gr = st.pop.querySelector('.t7-gr');
    st.io.disconnect();
    gr.textContent = '';
    const names = Object.keys(EM).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const sec = (title, list) => {
        if (!list.length) return;
        const h = document.createElement('div');
        h.className = 't7-sh';
        h.textContent = `${title} · ${list.length}`;
        const w = document.createElement('div');
        w.className = 't7-gw';
        for (const n of list) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 't7-it';
            b.dataset.name = n;
            b.title = n;
            b.setAttribute('aria-label', n);
            const im = document.createElement('img');
            im.alt = '';
            im.decoding = 'async';
            b.appendChild(im);
            w.appendChild(b);
            st.io.observe(b);
        }
        gr.append(h, w);
    };
    sec('Канал', names.filter((n) => !EM[n].g));
    sec('Глобальные', names.filter((n) => EM[n].g));
    if (!names.length) {
        const d = document.createElement('div');
        d.className = 't7-emp';
        d.textContent = 'Эмоутов пока нет';
        gr.appendChild(d);
    }
    filterGrid();
}

const GR_MIN = 156;
function minH(pop) {
    const gr = pop.querySelector('.t7-gr');
    const kids = [...pop.children].filter((c) => !c.classList.contains('t7-rs') && !c.hidden);
    let h = 22;   // padding 2×10 + рамка 2×1
    for (const c of kids) h += (c === gr ? GR_MIN : c.offsetHeight);
    h += 8 * (kids.length - 1);   // gap между блоками
    return Math.ceil(h);
}

/* ---------- положение и размер окошка ---------- */
function place() {
    const pop = st.pop, anchor = st.anchor;
    if (!pop || !anchor || !anchor.isConnected) return;
    pop.style.transform = '';
    const w = clamp(st.win ? st.win.w : 340, 240, Math.max(240, innerWidth - 16));
    pop.style.width = w + 'px';
    const mh = minH(pop);
    const size = (room) => {
        room = Math.max(room, mh);
        pop.style.maxHeight = (st.win ? room : Math.min(520, room)) + 'px';
        pop.style.height = st.win ? clamp(st.win.h, mh, room) + 'px' : '';
    };
    if (st.pos) {   // окошко перетащили - держим там, где оставили (не выходя за экран)
        const x = clamp(st.pos.x, 8, Math.max(8, innerWidth - w - 8));
        const y = clamp(st.pos.y, 8, Math.max(8, innerHeight - 120));
        pop.style.left = x + 'px';
        pop.style.top = y + 'px';
        pop.style.bottom = 'auto';
        size(Math.max(200, innerHeight - y - 8));
        return;
    }
    const r = anchor.getBoundingClientRect();
    pop.style.left = clamp(r.right - w, 8, Math.max(8, innerWidth - w - 8)) + 'px';
    const above = r.top, below = innerHeight - r.bottom;
    if (above >= 300 || above > below) {
        pop.style.top = 'auto';
        pop.style.bottom = (innerHeight - r.top + 8) + 'px';
        size(Math.max(200, above - 16));
    } else {
        pop.style.bottom = 'auto';
        pop.style.top = (r.bottom + 8) + 'px';
        size(Math.max(200, below - 16));
    }
}

/* ---------- закрытие ---------- */
function onOutside(e) {
    if (st.pop && !st.pop.contains(e.target) && !(st.anchor && st.anchor.contains(e.target))) closePop();
}
function onKey(e) {
    if (e.key === 'Escape' && st.pop) {
        e.stopPropagation();
        const a = st.anchor;
        closePop();
        if (a && a.isConnected) a.focus({ preventScroll: true });
    }
}

export function closePop() {
    if (!st.pop) return;
    st.pop.remove();
    st.pop = null;
    if (st.io) st.io.disconnect();
    st.io = null;
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('resize', place);
}

function markSize(pop) {
    pop.querySelectorAll('[data-sz]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sz === S.size)));
}

/* ---------- перетаскивание за заголовок ---------- */
function setupDrag(pop) {
    const hd = pop.querySelector('.t7-h');
    hd.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.t7-x') || e.button > 0) return;
        const r = pop.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY;
        // фиксируем текущее положение и высоту: во время drag раскладка не пересчитывается
        pop.style.left = r.left + 'px';
        pop.style.top = r.top + 'px';
        pop.style.bottom = 'auto';
        pop.style.maxHeight = r.height + 'px';
        pop.classList.add('t7-drag');
        let nx = r.left, ny = r.top, raf = 0;
        try { hd.setPointerCapture(e.pointerId); } catch {}
        const apply = () => {
            raf = 0;
            pop.style.transform = `translate(${nx - r.left}px, ${ny - r.top}px)`;
        };
        const move = (ev) => {
            nx = clamp(r.left + ev.clientX - sx, 8, innerWidth - r.width - 8);
            ny = clamp(r.top + ev.clientY - sy, 8, innerHeight - 120);
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const up = () => {
            hd.removeEventListener('pointermove', move);
            hd.removeEventListener('pointerup', up);
            hd.removeEventListener('pointercancel', up);
            if (raf) cancelAnimationFrame(raf);
            if (st.pop !== pop) return;
            pop.classList.remove('t7-drag');
            st.pos = { x: nx, y: ny };
            store.set('t7pos', st.pos);
            place();   // один раз: переносит transform в left/top и пересчитывает высоту
        };
        hd.addEventListener('pointermove', move);
        hd.addEventListener('pointerup', up);
        hd.addEventListener('pointercancel', up);
    });
    // двойной клик по заголовку - вернуть позицию и размер по умолчанию
    hd.addEventListener('dblclick', (e) => {
        if (e.target.closest('.t7-x')) return;
        st.pos = null;
        st.win = null;
        store.set('t7pos', null);
        store.set('t7win', null);
        place();
    });
}

/* ---------- ресайз за уголок ---------- */
function setupResize(pop) {
    const rs = pop.querySelector('.t7-rs');
    rs.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        e.preventDefault();
        e.stopPropagation();
        const r = pop.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY;
        pop.style.transform = '';
        pop.style.left = r.left + 'px';
        pop.style.top = r.top + 'px';
        pop.style.bottom = 'auto';
        pop.style.maxHeight = 'none';
        pop.classList.add('t7-drag');   // на время ресайза список не реагирует на мышь
        let w = r.width, h = r.height, raf = 0;
        const mh = minH(pop);
        try { rs.setPointerCapture(e.pointerId); } catch {}
        const apply = () => {
            raf = 0;
            pop.style.width = w + 'px';
            pop.style.height = h + 'px';
        };
        const move = (ev) => {
            w = clamp(r.width + ev.clientX - sx, 240, Math.max(240, innerWidth - r.left - 8));
            h = clamp(r.height + ev.clientY - sy, mh, Math.max(mh, innerHeight - r.top - 8));
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const up = () => {
            rs.removeEventListener('pointermove', move);
            rs.removeEventListener('pointerup', up);
            rs.removeEventListener('pointercancel', up);
            if (raf) cancelAnimationFrame(raf);
            if (st.pop !== pop) return;
            pop.classList.remove('t7-drag');
            st.win = { w, h };
            st.pos = { x: r.left, y: r.top };
            store.set('t7win', st.win);
            store.set('t7pos', st.pos);
            place();
        };
        rs.addEventListener('pointermove', move);
        rs.addEventListener('pointerup', up);
        rs.addEventListener('pointercancel', up);
    });
}

/* ---------- открытие ---------- */
function openPop(btn) {
    st.anchor = btn;
    const pop = document.createElement('div');
    st.pop = pop;
    pop.className = 't7-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Эмоуты 7TV');
    pop.innerHTML = `
        <div class="t7-h"><b>7TV</b><button type="button" class="t7-x" aria-label="Закрыть">×</button></div>
        <form class="t7-nf">
            <label>Ник стримера на Twitch<input type="text" class="t7-nick" maxlength="80" autocomplete="off" spellcheck="false"></label>
            <button type="submit">Загрузить</button>
        </form>
        <div class="t7-st" role="status"></div>
        <div class="t7-sz"><span>Размер</span><div class="t7-szb">${Object.keys(SIZES).map((k) => `<button type="button" data-sz="${k}" aria-pressed="false">${SIZES[k].label}</button>`).join('')}</div></div>
        <input type="search" class="t7-q" placeholder="Поиск эмоутов" autocomplete="off" aria-label="Поиск эмоутов">
        <div class="t7-gr"></div>
        <div class="t7-rs" title="Потяни, чтобы изменить размер"></div>`;
    // игра не должна ловить нажатия клавиш, пока печатаем в окошке
    ['keydown', 'keyup', 'keypress'].forEach((t) => pop.addEventListener(t, (e) => e.stopPropagation()));

    setupDrag(pop);
    setupResize(pop);

    const nickInp = pop.querySelector('.t7-nick');
    nickInp.value = S.nick;
    nickInp.placeholder = pageChan || 'например, zakvielchannel';

    pop.querySelector('.t7-x').onclick = () => {
        const a = st.anchor;
        closePop();
        if (a) a.focus({ preventScroll: true });
    };
    pop.querySelector('.t7-nf').addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = nickInp.value.trim();
        const n = raw ? parseNick(raw) : pageChan;
        if (raw && !n) { setStatus('Неверный ник: нужны латинские буквы, цифры и _'); return; }
        S.nick = n;
        nickInp.value = n;
        store.set('t7nick:' + pageChan, n);
        reload(true);
    });
    pop.querySelector('.t7-szb').addEventListener('click', (e) => {
        const b = e.target.closest('[data-sz]');
        if (!b || b.dataset.sz === S.size) return;
        S.size = b.dataset.sz;
        store.set('t7size', S.size);
        applySize();
        markSize(pop);
        rescanAll();
    });
    pop.querySelector('.t7-q').addEventListener('input', filterGrid);

    const gr = pop.querySelector('.t7-gr');
    gr.addEventListener('click', (e) => {
        const b = e.target.closest('.t7-it');
        if (b) insertEmote(b.dataset.name);
    });
    st.io = new IntersectionObserver(onVis, { root: gr, rootMargin: '120px' });

    document.body.appendChild(pop);
    markSize(pop);
    updateStatus(st.status);
    renderGrid();
    place();
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey, true);
    addEventListener('resize', place);
}

export function togglePop(btn) {
    if (st.pop && st.anchor === btn) closePop();
    else { closePop(); openPop(btn); }
}