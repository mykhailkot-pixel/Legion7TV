export async function copyTextToClipboard(text) {
    if (typeof text !== 'string') throw new TypeError('Текст для копирования должен быть строкой.');

    let clipboardError = null;
    const clipboard = globalThis.navigator && globalThis.navigator.clipboard;
    if (clipboard && typeof clipboard.writeText === 'function') {
        try {
            await clipboard.writeText(text);
            return;
        } catch (error) {
            clipboardError = error;
        }
    }

    if (typeof document.execCommand !== 'function')
        throw new Error('Буфер обмена недоступен. Разрешите копирование и попробуйте снова.');

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
    document.body.appendChild(textarea);
    textarea.select();

    let copied;
    try {
        copied = document.execCommand('copy');
    } finally {
        textarea.remove();
    }

    if (!copied) {
        const detail = clipboardError instanceof Error && clipboardError.message
            ? ` ${clipboardError.message}`
            : '';
        throw new Error(`Не удалось скопировать текст. Попробуйте ещё раз.${detail}`);
    }
}
