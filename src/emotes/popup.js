import { EM, S, st } from '../core/state.js';
import { SIZES } from '../core/config.js';
import { store } from '../core/store.js';
import { clamp } from '../core/util.js';
import { setEmoteImage } from './emotes.js';
import { openSettings } from '../settings/settings.js';
import { getRecentLimit } from '../chat/prefs.js';
import { EV, STORE, on } from '../core/consts.js';
import { setEmoteTooltipData } from './tooltip.js';
import { cssVar, getOverlayRoot } from '../core/ui.js';
import { insertText } from '../core/insertText.js';

const FAVORITES_KEY = STORE.favorites;
const RECENT_KEY = STORE.recentEmotes;
const GRID_GAP = 2;
const GRID_OVERSCAN_ROWS = 4;
let gridMode = 'all';
let gridSourceNames = [];
let gridNames = [];
let gridFavorites = new Set();
let gridItemCache = new Map();
let gridFrame = 0;
let renderedWindow = '';

on(EV.recentLimitChange, () => {
    if (st.pop && gridMode === 'recent') renderGrid();
});
on(EV.popupEmoteAnimationChange, () => {
    if (st.pop) renderGrid();
});

function readEntries(key) {
    const value = store.get(key);
    if (!Array.isArray(value)) return [];
    const entries = value.map((item) => typeof item === 'string' ? { name: item, emote: null } : item)
        .filter((item) => item && typeof item.name === 'string' && item.name);
    return [...new Map(entries.map((item) => [item.name, item])).values()];
}

function saveRecent(name) {
    const recent = readEntries(RECENT_KEY).filter((item) => item.name !== name);
    recent.push({ name });
    store.set(RECENT_KEY, recent.slice(-getRecentLimit()));
}

export function recordRecentFromMessage(message) {
    const names = String(message || '').split(/\s+/).filter((name) => Object.prototype.hasOwnProperty.call(EM, name));
    for (const name of names) saveRecent(name);
    if (names.length && gridMode === 'recent') renderGrid();
}

function emoteFor(name) {
    return EM[name] || null;
}

function updateViewButtons() {
    if (!st.pop) return;
    st.pop.querySelectorAll('[data-view]').forEach((button) => {
        button.setAttribute('aria-selected', String(button.dataset.view === gridMode));
    });
}

function updateFavoriteButton(button, isFavorite) {
    button.textContent = isFavorite ? '★' : '☆';
    button.title = isFavorite ? 'Убрать из избранного' : 'Добавить в избранное';
    button.setAttribute('aria-label', button.title + ': ' + button.dataset.name);
    button.setAttribute('aria-pressed', String(isFavorite));
}

export function toggleFavorite(name) {
    const favorites = readEntries(FAVORITES_KEY);
    const index = favorites.findIndex((item) => item.name === name);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push({ name });
    store.set(FAVORITES_KEY, favorites);
    gridFavorites = new Set(favorites.map((item) => item.name));
    if (st.pop) {
        st.pop.querySelectorAll('.t7-fav').forEach((button) => {
            const isFavorite = gridFavorites.has(button.dataset.name);
            updateFavoriteButton(button, isFavorite);
        });
    }

    if (gridMode !== 'favorites' || index < 0 || !st.pop) return;

    gridSourceNames = gridSourceNames.filter((item) => item !== name);
    const query = st.pop.querySelector('.t7-q').value.trim().toLowerCase();
    gridNames = query ? gridSourceNames.filter((item) => item.toLowerCase().includes(query)) : gridSourceNames;
    gridItemCache.delete(name);
    const grid = st.pop.querySelector('.t7-gr');
    let empty = grid.querySelector('.t7-emp');
    if (!gridSourceNames.length) {
        if (!empty) {
            empty = document.createElement('div');
            empty.className = 't7-emp';
            empty.textContent = 'Избранных смайлов пока нет на этом канале';
            grid.appendChild(empty);
        }
    } else if (empty) {
        empty.remove();
    }
    const heading = grid.querySelector('.t7-sh');
    if (heading) heading.textContent = `Избранное · ${gridSourceNames.length}`;
    renderedWindow = '';
    renderVisibleGrid(true);
}

/* ---------- вставка эмоута в поле чата ---------- */
function chatInput() {
    const anchor = st.anchor;
    const f = anchor && (anchor.closest('form') || anchor.getRootNode().host?.closest('form'));
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
    return insertText(inp, add);
}

