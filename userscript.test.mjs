import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { build } from "./scripts/userscript.mjs";

const script = await build();

test("the committed userscript matches the extension", async () => {
  const committed = await readFile(new URL("./userscript/github-reskin.user.js", import.meta.url), "utf8");
  assert.equal(committed.replace(/\r\n/g, "\n"), script, "Run node scripts/userscript.mjs");
});

test("the userscript paints from userscript storage and repaints when you come back to the tab", async () => {
  const values = { settings: { theme: "nord" } };
  const events = {};
  const style = {};
  const document = {
    readyState: "complete",
    hidden: false,
    documentElement: { append() {} },
    createElement: () => style,
    addEventListener: (type, listener) => (events[type] = listener),
  };
  const GM = { getValue: async (key, fallback) => values[key] ?? fallback, setValue: async (key, value) => (values[key] = value) };
  const context = { GM, document, window: { addEventListener() {} }, location: { protocol: "https:", hash: "" }, setTimeout };
  vm.runInNewContext(script, context);
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  await settle();
  assert.match(style.textContent, /--bgColor-default:#2e3440 !important/);

  values.settings = { theme: "dracula" };
  events.visibilitychange();
  await settle();
  assert.match(style.textContent, /--bgColor-default:#282a36 !important/);

  values.settings = { enabled: false };
  events.visibilitychange();
  await settle();
  assert.equal(style.textContent, "");
});
