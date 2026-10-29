import { build } from 'esbuild';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ищем файл по имени: сначала в корне, затем по папкам проекта (node_modules и скрытые пропускаем)
function find(name, dir = '.') {
    if (existsSync(join(dir, name))) return join(dir, name);
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory() || e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const r = find(name, join(dir, e.name));
        if (r) return r;
    }
    return null;
}
const need = (name) => {
    const f = find(name);
    if (!f) throw new Error(`не найден файл ${name} в папке проекта`);
    return f;
};

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const OUT = '7tv-multidonate.user.js';

// шапка userscript: единственный комментарий, который остаётся в результате
const header = readFileSync(need('header.txt'), 'utf8')
    .replace('{{version}}', pkg.version)
    .trim();

// CSS подключается как строка; комментарии вырезаем до этого
const cssNoComments = {
    name: 'css-no-comments',
    setup(b) {
        b.onLoad({ filter: /\.css$/ }, (args) => ({
            contents: readFileSync(args.path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{2,}/g, '\n').trim(),
            loader: 'text'
        }));
    }
};

await build({
    entryPoints: [need('main.js')],
    bundle: true,
    format: 'iife',
    target: 'chrome100',
    outfile: OUT,
    legalComments: 'none',   // esbuild сам не переносит обычные комментарии; это убирает ещё и @license/@preserve
    banner: { js: header },
    plugins: [cssNoComments],
    logLevel: 'info'
});

// страховка: убираем всё, что могло просочиться, кроме блока ==UserScript==
const code = readFileSync(OUT, 'utf8');
const end = code.indexOf('// ==/UserScript==') + '// ==/UserScript=='.length;
const body = code.slice(end).replace(/^\s*\/\/.*$/gm, '').replace(/\n{2,}/g, '\n');
writeFileSync(OUT, code.slice(0, end) + '\n' + body.trimStart());

console.log(`собран ${OUT} v${pkg.version}`);
