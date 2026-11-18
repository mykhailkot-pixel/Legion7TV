import { STORE } from '../../core/consts.js';
import { store } from '../../core/store.js';

const LEGACY_CHAT_THEME_KEY = 't7ChatTheme';
const MAX_CHAT_CSS_LENGTH = 100 * 1024;
const CSS_STYLE_RULE = 1;
const CSS_MEDIA_RULE = 4;
const CSS_KEYFRAMES_RULE = 7;
const CSS_KEYFRAME_RULE = 8;
let chatStyleSheet = null;
let storageListenerInstalled = false;

function splitSelectors(selectorText) {
    const selectors = [];
    let start = 0;
    let parentheses = 0;
    let brackets = 0;
    let quote = '';
    let escaped = false;

    for (let index = 0; index < selectorText.length; index += 1) {
        const character = selectorText[index];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (character === '\\') {
            escaped = true;
            continue;
        }
        if (quote) {
            if (character === quote) quote = '';
            continue;
        }
        if (character === '"' || character === "'") {
            quote = character;
            continue;
        }
        if (character === '(') parentheses += 1;
        else if (character === ')') parentheses -= 1;
        else if (character === '[') brackets += 1;
        else if (character === ']') brackets -= 1;
        else if (character === ',' && parentheses === 0 && brackets === 0) {
            selectors.push(selectorText.slice(start, index).trim());
            start = index + 1;
        }
    }

    selectors.push(selectorText.slice(start).trim());
    return selectors;
}

function isChatSelector(selector) {
    return /^\.cy-chat(?=$|[\s.#:[>+~])/.test(selector);
}

function isKeyframeOffset(selector) {
    if (/^(from|to)$/i.test(selector)) return true;
    const match = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)%$/i.exec(selector);
    if (!match) return false;
    const offset = Number(match[1]);
    return offset >= 0 && offset <= 100;
}

function isPrivateIpv4(hostname) {
    const parts = hostname.split('.');
    if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255))
        return false;
    const [first, second, third] = parts.map(Number);
    return first === 0 || first === 10 || first === 127
        || (first === 169 && second === 254)
        || (first === 172 && second >= 16 && second <= 31)
        || (first === 192 && (second === 168 || (second === 0 && third <= 2) || (second === 88 && third === 99)))
        || (first === 100 && second >= 64 && second <= 127)
        || (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100)))
        || (first === 203 && second === 0 && third === 113)
        || first >= 224;
}

function validateExternalUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error('В url() нужна прямая HTTPS-ссылка на изображение.');
    }
    if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error('В url() разрешены только HTTPS-ссылки без логина и пароля.');

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
    const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
    if (!hostname.includes('.') || hostname.includes(':') || (isIpv4 && isPrivateIpv4(hostname))
        || /\.(localhost|local|internal|home\.arpa|test|invalid|example)$/.test(hostname))
        throw new Error('Используйте публичный HTTPS-домен; локальные адреса запрещены.');
    return url;
}

