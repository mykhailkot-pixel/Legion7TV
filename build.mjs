import { build } from 'esbuild';
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const shared = resolve(root, 'extension/shared');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const iconSizes = [16, 32, 48, 128];

const targets = {
    chromium: {
        directory: 'chromium',
        browserTarget: 'chrome111',
        async copyIcons(output) {
            const source = resolve(root, 'extension/chromium/icons');
            const destination = resolve(output, 'icons');
            const sourceSvg = resolve(source, 'legion7.svg');
            await mkdir(destination, { recursive: true });

            try {
                await access(sourceSvg);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
                await Promise.all(iconSizes.map((size) =>
                    cp(resolve(source, `icon${size}.png`), resolve(destination, `icon${size}.png`))));
                return;
            }

            await cp(sourceSvg, resolve(destination, 'legion7.svg'));
            await Promise.all(iconSizes.map((size) =>
                sharp(sourceSvg).resize(size, size).png().toFile(resolve(destination, `icon${size}.png`))));
        }
    },
    firefox: {
        directory: 'firefox',
        browserTarget: 'firefox128',
        async copyIcons(output) {
            const source = resolve(root, 'extension/chromium/icons');
            const destination = resolve(output, 'icons');
            await mkdir(destination, { recursive: true });
            await Promise.all(iconSizes.map((size) =>
                cp(resolve(source, `icon${size}.png`), resolve(destination, `icon${size}.png`))));
        }
    }
};

const cssAsText = {
    name: 'extension-css-as-text',
    setup(pluginBuild) {
        pluginBuild.onLoad({ filter: /\.css$/ }, async (args) => ({
            contents: await readFile(args.path, 'utf8'),
            loader: 'text'
        }));
    }
};

async function buildTarget(name) {
    const target = targets[name];
    const source = resolve(root, `extension/${target.directory}`);
    const output = resolve(root, `dist/${target.directory}`);
    const manifest = JSON.parse(await readFile(resolve(source, 'manifest.json'), 'utf8'));

    if (manifest.version !== packageJson.version) {
        throw new Error(`${name} manifest version ${manifest.version} does not match package version ${packageJson.version}`);
    }

    await mkdir(output, { recursive: true });
    await Promise.all([
        build({
            entryPoints: {
                'content-bridge': resolve(shared, 'content-bridge.js'),
                background: resolve(shared, 'background.js')
            },
            bundle: true,
            format: 'iife',
            target: target.browserTarget,
            outdir: output,
            legalComments: 'none',
            drop: ['console'],
            plugins: [cssAsText],
            logLevel: 'info'
        }),
        rm(resolve(output, 'page-bridge.js'), { force: true }),
        rm(resolve(output, 'styles.css'), { force: true }),
        cp(resolve(shared, 'site-hook.js'), resolve(output, 'site-hook.js')),
        writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n'),
        target.copyIcons(output)
    ]);

    console.log(`Built ${name} extension v${manifest.version} in dist/${target.directory}`);
}

const requestedTargets = process.argv.slice(2);
const targetNames = requestedTargets.length ? requestedTargets : Object.keys(targets);
const unknownTargets = targetNames.filter((name) => !Object.hasOwn(targets, name));
if (unknownTargets.length) {
    throw new Error(`Unknown build target${unknownTargets.length > 1 ? 's' : ''}: ${unknownTargets.join(', ')}`);
}

await Promise.all(targetNames.map(buildTarget));
