function setNativeValue(input, value) {
    const prototype = input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (!setter) throw new Error('Text input value setter is unavailable');
    setter.call(input, value);
}

export function insertText(input, text, { replaceRange } = {}) {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)
        || input.disabled || !input.isConnected) return false;
    const value = input.value;
    const start = replaceRange ? replaceRange.start
        : input.selectionStart == null ? value.length : input.selectionStart;
    const end = replaceRange ? replaceRange.end
        : input.selectionEnd == null ? start : input.selectionEnd;
    const insertion = String(text);
    const nextValue = value.slice(0, start) + insertion + value.slice(end);
    if (input.maxLength > 0 && nextValue.length > input.maxLength) return false;

    if (!matchMedia('(pointer: coarse)').matches) input.focus({ preventScroll: true });
    input.setSelectionRange(start, end);

    const command = insertion ? 'insertText' : 'delete';
    let commandResult = false;
    try {
        commandResult = insertion
            ? document.execCommand('insertText', false, insertion)
            : document.execCommand('delete');
    } catch {}

    if (commandResult === false || input.value === value) {
        setNativeValue(input, nextValue);
        const caret = start + insertion.length;
        input.setSelectionRange(caret, caret);
        input.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: insertion ? 'insertText' : 'deleteContentBackward',
            data: insertion || null
        }));
    } else {
        const caret = start + insertion.length;
        input.setSelectionRange(caret, caret);
    }
    return true;
}