/* ---------- список эмоутов ---------- */
function onVis(entries) {
    for (const en of entries) {
        if (!en.isIntersecting) continue;
        const el = en.target;
        if (st.io) st.io.unobserve(el);
        const em = emoteFor(el.dataset.name);
        if (!em || el.dataset.l) continue;
        el.dataset.l = '1';
        const resolution = SIZES[S.size].n;
        const image = el.firstChild;
        setEmoteImage(image, em, resolution, 'eager', (error) => {
            console.warn('[Images] картинка смайла сайта не загрузилась', el.dataset.name, error);
        }, { staticOnly: store.get(STORE.popupEmoteAnimation) === false });
    }
}

export function getVirtualGridWindow({ count, columns, rowHeight, scrollTop, viewportHeight }) {
    const totalRows = Math.ceil(count / columns);
    const firstVisibleRow = Math.floor(Math.max(0, scrollTop) / rowHeight);
    const visibleRows = Math.max(1, Math.ceil(Math.max(0, viewportHeight) / rowHeight));
    const startRow = Math.min(totalRows, Math.max(0, firstVisibleRow - GRID_OVERSCAN_ROWS));
    const endRow = Math.min(totalRows, Math.max(startRow, firstVisibleRow + visibleRows + GRID_OVERSCAN_ROWS));
    return {
        startIndex: Math.min(count, startRow * columns),
        endIndex: Math.min(count, endRow * columns),
        top: startRow * rowHeight,
        bottom: (totalRows - endRow) * rowHeight
    };
}

export function reconcileGridItems(container, items) {
    const wanted = new Set(items);
    for (const child of [...container.children]) {
        if (!wanted.has(child)) child.remove();
    }
    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const current = container.children[index];
        if (current !== item) container.insertBefore(item, current || null);
    }
}

function renderVisibleGrid(force = false) {
    if (!st.pop) return;
    const gr = st.pop.querySelector('.t7-gr');
    const w = gr.querySelector('.t7-gw');
    if (!w) return;
    const heading = w.previousElementSibling;
    const hasMatches = gridNames.length > 0;
    w.hidden = !hasMatches;
    heading.hidden = !hasMatches;
    if (!hasMatches) {
        w.replaceChildren();
        return;
    }

    const tile = Number.parseFloat(getComputedStyle(st.pop).getPropertyValue(cssVar('tile'))) || SIZES[S.size].p;
    const rowHeight = tile + GRID_GAP;
    const columns = Math.max(1, Math.floor((gr.clientWidth + GRID_GAP) / rowHeight));
    const listTop = w.getBoundingClientRect().top - gr.getBoundingClientRect().top + gr.scrollTop;
    const window = getVirtualGridWindow({
        count: gridNames.length,
        columns,
        rowHeight,
        scrollTop: gr.scrollTop - listTop,
        viewportHeight: gr.clientHeight
    });
    const key = `${columns}:${window.startIndex}:${window.endIndex}:${gridNames.length}`;
    if (!force && key === renderedWindow) return;
    renderedWindow = key;
    w.style.paddingTop = `${window.top}px`;
    w.style.paddingBottom = `${window.bottom}px`;
    const visibleNames = gridNames.slice(window.startIndex, window.endIndex);
    const visibleSet = new Set(visibleNames);
    const visibleItems = [];
    for (const name of gridItemCache.keys()) {
        if (!visibleSet.has(name)) gridItemCache.delete(name);
    }
    for (const n of visibleNames) {
        let item = gridItemCache.get(n);
        if (!item) {
            item = document.createElement('div');
            item.className = 't7-item';
            item.dataset.name = n;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 't7-it';
            b.dataset.name = n;
            setEmoteTooltipData(b, n, emoteFor(n));
            b.setAttribute('aria-label', n);
            const im = document.createElement('img');
            im.alt = '';
            im.decoding = 'async';
            b.appendChild(im);
            const favorite = document.createElement('button');
            const isFavorite = gridFavorites.has(n);
            favorite.type = 'button';
            favorite.className = 't7-fav';
            favorite.dataset.name = n;
            updateFavoriteButton(favorite, isFavorite);
            item.append(b, favorite);
            gridItemCache.set(n, item);
        }
        visibleItems.push(item);
    }
    reconcileGridItems(w, visibleItems);
    if (st.io) w.querySelectorAll('.t7-it:not([data-l])').forEach((button) => st.io.observe(button));
}

function scheduleVisibleGrid() {
    if (gridFrame) return;
    gridFrame = requestAnimationFrame(() => {
        gridFrame = 0;
        renderVisibleGrid();
    });
}

function filterGrid(resetScroll = true) {
    if (!st.pop) return;
    const gr = st.pop.querySelector('.t7-gr');
    if (st.io) st.io.disconnect();
    gridItemCache = new Map();
    if (resetScroll) gr.scrollTop = 0;
    const q = st.pop.querySelector('.t7-q').value.trim().toLowerCase();
    gridNames = q ? gridSourceNames.filter((name) => name.toLowerCase().includes(q)) : gridSourceNames;
    renderedWindow = '';
    renderVisibleGrid(true);
}

