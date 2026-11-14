import { store } from './store.js';
import { STORE } from './consts.js';

const INSTALL_ID_PATTERN = /^[a-z][a-z0-9]{6,8}$/i;
let installId = '';
let overlayHost = null;
let overlayRoot = null;
let overlayStyleSheet = null;

function createInstallId() {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    return `l${[...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function initializeUiIdentity() {
    const saved = store.get(STORE.installId);
    installId = typeof saved === 'string' && INSTALL_ID_PATTERN.test(saved)
        ? saved
        : createInstallId();
    if (installId !== saved) store.set(STORE.installId, installId);
    return installId;
}

export function getUiInstallId() {
    if (!installId) initializeUiIdentity();
    return installId;
}

function prefix() {
    if (!installId) initializeUiIdentity();
    return `l7x-${installId}-`;
}

export function cls(name) {
    return prefix() + name;
}

export function cssVar(name) {
    return `--${prefix()}${name}`;
}

function makeStyleSheet(cssText) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    return sheet;
}

function namespaceVariables(cssText) {
    return cssText.replace(/--t7-([\w-]+)/g, `--${prefix()}$1`);
}

function namespaceDocumentStyles(cssText) {
    const classPrefix = prefix();
    return namespaceVariables(cssText
        .replace(/\.t7-([\w-]+)/g, `.${classPrefix}$1`)
        .replace(/\.cy-chat-(tp|pn)\b/g, `.${classPrefix}chat-$1`));
}

function splitStyles(cssText) {
    const tooltipStart = cssText.indexOf('.t7-tip{');
    const imageLinkStart = cssText.indexOf('.t7-image-link{');
    const uiStart = cssText.indexOf('.t7-ping-menu{');
    const chatStart = cssText.indexOf('.cy-chat-tabs:not([hidden]){');
    if ([tooltipStart, imageLinkStart, uiStart, chatStart].some((index) => index < 0))
        throw new Error('Extension stylesheet sections are incomplete');

    return {
        overlay: cssText.slice(tooltipStart, imageLinkStart)
            + cssText.slice(uiStart, chatStart),
        document: cssText.slice(0, tooltipStart)
            + cssText.slice(imageLinkStart, uiStart)
            + cssText.slice(chatStart)
    };
}

export function installUiStyles(cssText) {
    if (typeof cssText !== 'string' || !cssText.trim())
        throw new Error('Extension stylesheet is unavailable');
    initializeUiIdentity();
    const styles = splitStyles(cssText);
    const documentSheet = makeStyleSheet(namespaceDocumentStyles(styles.document));
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, documentSheet];
    overlayStyleSheet = makeStyleSheet(namespaceVariables(
        `:host{display:block;position:fixed;inset:0;z-index:2147483647;isolation:isolate;pointer-events:none}:host>*{pointer-events:auto}\n${styles.overlay}`
    ));
    if (overlayRoot) overlayRoot.adoptedStyleSheets = [...overlayRoot.adoptedStyleSheets, overlayStyleSheet];
}

export function getOverlayRoot() {
    if (overlayRoot) return overlayRoot;
    if (!document.documentElement) throw new Error('Cannot create extension UI before document.documentElement exists');
    overlayHost = document.createElement('div');
    for (const [property, value] of [
        ['display', 'block'],
        ['position', 'fixed'],
        ['inset', '0'],
        ['z-index', '2147483647'],
        ['isolation', 'isolate'],
        ['pointer-events', 'none']
    ]) {
        overlayHost.style.setProperty(property, value, 'important');
    }
    overlayRoot = overlayHost.attachShadow({ mode: 'closed' });
    if (overlayStyleSheet) overlayRoot.adoptedStyleSheets = [overlayStyleSheet];
    document.documentElement.appendChild(overlayHost);
    return overlayRoot;
}
