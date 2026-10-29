export const CACHE_TTL = 60 * 60 * 1000;   // как часто обновлять СПИСОК эмоутов (картинки кешируются навсегда)

// h - высота эмоута в чате, n - какое разрешение файла качать (1x..4x)
export const SIZES = {
    s: { h: '1.3em', n: 2, label: 'S' },
    m: { h: '1.9em', n: 2, label: 'M' },
    l: { h: '2.6em', n: 3, label: 'L' },
    x: { h: '3.4em', n: 3, label: 'XL' }
};

export const pageChan = (() => {
    const m = /\/c\/([\w]+)/.exec(location.pathname);
    return m ? m[1].toLowerCase() : '';
})();

// Свои эмоуты 7TV: показываются всегда, на любом канале.
// id берётся из ссылки: 7tv.app/emotes/<id>
// name - своё имя (необязательно, без пробелов); нет - берётся имя с 7TV
export const EXTRA_EMOTES = [
    { id: '01KPTZTF2P1MP5RFNJ4Q1ZQZS6'},
];

// Целые наборы эмоутов: id из ссылки 7tv.app/emote-sets/<id>
export const EXTRA_SETS = [
    // '01...',
];