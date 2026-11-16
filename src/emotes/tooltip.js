import { setEmoteImage } from './emotes.js';
import { getOverlayRoot } from '../core/ui.js';
import { STORE } from '../core/consts.js';
import { store } from '../core/store.js';

const tooltipData = new WeakMap();
let tooltip = null;
let current = null;
let imageToken = 0;
let initialized = false;
let enabled = true;

export function isEmoteTooltipEnabled() {
    return enabled;
}

export function setEmoteTooltipEnabled(value) {
    enabled = value !== false;
    if (!enabled) hide();
}

export function setEmoteTooltipData(element, name, emote) {
    if (element && emote) tooltipData.set(element, { name, emote });
}

function findTarget(node) {
    const element = node instanceof Element ? node.closest('.t7-it, img.cy-emo') : null;
    return element && tooltipData.has(element) ? element : null;
}

function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.className = 't7-tip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    const preview = document.createElement('div');
    preview.className = 't7-tip-preview';
    const image = document.createElement('img');
    image.alt = '';
    preview.appendChild(image);

    const info = document.createElement('div');
    info.className = 't7-tip-info';
    const name = document.createElement('strong');
    name.className = 't7-tip-name';
    const author = document.createElement('div');
    author.className = 't7-tip-author';
    const added = document.createElement('div');
    added.className = 't7-tip-added';
    const type = document.createElement('div');
    type.className = 't7-tip-type';
    info.append(name, author, type, added);
    tooltip.append(preview, info);
    getOverlayRoot().appendChild(tooltip);
    return tooltip;
}

function position(target) {
    if (!tooltip || tooltip.hidden) return;
    const targetRect = target.getBoundingClientRect();
    const margin = 8;
    const rect = tooltip.getBoundingClientRect();
    const left = Math.max(margin, Math.min(innerWidth - rect.width - margin, targetRect.left + targetRect.width / 2 - rect.width / 2));
    const above = targetRect.top - rect.height - 10;
    const top = above >= margin ? above : Math.min(innerHeight - rect.height - margin, targetRect.bottom + 10);
    tooltip.style.left = left + 'px';
    tooltip.style.top = Math.max(margin, top) + 'px';
}

function show(target) {
    const data = tooltipData.get(target);
    if (!data) return;
    current = target;
    const tip = ensureTooltip();
    const { name, emote } = data;
    const title = tip.querySelector('.t7-tip-name');
    title.replaceChildren(document.createTextNode(name));

    const author = tip.querySelector('.t7-tip-author');
    author.replaceChildren();
    author.hidden = true;
    tip.querySelector('.t7-tip-type').textContent = 'Смайл канала';
    const addedAt = tip.querySelector('.t7-tip-added');
    addedAt.hidden = true;

    const image = tip.querySelector('img');
    const token = ++imageToken;
    image.removeAttribute('src');
    image.removeAttribute('srcset');
    image.classList.add('t7-tip-loading');
    tip.hidden = false;
    position(target);
    image.onload = () => {
        if (current === target && token === imageToken) image.classList.remove('t7-tip-loading');
    };
    const sourceImage = target.matches('img') ? target : target.querySelector('img');
    const isCurrent = () => current === target && token === imageToken;
    const syncSourceImage = () => {
        if (!isCurrent() || !sourceImage || !sourceImage.getAttribute('src')) return false;
        const src = sourceImage.currentSrc || sourceImage.src;
        if (!src) return false;
        if (image.src !== src) image.src = src;
        return true;
    };
    if (!syncSourceImage()) {
        if (sourceImage) sourceImage.addEventListener('load', syncSourceImage, { once: true });
        setEmoteImage(image, emote, 4, 'eager', (error) => {
            if (isCurrent()) {
                image.classList.remove('t7-tip-loading');
                console.warn('[Images] не удалось загрузить смайл сайта', name, error);
            }
        }, () => isCurrent() && !(sourceImage && sourceImage.getAttribute('src')));
    }
}

function hide() {
    current = null;
    imageToken++;
    if (tooltip) tooltip.hidden = true;
}

export function initEmoteTooltip() {
    if (initialized) return;
    initialized = true;
    enabled = store.get(STORE.emoteTooltipEnabled) !== false;
    const root = getOverlayRoot();
    const onMouseOver = (event) => {
        if (!enabled) return;
        const target = findTarget(event.target);
        if (!target || target === current) return;
        show(target);
    };
    const onMouseOut = (event) => {
        if (!current) return;
        if (findTarget(event.relatedTarget) === current) return;
        hide();
    };
    const onFocusIn = (event) => {
        if (!enabled) return;
        const target = findTarget(event.target);
        if (target) show(target);
    };
    const onFocusOut = (event) => {
        if (current === findTarget(event.target)) hide();
    };
    for (const target of [document, root]) {
        target.addEventListener('mouseover', onMouseOver);
        target.addEventListener('mouseout', onMouseOut);
        target.addEventListener('focusin', onFocusIn);
        target.addEventListener('focusout', onFocusOut);
    }
    document.addEventListener('scroll', () => {
        if (current) hide();
    }, true);
}
