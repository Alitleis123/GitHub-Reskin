import assert from "node:assert/strict";
import test from "node:test";
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
