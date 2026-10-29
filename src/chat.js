import { SIZES } from './config.js';
import { S, EM } from './state.js';
import { has } from './util.js';
import { fetchImg } from './imgcache.js';
import { urlFor } from './emotes.js';
import { refToUrl } from './links.js';

/* ---------- не даём ленте «уползать» вверх, когда эмоуты увеличивают строки ---------- */
// scroll не всплывает, поэтому ловим в capture-фазе; программный рост высоты событие scroll не вызывает,
// так что флаг отражает только то, где ленту оставил пользователь (или игра)
document.addEventListener('scroll', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('cy-chat-l'))
        t.dataset.t7end = (t.scrollHeight - t.scrollTop - t.clientHeight < 40) ? '1' : '0';
}, true);

function stickEnds() {
    document.querySelectorAll('.cy-chat-l').forEach((l) => {
        if (l.dataset.t7end !== '0') l.scrollTop = l.scrollHeight;
    });
}
function stickFrom(el) {
    const l = el.closest && el.closest('.cy-chat-l');
    if (l && l.dataset.t7end !== '0') l.scrollTop = l.scrollHeight;
}

/* ---------- подстановка эмоутов в сообщения ---------- */
function makeImg(name, em, cls) {
    const img = document.createElement('img');
    img.className = cls;
    img.alt = name;
    img.title = name;
    img.addEventListener('load', () => stickFrom(img));   // ширина эмоута могла поменять перенос строк
    fetchImg(urlFor(em, SIZES[S.size].n), true).then(
        (d) => { img.src = d; },
        (e) => { console.warn('[7TV] картинка не загрузилась', name, e); img.replaceWith(document.createTextNode(name)); }
    );
    return img;
}

const URL_RE = /\[ref\]\{[^{}\s]+\}|https:\/\/[^\s<>"']+|www\.[^\s<>"']+/giu;
const HOST_OK = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

function linkifyText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
        if (node.parentElement && node.parentElement.closest('a')) continue;
        const text = node.nodeValue;
        const matches = [...text.matchAll(URL_RE)];
        if (!matches.length) continue;
        const fragment = document.createDocumentFragment();
        let offset = 0;
        for (const match of matches) {
            const start = match.index;
            if (start < offset) continue;
            let url = match[0], href, label, len;
            if (/^\[ref\]/i.test(url)) {
                href = refToUrl(url.slice(6, -1));
                label = href.slice(8);
                len = url.length;
            } else {
                while (/[.,!?;:]$/.test(url)) url = url.slice(0, -1);
                while (url.endsWith(')') && (url.match(/\)/g) || []).length > (url.match(/\(/g) || []).length) url = url.slice(0, -1);
                href = url.startsWith('www.') ? 'https://' + url : url;
                label = url;
                len = url.length;
            }
            fragment.appendChild(document.createTextNode(text.slice(offset, start)));
            let valid = false;
            try {
                const p = new URL(href);
                valid = p.protocol === 'https:' && HOST_OK.test(p.hostname);
            } catch {}
            if (valid) {
                const a = document.createElement('a');
                a.className = 't7-link';
                a.href = href;
                a.title = href;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = label;
                fragment.appendChild(a);
                offset = start + len;
            } else {
                fragment.appendChild(document.createTextNode(match[0]));
                offset = start + match[0].length;
            }
        }
        fragment.appendChild(document.createTextNode(text.slice(offset)));
        node.replaceWith(fragment);
    }
}

function processSpan(sp) {
    const act = S.on ? EM : NONE;   // эмоуты выключены - возвращаем обычный текст
    const src = sp.dataset.t7o != null ? sp.dataset.t7o : sp.textContent;
    const parts = src.split(/(\s+)/);
    if (!parts.some((p) => has(act, p))) {
        if (sp.dataset.t7o != null) { sp.textContent = src; delete sp.dataset.t7o; }
        linkifyText(sp);
        return;
    }
    sp.dataset.t7o = src;   // исходный текст, чтобы пересобрать при смене ника / размера

    const frag = document.createDocumentFragment();
    let lastWrap = null;
    for (const p of parts) {
        const em = has(EM, p) ? EM[p] : null;
        if (em && em.zw && lastWrap) { lastWrap.appendChild(makeImg(p, em, 't7-zw')); continue; }
        if (em) {
            const w = document.createElement('span');
            w.className = 't7-w';
            w.appendChild(makeImg(p, em, 't7-e'));
            frag.appendChild(w);
            lastWrap = w;
            continue;
        }
        if (/^\s+$/.test(p)) {
            if (lastWrap) { frag.appendChild(document.createTextNode(p)); continue; }
        } else if (p) {
            lastWrap = null;
        }
        if (p) frag.appendChild(document.createTextNode(p));
    }
    linkifyText(frag);
    sp.textContent = '';
    sp.appendChild(frag);
}

function processLi(li) {
    if (li.dataset.t7) return;
    li.dataset.t7 = '1';
    if (li.classList.contains('cy-chat-0')) return;
    if (li.classList.contains('cy-chat-sys') || li.classList.contains('cy-chat-ev')) {
        linkifyText(li);
        return;
    }
    const spans = li.querySelectorAll(':scope > span:not([class])');
    const sp = spans[spans.length - 1];
    if (sp) processSpan(sp);
}
 // Изменяем функцию scan, чтобы она искала необработанные элементы во ВСЁМ чате (включая ЛС)
export function scan() {
  // 1. Сканируем основной чат (.cy-chat-l) с прижатием к низу
  const chatFresh = document.querySelectorAll(".cy-chat-l li:not([data-t7])");
  if (chatFresh.length) {
    chatFresh.forEach(processLi);
    stickEnds();
  }

  // 2. Тихая обработка для личных сообщений (.cy-chat-dmx) БЕЗ вызова stickEnds(),
  // чтобы верстка в личке не дергалась и скролл не скакал.
  const dmFresh = document.querySelectorAll(".cy-chat-dmx li:not([data-t7]), .cy-chat-dmx span:not([data-t7])");
  if (dmFresh.length) {
    dmFresh.forEach((node) => {
      if (node.dataset.t7) return;
      node.dataset.t7 = "1";
      
      // Если это элемент сообщения <li> в личке
      if (node.tagName === 'LI') {
        const span = node.querySelector('span');
        if (span) processSpan(span);
      } 
      // Или если это просто текстовый спан/абзац внутри лички
      else if (!node.children.length && node.textContent.trim()) {
        processSpan(node);
      }
    });
  }
}

export function rescanAll() {
    document.querySelectorAll('.cy-chat-l li[data-t7]').forEach((li) => { delete li.dataset.t7; });
    scan();
}

export const applySize = () => {
    document.documentElement.style.setProperty('--t7-h', SIZES[S.size].h);
    document.documentElement.style.setProperty('--t7-tile', SIZES[S.size].p + 'px');
};