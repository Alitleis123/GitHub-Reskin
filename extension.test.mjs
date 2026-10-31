import assert from "node:assert/strict";
import test from "node:test";
import "./extension/github-modes.js";
import "./extension/themes.js";

const { THEMES, DEFAULTS, palette, css, contrast, isHex } = globalThis.GitHubReskin;

test("every theme keeps text, muted text, links and button text readable", () => {
  for (const theme of THEMES) {
    for (const key of ["bg", "text", "accent", "graph", "surface", "border", "muted"]) {
      if (theme[key] !== undefined) assert.ok(isHex(theme[key]), `${theme.id}.${key}`);
    }
    const p = palette({ theme: theme.id });
    assert.ok(contrast(p.text, p.bg) >= 4.5, `${theme.id} text ${contrast(p.text, p.bg).toFixed(2)}`);
    assert.ok(contrast(p.muted, p.bg) >= 4.5, `${theme.id} muted ${contrast(p.muted, p.bg).toFixed(2)}`);
    assert.ok(contrast(p.link, p.bg) >= 4.5, `${theme.id} link`);
    assert.ok(contrast("#ffffff", p.strong) >= 4.5, `${theme.id} button text`);
  }
});

test("edited colors replace the theme's, and broken ones are ignored", () => {
  const custom = { bg: "#000000", text: "#ffffff", accent: "#ff0000", graph: "#00ff00" };
  const edited = palette({ theme: "dracula", custom });
  assert.equal(edited.bg, "#000000");
  assert.equal(edited.shades[4], "#00ff00");
  assert.notEqual(edited.surface, THEMES.find((t) => t.id === "dracula").surface);

  assert.equal(palette({ theme: "dracula", custom: { ...custom, bg: "black" } }).bg, "#282a36");
  assert.equal(palette({ theme: "missing" }).bg, THEMES[0].bg);
});

test("css repaints GitHub's variables and every graph level", () => {
  const out = css(palette(DEFAULTS));
  assert.match(out, /--bgColor-default:#0a0a0b !important;/);
  for (let level = 0; level <= 4; level++) {
    assert.match(out, new RegExp(`\\.ContributionCalendar-day\\[data-level="${level}"\\]\\{fill:#[0-9a-f]{6} !important`));
  }
  assert.match(out, /color-scheme:dark !important/);
  assert.match(css(palette({ theme: "solarized-light" })), /color-scheme:light !important/);
});

test("dark themes bring GitHub's dark code and diff colors, light themes the light ones", () => {
  const dark = css(palette({ theme: "editing-suite" }));
  const light = css(palette({ theme: "solarized-light" }));
  assert.match(dark, /--prettylights-syntax-keyword:#ff7b72 !important/);
  assert.match(light, /--prettylights-syntax-keyword:#cf222e !important/);
  // High contrast and colorblind palettes point some diff colors elsewhere, so those are reset too.
  assert.match(light, /--diffBlob-additionWord-fgColor:var\(--fgColor-default\) !important/);
  // The theme's own colors come after GitHub's, so they win.
  assert.ok(dark.lastIndexOf("--bgColor-default:#0a0a0b") > dark.indexOf("--bgColor-default:"));
});

test("an unreadable text color falls back to black or white for derived colors", () => {
  const p = palette({ theme: "editing-suite", custom: { bg: "#ffffff", text: "#ededea", accent: "#f2a93b", graph: "#f2a93b" } });
  assert.equal(p.text, "#ededea");
  assert.equal(p.ink, "#000000");
  assert.ok(contrast(p.muted, p.bg) >= 4.5);
  assert.ok(contrast(p.link, p.bg) >= 4.5);
});
