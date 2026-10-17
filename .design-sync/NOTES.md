# /design-sync notes for Prizy

Target: claude.ai/design project "Prizy UI" (`projectId` in config.json). Shape: package (no Storybook). Scope: the 22 components in `resources/js/components/ui`.

## How the build works

- Prizy is an app, not a published library: there is no `dist/` or `.d.ts` tree. `.design-sync/build-pkg.mjs` stages one in `.ds-sync/pkg/` (gitignored, rebuilt each run) as `@prizy/ui`: an esbuild ESM bundle of every `components/ui/*.tsx` (react external), tsc declarations for the same files, the app's compiled Tailwind stylesheet (`public/build` from `npx vite build`) and the self-hosted woff2 fonts with a rewritten `fonts.css`. `cfg.buildCmd` runs both; `cfg.entry` points the converter at the staged entry, so no `--entry` flag is needed.
- `npx vite build` downloads the Bunny fonts (laravel-vite-plugin `fonts`) over the network.
- Converter deps: `(cd .ds-sync && npm i esbuild ts-morph @types/react playwright@1.49.1)`. Build: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle`.

## This machine (render check)

- The cached browser is `chromium-1148`, which pins **playwright@1.49.1** (the repo's own @playwright/test 1.61.1 wants 1228, not cached).
- The host lacks `libnss3`/`libnspr4`. Without root: `apt-get download libnss3 libnspr4` into `.ds-sync/syslibs/debs`, `dpkg -x` each into `.ds-sync/syslibs/root`, and run validate / capture / resync with `LD_LIBRARY_PATH=$PWD/.ds-sync/syslibs/root/usr/lib/x86_64-linux-gnu`.

## Converter gaps worked around in config

- **`dtsPropsFor`** (Button, IconButton, Input, Textarea, Menu, QueryState, AvatarStack, SegmentedControl): the converter drops props inherited from React DOM types (so Button lost `onClick`/`disabled`/`type`, Input lost `value`/`onChange`/`placeholder`), prints React interfaces such as `CSSProperties` without the `React.` prefix, and leaves local helper types (`MenuItem`, `QueryLike`, `AvatarStackItem`, `SegmentedOption`) undeclared. The bodies are hand-written from the source, with the helper types inlined.
- **Groups**: `.design-sync/docs/<Name>.md` files set each component's `category`. A frontmatter-only stub keeps the synthesized prompt (props + examples from the preview); a stub with a body replaces it (props are still appended).
- **Overlay docs**: Menu, Modal, Drawer and ConfirmProvider have real doc bodies with clean usage examples, because their previews need harness code (open-on-mount, a `transform` stage) that must not reach the design agent.
- **`runtimeFontPrefixes: ["Cambria"]`**: Cambria is only in Tailwind's default `--font-serif` system stack (ui-serif, Georgia, Cambria, …), which no component uses. It is not a brand font; Figtree, Bricolage Grotesque and JetBrains Mono all ship as woff2.

## Preview conventions

- Write cells as `export const Name = () => (…)`: only that form is copied into the `## Examples` section of `<Name>.prompt.md`. `export function` cells still render but stay out of the examples (used for the overlay previews).
- Fixed-position overlays (Modal, Drawer, ConfirmProvider) render inside a `position: relative; transform: translateZ(0)` stage, so the capture holds the whole dialog. Their cards are `cardMode: single` with a viewport.
- Menu previews click the trigger on mount (`OpenOnMount`) to show the popover.
- Glyphs: the app's `⌕`/emoji icons may be missing from headless fonts; previews use ✕ ⋯ ‹ › ☆ ☀, which render.

## Known render warns

- None at the end of the first sync (2026-10-17): 22/22 clean, every cell graded good.

## Re-sync risks

- The `dtsPropsFor` bodies and the four overlay docs were copied from the source on 2026-10-17. Re-check them when those components' props or behaviour change: they will not update by themselves.
- The category stubs enumerate all 22 components; a new component lands ungrouped until it gets a stub.
- `cssEntry` is the whole app's compiled Tailwind CSS: it holds only the utilities the app uses, and changes with any app CSS change (a styling re-upload, no re-grade).
- The playwright pin and the libnss workaround are specific to this machine.
- `.review.html` was not reviewed by a human in the first sync (it ran in the background); the grades are the gate.
