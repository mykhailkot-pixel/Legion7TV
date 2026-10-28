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