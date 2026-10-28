import { build } from 'esbuild';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const header = fs.readFileSync('src/header.txt', 'utf8')
    .replace('{{version}}', pkg.version.replace(/\.0$/, ''));   // 3.4.0 → 3.4

await build({
    entryPoints: ['src/main.js'],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    loader: { '.css': 'text' },
    outfile: '7tv-multidonate.user.js',
    banner: { js: header + '\n' },
    legalComments: 'none',
    minify: false
});
console.log('built', pkg.version);