function validateCssUrls(cssText) {
    let quote = '';
    let escaped = false;

    for (let index = 0; index < cssText.length;) {
        const character = cssText[index];
        if (escaped) {
            escaped = false;
            index += 1;
            continue;
        }
        if (character === '\\') {
            escaped = true;
            index += 1;
            continue;
        }
        if (quote) {
            if (character === quote) quote = '';
            index += 1;
            continue;
        }
        if (character === '"' || character === "'") {
            quote = character;
            index += 1;
            continue;
        }

        const previous = cssText[index - 1] || '';
        const isUrlToken = cssText.slice(index, index + 3).toLowerCase() === 'url'
            && !/[\w-]/.test(previous);
        if (!isUrlToken) {
            index += 1;
            continue;
        }

        let open = index + 3;
        while (/\s/.test(cssText[open] || '')) open += 1;
        if (cssText[open] !== '(') {
            index += 1;
            continue;
        }

        let close = open + 1;
        let argumentQuote = '';
        let argumentEscaped = false;
        while (close < cssText.length) {
            const current = cssText[close];
            if (argumentEscaped) argumentEscaped = false;
            else if (current === '\\') argumentEscaped = true;
            else if (argumentQuote && current === argumentQuote) argumentQuote = '';
            else if (!argumentQuote && (current === '"' || current === "'")) argumentQuote = current;
            else if (!argumentQuote && current === ')') break;
            close += 1;
        }
        if (close >= cssText.length) throw new Error('Некорректная CSS-функция url().');

        let value = cssText.slice(open + 1, close).trim();
        if ((value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'")))
            value = value.slice(1, -1);
        validateExternalUrl(value);
        index = close + 1;
    }
}

function validateRules(rules) {
    for (const rule of rules) {
        if (rule.type === CSS_STYLE_RULE) {
            const selectors = splitSelectors(rule.selectorText || '');
            if (!selectors.length || selectors.some((selector) => !isChatSelector(selector)))
                throw new Error('Каждый селектор должен начинаться с .cy-chat.');
            validateCssUrls(rule.style.cssText);
            continue;
        }
        if (rule.type === CSS_MEDIA_RULE && rule.cssRules) {
            validateRules(rule.cssRules);
            continue;
        }
        if (rule.type === CSS_KEYFRAMES_RULE && rule.cssRules) {
            for (const keyframe of rule.cssRules) {
                const offsets = splitSelectors(keyframe.keyText || '');
                if (keyframe.type !== CSS_KEYFRAME_RULE
                    || !offsets.length || offsets.some((offset) => !isKeyframeOffset(offset)))
                    throw new Error('В @keyframes разрешены только from, to и процентные позиции от 0% до 100%.');
                validateCssUrls(keyframe.style.cssText);
            }
            continue;
        }
        throw new Error('Поддерживаются только CSS-правила чата, медиазапросы @media и анимации @keyframes.');
    }
}

function createValidatedStyleSheet(cssText) {
    if (typeof cssText !== 'string')
        throw new TypeError('CSS чата должен быть текстом.');
    if (cssText.length > MAX_CHAT_CSS_LENGTH)
        throw new Error('CSS не должен быть длиннее 100 КиБ.');
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    if (!sheet.cssRules.length)
        throw new Error('Не удалось разобрать CSS. Проверьте синтаксис правил.');
    validateRules(sheet.cssRules);
    return sheet;
}

function removeChatStyleSheet() {
    if (!chatStyleSheet) return;
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((sheet) => sheet !== chatStyleSheet);
    chatStyleSheet = null;
}

export function validateChatCustomCss(cssText) {
    if (typeof cssText !== 'string')
        throw new TypeError('CSS чата должен быть текстом.');
    if (cssText.trim()) createValidatedStyleSheet(cssText);
    return cssText;
}

export function applyChatCustomCss(cssText) {
    if (typeof cssText !== 'string')
        throw new TypeError('CSS чата должен быть текстом.');
    if (!cssText.trim()) {
        removeChatStyleSheet();
        return;
    }

    const nextStyleSheet = createValidatedStyleSheet(cssText);
    document.adoptedStyleSheets = [
        ...document.adoptedStyleSheets.filter((sheet) => sheet !== chatStyleSheet),
        nextStyleSheet
    ];
    chatStyleSheet = nextStyleSheet;
}

export function initializeChatCustomCss() {
    if (!storageListenerInstalled) {
        const api = globalThis.browser || globalThis.chrome;
        if (api && api.storage && api.storage.onChanged) {
            api.storage.onChanged.addListener((changes, area) => {
                if (area !== 'local' || !changes[STORE.chatCustomCss]
                    || !Object.prototype.hasOwnProperty.call(changes[STORE.chatCustomCss], 'newValue'))
                    return;
                try {
                    applyChatCustomCss(changes[STORE.chatCustomCss].newValue || '');
                } catch (error) {
                    console.warn('[Legion7TV] Updated custom chat CSS was not applied.', error);
                }
            });
        }
        storageListenerInstalled = true;
    }

    const legacyChatTheme = store.get(LEGACY_CHAT_THEME_KEY);
    if (legacyChatTheme !== undefined && legacyChatTheme !== null)
        store.set(LEGACY_CHAT_THEME_KEY, null);
    const savedCss = store.get(STORE.chatCustomCss);
    if (savedCss === undefined || savedCss === null || savedCss === '') return;
    try {
        applyChatCustomCss(savedCss);
    } catch (error) {
        console.warn('[Legion7TV] Stored custom chat CSS was not applied.', error);
    }
}
