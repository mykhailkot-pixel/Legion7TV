import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const shared = resolve(root, 'extension/shared');
const iconSource = resolve(root, 'extension/chromium/icons');
const output = resolve(root, 'dist/firefox');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'extension/firefox/manifest.json'), 'utf8'));

if (manifest.version !== packageJson.version) {
    throw new Error(`Firefox manifest version ${manifest.version} does not match package version ${packageJson.version}`);
}

await mkdir(resolve(output, 'icons'), { recursive: true });
await rm(resolve(output, 'page-bridge.js'), { force: true });

const cssAsText = {
    name: 'extension-css-as-text',
    setup(build) {
        build.onLoad({ filter: /\.css$/ }, () => ({
            contents: '',
            loader: 'text'
        }));
    }
};

await Promise.all([
    build({
        entryPoints: {
            'content-bridge': resolve(shared, 'content-bridge.js'),
            background: resolve(shared, 'background.js')
        },
        bundle: true,
        format: 'iife',
        target: 'firefox128',
        outdir: output,
        legalComments: 'none',
        plugins: [cssAsText],
        logLevel: 'info'
    }),
    cp(resolve(root, 'src/styles.css'), resolve(output, 'styles.css')),
    writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n'),
    ...[16, 32, 48, 128].map((size) =>
        cp(resolve(iconSource, `icon${size}.png`), resolve(output, `icons/icon${size}.png`)))
]);

console.log(`Built Firefox extension v${manifest.version} in dist/firefox`);
