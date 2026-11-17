import { STORE } from '../../core/consts.js';
import { store } from '../../core/store.js';
import { normalizeChatTheme } from './themeAssets.js';

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

function replaceAssetUrls(cssText, assets) {
    let rewritten = '';
    let quote = '';
    let escaped = false;

    for (let index = 0; index < cssText.length;) {
        const character = cssText[index];
        if (escaped) {
            rewritten += character;
            escaped = false;
            index += 1;
            continue;
        }
        if (character === '\\') {
            rewritten += character;
            escaped = true;
            index += 1;
            continue;
        }
        if (quote) {
            rewritten += character;
            if (character === quote) quote = '';
            index += 1;
            continue;
        }
        if (character === '"' || character === "'") {
            quote = character;
            rewritten += character;
            index += 1;
            continue;
        }

        const previous = cssText[index - 1] || '';
        const isUrlToken = cssText.slice(index, index + 3).toLowerCase() === 'url'
            && !/[\w-]/.test(previous);
        if (!isUrlToken) {
            rewritten += character;
            index += 1;
            continue;
        }

        let open = index + 3;
        while (/\s/.test(cssText[open] || '')) open += 1;
        if (cssText[open] !== '(') {
            rewritten += character;
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

        let assetId = cssText.slice(open + 1, close).trim();
        if ((assetId.startsWith('"') && assetId.endsWith('"'))
            || (assetId.startsWith("'") && assetId.endsWith("'")))
            assetId = assetId.slice(1, -1);
        const match = assetId.match(/^t7-asset:([a-z0-9][a-z0-9_-]{0,31})$/i);
        if (!match)
            throw new Error('Внешние CSS-ссылки запрещены. Используйте url("t7-asset:ID").');
        const id = match[1].toLowerCase();
        const asset = assets[id];
        if (!asset) throw new Error(`В теме нет изображения с ID «${id}».`);
        rewritten += `url("data:${asset.mime};base64,${asset.data}")`;
        index = close + 1;
    }

    return rewritten;
}

function validateRules(rules, assets) {
    for (const rule of rules) {
        if (rule.type === 1) {
            const selectors = splitSelectors(rule.selectorText || '');
            if (!selectors.length || selectors.some((selector) => !isChatSelector(selector)))
                throw new Error('Каждый селектор должен начинаться с .cy-chat.');
            rule.style.cssText = replaceAssetUrls(rule.style.cssText, assets);
            continue;
        }
        if (rule.type === 4 && rule.cssRules) {
            validateRules(rule.cssRules, assets);
            continue;
        }
        throw new Error('Поддерживаются только CSS-правила чата и медиазапросы @media.');
    }
}

function createValidatedStyleSheet(cssText, assets) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    if (!sheet.cssRules.length)
        throw new Error('Не удалось разобрать CSS. Проверьте синтаксис правил.');
    validateRules(sheet.cssRules, assets);
    return sheet;
}

function removeChatStyleSheet() {
    if (!chatStyleSheet) return;
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((sheet) => sheet !== chatStyleSheet);
    chatStyleSheet = null;
}

export function applyChatTheme(value) {
    const theme = normalizeChatTheme(value);
    if (!theme.css.trim()) {
        removeChatStyleSheet();
        return theme;
    }

    const nextStyleSheet = createValidatedStyleSheet(theme.css, theme.assets);
    document.adoptedStyleSheets = [
        ...document.adoptedStyleSheets.filter((sheet) => sheet !== chatStyleSheet),
        nextStyleSheet
    ];
    chatStyleSheet = nextStyleSheet;
    return theme;
}

export function validateChatTheme(value) {
    const theme = normalizeChatTheme(value);
    if (theme.css.trim()) createValidatedStyleSheet(theme.css, theme.assets);
    return theme;
}

export function applyChatCustomCss(cssText) {
    return applyChatTheme({ version: 1, css: cssText, assets: {} });
}

export function initializeChatCustomCss() {
    if (!storageListenerInstalled) {
        const api = globalThis.browser || globalThis.chrome;
        if (api && api.storage && api.storage.onChanged) {
            api.storage.onChanged.addListener((changes, area) => {
                if (area !== 'local' || !changes[STORE.chatTheme]
                    || !Object.prototype.hasOwnProperty.call(changes[STORE.chatTheme], 'newValue'))
                    return;
                try {
                    applyChatTheme(changes[STORE.chatTheme].newValue);
                } catch (error) {
                    console.warn('[Legion7TV] Updated custom chat theme was not applied.', error);
                }
            });
        }
        storageListenerInstalled = true;
    }

    const savedTheme = store.get(STORE.chatTheme);
    const savedCss = store.get(STORE.chatCustomCss);
    if (savedTheme === undefined && (savedCss === undefined || savedCss === null || savedCss === '')) return;

    try {
        applyChatTheme(savedTheme === undefined
            ? { version: 1, css: savedCss, assets: {} }
            : savedTheme);
    } catch (error) {
        console.warn('[Legion7TV] Stored custom chat theme was not applied.', error);
    }
}
