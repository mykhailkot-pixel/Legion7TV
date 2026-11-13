import { store } from '../../core/store.js';
import { STORE } from '../../core/consts.js';
import { cssVar, getUiInstallId } from '../../core/ui.js';

const CUSTOM_FAMILY = `Font${getUiInstallId()}`;
const FONT_MIME = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };
const FONT_CHOICES = new Set(['site', 'nunito', 'open-sans', 'roboto', 'lato', 'montserrat', 'custom']);
const MAX_FONT_SIZE = 2 * 1024 * 1024;
const DEFAULT_CHAT_FONT_SIZE = 14;
let customFace = null;
let listObserver = null;

export function getChatFont() {
    const value = store.get(STORE.chatFont);
    return FONT_CHOICES.has(value) ? value : 'site';
}

export function getCustomChatFont() {
    const value = store.get(STORE.chatFontFile);
    return value && typeof value.name === 'string' && typeof value.source === 'string' ? value : null;
}

export function getChatFontSize() {
    const value = Number(store.get(STORE.chatFontSize));
    return Number.isFinite(value) ? Math.max(11, Math.min(22, Math.round(value))) : DEFAULT_CHAT_FONT_SIZE;
}

export function setChatFontSize(value) {
    const size = Number(value);
    if (!Number.isFinite(size)) return DEFAULT_CHAT_FONT_SIZE;
    const normalized = Math.max(11, Math.min(22, Math.round(size)));
    store.set(STORE.chatFontSize, normalized);
    applyFontSettings();
    return normalized;
}

function setFamily(value) {
    document.querySelectorAll('.cy-chat-l, .dm-l').forEach((list) => {
        if (value) list.style.setProperty(cssVar('chat-font'), value);
        else list.style.removeProperty(cssVar('chat-font'));
    });
}

function applyFontSettings(root = document) {
    const family = selectedFamily();
    const size = getChatFontSize() + 'px';
    const lists = [];
    if (root instanceof Element && root.matches('.cy-chat-l, .dm-l')) lists.push(root);
    if (root.querySelectorAll) lists.push(...root.querySelectorAll('.cy-chat-l, .dm-l'));
    for (const list of lists) {
        if (family) list.style.setProperty(cssVar('chat-font'), family);
        else list.style.removeProperty(cssVar('chat-font'));
        list.style.setProperty(cssVar('chat-font-size'), size);
    }
}

function selectedFamily() {
    const choice = getChatFont();
    return choice === 'nunito' ? 'Nunito, sans-serif'
        : choice === 'open-sans' ? '"Open Sans", sans-serif'
            : choice === 'roboto' ? 'Roboto, sans-serif'
                : choice === 'lato' ? 'Lato, sans-serif'
                    : choice === 'montserrat' ? 'Montserrat, sans-serif'
                        : choice === 'custom' && customFace ? `"${CUSTOM_FAMILY}", sans-serif` : '';
}

function observeChatLists() {
    if (listObserver || !document.body) return;
    listObserver = new MutationObserver((records) => {
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) applyFontSettings(node);
            }
        }
    });
    listObserver.observe(document.body, { childList: true, subtree: true });
}

async function loadCustomFont(font) {
    if (!font || !font.source || typeof FontFace !== 'function') return false;
    const face = new FontFace(CUSTOM_FAMILY, `url("${font.source}")`);
    await face.load();
    if (customFace) document.fonts.delete(customFace);
    document.fonts.add(face);
    customFace = face;
    setFamily(`"${CUSTOM_FAMILY}", sans-serif`);
    return true;
}

export async function applyChatFont() {
    const choice = getChatFont();
    observeChatLists();
    if (choice === 'custom') {
        try {
            if (await loadCustomFont(getCustomChatFont())) {
                applyFontSettings();
                return true;
            }
        } catch (error) {
            console.warn('[7TV] не удалось загрузить шрифт чата', error);
        }
        setFamily(null);
        applyFontSettings();
        return false;
    }
    setFamily(selectedFamily());
    applyFontSettings();
    return true;
}

export async function setChatFont(choice) {
    if (!FONT_CHOICES.has(choice) || (choice === 'custom' && !getCustomChatFont())) return false;
    store.set(STORE.chatFont, choice);
    return applyChatFont();
}

function toBase64(bytes) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return btoa(binary);
}

export async function uploadChatFont(file) {
    if (!file) throw new Error('Выберите файл шрифта');
    const extension = file.name.split('.').pop().toLowerCase();
    const mime = FONT_MIME[extension];
    if (!mime) throw new Error('Поддерживаются форматы WOFF2, WOFF, TTF и OTF');
    if (file.size > MAX_FONT_SIZE) throw new Error('Размер файла должен быть не больше 2 МБ');

    const bytes = new Uint8Array(await file.arrayBuffer());
    const source = `data:${mime};base64,${toBase64(bytes)}`;
    const font = { name: file.name, source };
    const face = new FontFace(CUSTOM_FAMILY, `url("${source}")`);
    try {
        await face.load();
    } catch {
        throw new Error('Не удалось загрузить этот файл шрифта');
    }

    if (customFace) document.fonts.delete(customFace);
    document.fonts.add(face);
    customFace = face;
    store.set(STORE.chatFontFile, font);
    store.set(STORE.chatFont, 'custom');
    setFamily(`"${CUSTOM_FAMILY}", sans-serif`);
    return font.name;
}

export async function removeCustomChatFont() {
    if (customFace) document.fonts.delete(customFace);
    customFace = null;
    store.set(STORE.chatFontFile, null);
    if (getChatFont() === 'custom') store.set(STORE.chatFont, 'site');
    await applyChatFont();
}