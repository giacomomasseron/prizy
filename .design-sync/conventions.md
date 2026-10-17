# Prizy UI — how to build with it

Prizy's "warm v2" look: a cream page, white panels, 1.5px ink lines, pill-shaped controls, offset ink shadows (no blur) on popovers and emphasised cards, Bricolage Grotesque headings, Figtree body text, JetBrains Mono for ids like `PRZ-244`.

## Setup

- No provider is needed for styling: every token is a CSS custom property on `:root`, loaded by `styles.css`, which also sets the page background (`var(--bg)`), text colour (`var(--fg)`) and Figtree as the body font.
- Light is the default theme. Dark is `document.documentElement.dataset.theme = 'dark'` (`:root[data-theme="dark"]` redefines the same tokens); `ThemeToggle` flips it. Never hard-code a colour a token covers, or dark theme breaks.
- If anything calls `useConfirm()`, mount `<ConfirmProvider>` once around the app.

## Styling idiom: inline styles + tokens

Prizy styles layout with inline `style={{ … }}` objects that read the tokens. Do the same for your own layout glue.

| Purpose | Tokens |
|---|---|
| Grounds | `--bg` page, `--bg2` sidebars/secondary, `--panel` cards/dialogs, `--hover` row tint |
| Lines | `--border` (rules, card edges), `--border2` (stronger), `--field` (input edge); width `var(--line)` = 1.5px |
| Text | `--fg`, `--fg2` secondary, `--fg3` muted; text on colour: `--red-ink`, `--amber-ink`, `--green-ink`, `--blue-ink`, `--accent-ink` |
| Colour | `--accent` indigo (+ `--accent2` tint, `--on-accent`), `--hi` highlighter yellow (+ `--on-hi`), `--sup`/`--sup2` support green, `--red`, `--amber`, `--green`, `--blue`, `--teal` |
| Shape | `--radius-pill`, `--radius-row` 12px, `--radius-pop` 16px, `--radius-card` 18px, `--radius-modal` 20px, `--pop-shadow` (4px 4px 0 ink), `--backdrop` |
| Type | `var(--font-display)` for headings (weight 800, letter-spacing about -.02em), `var(--font-sans)` body, `var(--font-mono)` ids and keys |

- Put the class `hl` on a span inside a display title for the yellow highlighter stroke behind it.
- The stylesheet holds only the Tailwind utilities Prizy's own code uses (for example `bg-panel`, `text-fg2`, `border-border2`, `hover:bg-hover`). Do not invent utility classes: they will not exist. Use inline styles with the tokens instead.
- Use the components for controls (`Button`, `IconButton`, `Input`, `Textarea`, `Switch`, `SegmentedControl`, `Menu`, `Modal`, `Drawer`) rather than restyling native elements; they carry hover, focus and disabled states.

## Where the truth lives

- `styles.css` imports `fonts/fonts.css` and `_ds_bundle.css`; `_ds_bundle.css` defines every token for both themes in `:root`. Read it before styling.
- Each component's `.prompt.md` (usage and examples) and `.d.ts` (props).

## Example

```jsx
<div style={{ width: 460, background: 'var(--panel)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)' }}>
  <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' }}>
    <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--fg)' }}>
      <span className="hl">Notifications</span>
    </h2>
    <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--fg2)' }}>Choose how Prizy reaches you.</p>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)' }}>Daily digest</div>
      <div style={{ fontSize: 13, color: 'var(--fg2)' }}>A summary of your issues at 8:00.</div>
    </div>
    <Switch checked={digest} onChange={setDigest} ariaLabel="Daily digest" />
  </div>
  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
    <Button variant="secondary" size="sm">Cancel</Button>
    <Button size="sm">Save</Button>
  </div>
</div>
```
