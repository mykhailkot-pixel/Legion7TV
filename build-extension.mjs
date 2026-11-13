import { build } from 'esbuild';
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const source = resolve(root, 'extension/chromium');
const shared = resolve(root, 'extension/shared');
const output = resolve(root, 'dist/chromium');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(source, 'manifest.json'), 'utf8'));

if (manifest.version !== packageJson.version) {
    throw new Error(`Chromium manifest version ${manifest.version} does not match package version ${packageJson.version}`);
}

await mkdir(output, { recursive: true });
await rm(resolve(output, 'page-bridge.js'), { force: true });
const cssAsText = {
    name: 'extension-css-as-text',
    setup(build) {
        build.onLoad({ filter: /\.css$/ }, async (args) => ({
            contents: await readFile(args.path, 'utf8'),
            loader: 'text'
        }));
    }
};

async function writeIcons() {
    const directory = resolve(output, 'icons');
    await mkdir(directory, { recursive: true });
    const sourceIcon = resolve(source, 'icons/legion7.svg');

    try {
        await access(sourceIcon);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await Promise.all([16, 32, 48, 128].map((size) =>
            cp(resolve(source, `icons/icon${size}.png`), resolve(directory, `icon${size}.png`))));
        return;
    }

    await cp(sourceIcon, resolve(directory, 'legion7.svg'));
    await Promise.all([16, 32, 48, 128].map((size) =>
        sharp(sourceIcon).resize(size, size).png().toFile(resolve(directory, `icon${size}.png`))));
}

await Promise.all([
    build({
        entryPoints: {
            'content-bridge': resolve(shared, 'content-bridge.js'),
            background: resolve(shared, 'background.js')
        },
        bundle: true,
        format: 'iife',
        target: 'chrome111',
        outdir: output,
        legalComments: 'none',
        drop: ['console'],
        plugins: [cssAsText],
        logLevel: 'info'
    }),
    rm(resolve(output, 'styles.css'), { force: true }),
    cp(resolve(shared, 'site-hook.js'), resolve(output, 'site-hook.js')),
    writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n'),
    writeIcons()
]);

console.log(`Built Chromium extension v${manifest.version} in dist/chromium`);