export function renderGrid() {
    if (!st.pop) return;
    const gr = st.pop.querySelector('.t7-gr');
    if (st.io) st.io.disconnect();
    gridItemCache = new Map();
    renderedWindow = '';
    gr.textContent = '';
    const allNames = Object.keys(EM).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const favoriteEntries = readEntries(FAVORITES_KEY);
    const recentEntries = readEntries(RECENT_KEY).reverse();
    const favorites = favoriteEntries.map((item) => item.name);
    gridFavorites = new Set(favorites);
    gridSourceNames = gridMode === 'favorites' ? favoriteEntries.filter((item) => emoteFor(item.name)).map((item) => item.name)
        : gridMode === 'recent' ? recentEntries.filter((item) => emoteFor(item.name)).map((item) => item.name) : allNames;
    const sec = (title, list) => {
        if (!list.length) return;
        const h = document.createElement('div');
        h.className = 't7-sh';
        h.textContent = `${title} · ${list.length}`;
        const w = document.createElement('div');
        w.className = 't7-gw';
        gr.append(h, w);
    };
    if (gridMode === 'all') {
        sec('Смайлы канала', gridSourceNames);
    } else {
        sec(gridMode === 'favorites' ? 'Избранное' : 'Недавние', gridSourceNames);
    }
    if (!gridSourceNames.length) {
        const d = document.createElement('div');
        d.className = 't7-emp';
        d.textContent = gridMode === 'favorites' ? 'Избранных смайлов пока нет на этом канале'
            : gridMode === 'recent' ? 'Недавно использованных смайлов пока нет'
                : 'Ожидание каталога смайлов сайта';
        gr.appendChild(d);
    }
    filterGrid(false);
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
export function place() {
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
function onKey(e) {
    if (st.set) return;   // Esc сначала закрывает настройки
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
    if (gridFrame) cancelAnimationFrame(gridFrame);
    gridFrame = 0;
    renderedWindow = '';
    gridItemCache = new Map();
    if (st.io) st.io.disconnect();
    st.io = null;
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('resize', onPopupResize);
}

function onPopupResize() {
    place();
    renderedWindow = '';
    renderVisibleGrid(true);
}

function markSize(pop) {
    pop.querySelectorAll('[data-sz]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sz === S.size)));
}

/* ---------- перетаскивание за заголовок ---------- */
function setupDrag(pop) {
    const hd = pop.querySelector('.t7-h');
    hd.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || e.button !== 0 || !e.isPrimary) return;   // кнопки в заголовке остаются кнопками
        const r = pop.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, pid = e.pointerId;
        let started = false, nx = r.left, ny = r.top, raf = 0;

        const apply = () => {
            raf = 0;
            pop.style.transform = `translate(${nx - r.left}px, ${ny - r.top}px)`;
        };
        const start = () => {
            started = true;
            // фиксируем текущее положение и высоту: во время drag раскладка не пересчитывается
            pop.style.left = r.left + 'px';
            pop.style.top = r.top + 'px';
            pop.style.bottom = 'auto';
            pop.style.maxHeight = r.height + 'px';
            pop.classList.add('t7-drag');
            try { hd.setPointerCapture(pid); } catch {}
        };
        const move = (ev) => {
            if (ev.pointerId !== pid) return;
            if (ev.pointerType === 'mouse' && !(ev.buttons & 1)) { up(); return; }
            if (!started) {
                if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;   // ещё просто клик
                start();
            }
            nx = clamp(r.left + ev.clientX - sx, 8, innerWidth - r.width - 8);
            ny = clamp(r.top + ev.clientY - sy, 8, innerHeight - 120);
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const up = () => {
            removeEventListener('pointermove', move);
            removeEventListener('pointerup', up);
            removeEventListener('pointercancel', up);
            removeEventListener('blur', up);
            if (raf) cancelAnimationFrame(raf);
            if (!started || st.pop !== pop) return;
            pop.classList.remove('t7-drag');
            st.pos = { x: nx, y: ny };
            store.set(STORE.popupPosition, st.pos);
            place();   // один раз: переносит transform в left/top и пересчитывает высоту
        };
        addEventListener('pointermove', move);
        addEventListener('pointerup', up);
        addEventListener('pointercancel', up);
        addEventListener('blur', up);
    });
    // двойной клик по заголовку - вернуть позицию и размер по умолчанию
    hd.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        st.pos = null;
        st.win = null;
        store.set(STORE.popupPosition, null);
        store.set(STORE.popupSize, null);
        place();
    });
}

