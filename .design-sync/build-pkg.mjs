// The /design-sync build step (cfg.buildCmd runs it after `npx vite build`).
//
// Prizy is an app, not a published library: its UI kit is source in
// resources/js/components/ui with no dist/ or .d.ts tree. This stages one in
// .ds-sync/pkg/ (gitignored, regenerated every run) so the converter runs on a
// real build instead of guessing from source:
//
//   package.json            @prizy/ui, module + types entries
//   dist/index.js           ESM bundle of every component file (react external)
//   dist/index.d.ts         re-exports the tsc declarations in dist/types/
//   dist/styles.css         the app's compiled Tailwind stylesheet (vite build)
//   dist/fonts/fonts.css    the self-hosted @font-face rules (woff2 only), with
//                           the font files beside it
//
// Run from the repo root, after `npx vite build` has filled public/build/.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const UI = join(ROOT, 'resources/js/components/ui');
const PKG = join(ROOT, '.ds-sync/pkg');
const BUILD = join(ROOT, 'public/build');

if (!existsSync(join(BUILD, 'manifest.json'))) {
  console.error('build-pkg: public/build/manifest.json is missing - run `npx vite build` first');
  process.exit(1);
}

const files = readdirSync(UI)
  .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
  .sort();
const modules = files.map((f) => f.replace(/\.tsx$/, ''));

rmSync(PKG, { recursive: true, force: true });
mkdirSync(join(PKG, 'dist/fonts'), { recursive: true });

writeFileSync(join(PKG, 'package.json'), JSON.stringify({
  name: '@prizy/ui',
  version: '0.0.0',
  private: true,
  type: 'module',
  module: 'dist/index.js',
  types: 'dist/index.d.ts',
}, null, 2) + '\n');

// -- JS: one ESM bundle of every component file ---------------------------
const entry = join(PKG, 'entry.ts');
const rel = (p) => relative(PKG, p).split('\\').join('/');
writeFileSync(entry, modules.map((m) => `export * from './${rel(join(UI, m))}';`).join('\n') + '\n');
const esbuild = createRequire(join(ROOT, '.ds-sync/package.json'))('esbuild');
await esbuild.build({
  entryPoints: [entry],
  outfile: join(PKG, 'dist/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
  logLevel: 'warning',
});

// -- Types: tsc declarations for the same files ---------------------------
writeFileSync(join(PKG, 'tsconfig.json'), JSON.stringify({
  extends: rel(join(ROOT, 'tsconfig.json')),
  compilerOptions: {
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: './dist/types',
    rootDir: rel(join(ROOT, 'resources/js')),
    types: [],
  },
  include: [],
  files: files.map((f) => rel(join(UI, f))),
}, null, 2) + '\n');
execFileSync(join(ROOT, 'node_modules/.bin/tsc'), ['-p', join(PKG, 'tsconfig.json')], { stdio: 'inherit' });
writeFileSync(
  join(PKG, 'dist/index.d.ts'),
  modules.map((m) => `export * from './types/components/ui/${m}';`).join('\n') + '\n',
);

// -- CSS: the app's compiled stylesheet -----------------------------------
const manifest = JSON.parse(readFileSync(join(BUILD, 'manifest.json'), 'utf8'));
const appCss = manifest['resources/css/app.css']?.file;
if (!appCss) {
  console.error('build-pkg: resources/css/app.css is not in the vite manifest');
  process.exit(1);
}
copyFileSync(join(BUILD, appCss), join(PKG, 'dist/styles.css'));

// -- Fonts: the self-hosted @font-face rules, woff2 only ------------------
// laravel-vite-plugin's fonts (bunny) emits one rule per format; the woff
// duplicates add nothing a current browser needs.
const fontsManifest = JSON.parse(readFileSync(join(BUILD, 'fonts-manifest.json'), 'utf8'));
const fontsCss = readFileSync(join(BUILD, fontsManifest.style.file), 'utf8');
const kept = [];
for (const rule of fontsCss.match(/@font-face\s*\{[^}]*\}/g) ?? []) {
  const url = /url\("?\/build\/assets\/([^")]+\.woff2)"?\)/.exec(rule)?.[1];
  if (!url) continue;
  copyFileSync(join(BUILD, 'assets', url), join(PKG, 'dist/fonts', url));
  kept.push(rule.replace(/url\("?\/build\/assets\/([^")]+)"?\)/, 'url("./$1")'));
}
writeFileSync(join(PKG, 'dist/fonts/fonts.css'), kept.join('\n\n') + '\n');

console.error(`build-pkg: ${modules.length} component files, ${kept.length} @font-face rules -> ${rel(join(PKG, 'dist'))}`);
