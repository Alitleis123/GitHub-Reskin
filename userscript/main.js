// Runs GitHub Reskin as a userscript, for browsers that can't keep the extension installed.
// scripts/userscript.mjs puts this first in github-reskin.user.js, then the extension's own
// scripts, all inside one function. This chrome object stands in for the extension's storage,
// so content.js and popup.js run unchanged. Like the extension, it keeps each setting under its
// own key, so a save only writes what changed.
const listeners = [];
const notify = () => listeners.forEach((listener) => listener({}, "local"));

const chrome = {
  storage: {
    local: {
      async get(defaults) {
        const keys = Object.keys(defaults);
        const values = await Promise.all(keys.map((key) => GM.getValue(key, defaults[key])));
        return Object.fromEntries(keys.map((key, i) => [key, values[i]]));
      },
      async set(patch) {
        await Promise.all(Object.entries(patch).map(([key, value]) => GM.setValue(key, value)));
        notify();
      },
    },
    onChanged: { addListener: (listener) => listeners.push(listener) },
  },
};

// The popup's card, floating over the page. Popup.css styles the card and these rules the panel.
const HOST_CSS = `:host {
  all: initial; display: block; position: fixed; top: 16px; right: 16px; z-index: 2147483647;
  width: 336px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); overflow: auto;
  border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 8px 24px rgb(0 0 0 / .4);
  background: var(--bg); color: var(--text);
  font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}`;
let panel = null;

function open() {
  if (panel) return;
  panel = document.createElement("github-reskin");
  const root = panel.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${POPUP_CSS}\n${HOST_CSS}</style>${POPUP_HTML}`;
  document.documentElement.append(panel);
  globalThis.GitHubReskin.card(root);
}

function close() {
  if (!panel) return;
  panel.remove();
  panel = null;
  if (location.hash === "#reskin") history.replaceState(history.state, "", location.pathname + location.search);
}

// Tampermonkey, Violentmonkey and Greasemonkey list this command in their menu.
if (typeof GM.registerMenuCommand === "function") GM.registerMenuCommand("Theme and colors", () => (panel ? close() : open()));
// Userscripts in Safari has no menu, so github.com/#reskin opens the card too. A tab opened in
// the background waits until you switch to it, so the card loads the settings current by then.
const openFromHash = () => location.hash === "#reskin" && !document.hidden && open();
window.addEventListener("hashchange", openFromHash);
// Wait for popup.js, which runs after this file.
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", openFromHash);
else setTimeout(openFromHash);

// A userscript can't hear another tab save, so a tab repaints when you switch back to it.
// The card closes when you leave, like the extension's popup, so it never shows old settings.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return close();
  notify();
  openFromHash();
});

document.addEventListener("pointerdown", (e) => panel && !e.composedPath().includes(panel) && close(), true);
// Escape closes the card. GitHub's shortcuts see keys typed in the card as coming from the
// panel, not a text field, so typing "b" in a hex value would open blame. GitHub listens in the
// capture phase, but this runs at document-start, before GitHub's scripts add their listeners,
// so it can keep keys typed in the card from reaching them.
for (const type of ["keydown", "keypress", "keyup"]) {
  window.addEventListener(type, (e) => {
    if (!panel) return;
    if (e.type === "keydown" && e.key === "Escape") close();
    else if (e.composedPath().includes(panel)) e.stopImmediatePropagation();
  }, true);
}