/* ---------- ресайз за уголок ---------- */
function setupResize(pop) {
    const rs = pop.querySelector('.t7-rs');
    rs.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !e.isPrimary) return;
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
            if (ev.pointerId !== e.pointerId) return;
            if (ev.pointerType === 'mouse' && !(ev.buttons & 1)) { up(); return; }
            w = clamp(r.width + ev.clientX - sx, 240, Math.max(240, innerWidth - r.left - 8));
            h = clamp(r.height + ev.clientY - sy, mh, Math.max(mh, innerHeight - r.top - 8));
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const up = () => {
            removeEventListener('pointermove', move);
            removeEventListener('pointerup', up);
            removeEventListener('pointercancel', up);
            removeEventListener('blur', up);
            if (raf) cancelAnimationFrame(raf);
            if (st.pop !== pop) return;
            pop.classList.remove('t7-drag');
            st.win = { w, h };
            st.pos = { x: r.left, y: r.top };
            store.set(STORE.popupSize, st.win);
            store.set(STORE.popupPosition, st.pos);
            place();
            renderVisibleGrid(true);
        };
        addEventListener('pointermove', move);
        addEventListener('pointerup', up);
        addEventListener('pointercancel', up);
        addEventListener('blur', up);
    });
}

/* ---------- открытие ---------- */
function openPop(btn) {
    st.anchor = btn;
    const pop = document.createElement('div');
    st.pop = pop;
    pop.className = 't7-pop';
    pop.style.setProperty(cssVar('tile'), SIZES[S.size].p + 'px');
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Эмоуты 7TV');
    const header = document.createElement('div');
    header.className = 't7-h';
    const title = document.createElement('b');
    title.textContent = '7TV';
    const headerButtons = document.createElement('span');
    headerButtons.className = 't7-hb';
    for (const [className, label, text] of [
        ['t7-g', 'Настройки', '⚙'],
        ['t7-x', 'Закрыть', '×']
    ]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.setAttribute('aria-label', label);
        button.title = label;
        button.textContent = text;
        headerButtons.appendChild(button);
    }
    header.append(title, headerButtons);

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 't7-q';
    search.placeholder = 'Поиск эмоутов';
    search.autocomplete = 'off';
    search.setAttribute('aria-label', 'Поиск эмоутов');

    const views = document.createElement('div');
    views.className = 't7-views';
    views.setAttribute('role', 'tablist');
    views.setAttribute('aria-label', 'Списки эмоутов');
    for (const [id, label, selected] of [
        ['all', 'Все', true],
        ['favorites', 'Избранное', false],
        ['recent', 'Недавние', false]
    ]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'tab');
        button.dataset.view = id;
        button.setAttribute('aria-selected', String(selected));
        button.textContent = label;
        views.appendChild(button);
    }

    const grid = document.createElement('div');
    grid.className = 't7-gr';
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 't7-rs';
    resizeHandle.title = 'Потяни, чтобы изменить размер';
    pop.append(header, search, views, grid, resizeHandle);
    ['keydown', 'keyup', 'keypress'].forEach((t) => pop.addEventListener(t, (e) => e.stopPropagation()));

    setupDrag(pop);
    setupResize(pop);

    pop.querySelector('.t7-x').addEventListener('click', () => {
        const a = st.anchor;
        closePop();
        if (a) a.focus({ preventScroll: true });
    });
    pop.querySelector('.t7-g').addEventListener('click', openSettings);
    pop.querySelector('.t7-q').addEventListener('input', filterGrid);
    gridMode = 'all';
    pop.querySelector('.t7-views').addEventListener('click', (e) => {
        const button = e.target.closest('[data-view]');
        if (!button || button.dataset.view === gridMode) return;
        gridMode = button.dataset.view;
        gr.scrollTop = 0;
        updateViewButtons();
        renderGrid();
    });

    const gr = pop.querySelector('.t7-gr');
    gr.addEventListener('scroll', scheduleVisibleGrid, { passive: true });
    gr.addEventListener('click', (e) => {
        const favorite = e.target.closest('.t7-fav');
        if (favorite) {
            toggleFavorite(favorite.dataset.name);
            return;
        }
        const b = e.target.closest('.t7-it');
        if (b) {
            saveRecent(b.dataset.name);
            insertEmote(b.dataset.name);
            if (gridMode === 'recent') renderGrid();
        }
    });
    st.io = new IntersectionObserver(onVis, { root: gr, rootMargin: '120px' });

    getOverlayRoot().appendChild(pop);
    place();
    renderGrid();
    document.addEventListener('keydown', onKey, true);
    addEventListener('resize', onPopupResize);
}

export function togglePop(btn) {
    if (st.pop && st.anchor === btn) closePop();
    else { closePop(); openPop(btn); }
}