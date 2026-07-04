import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../../../resources/css/app.css'), 'utf8');
const vite = readFileSync(resolve(__dirname, '../../../vite.config.js'), 'utf8');

describe('design tokens (app.css)', () => {
  it('has dark :root palette', () => {
    expect(css).toContain('--bg:#0b0b0d');
    expect(css).toContain('--accent:#6d69f2');
    expect(css).toContain('--teal:#3aa8a0');
  });
  it('has light :root[data-theme="light"] palette', () => {
    expect(css).toContain('[data-theme="light"]');
    expect(css).toContain('--bg:#fbfbfa');
    expect(css).toContain('--accent:#5b57e0');
    expect(css).toContain('--teal:#2f8f88');
  });
  it('has @theme inline with color mappings', () => {
    expect(css).toContain('@theme inline');
    expect(css).toContain('--color-bg: var(--bg)');
    expect(css).toContain('--color-accent: var(--accent)');
    expect(css).toContain('--color-hover: var(--hover)');
  });
  it('has --font-mono in @theme inline', () => {
    expect(css).toContain("--font-mono: 'JetBrains Mono'");
  });
  it('has all three keyframes', () => {
    expect(css).toContain('@keyframes prizy-fade');
    expect(css).toContain('@keyframes prizy-slide');
    expect(css).toContain('@keyframes prizy-pop');
  });
});

describe('vite.config.js', () => {
  it('loads JetBrains Mono via bunny()', () => {
    expect(vite).toContain("JetBrains Mono");
  });
});
