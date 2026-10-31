// Paints GitHub with the chosen theme. Runs at document_start on github.com.
(function () {
  "use strict";
  const { DEFAULTS, palette, css } = globalThis.GitHubReskin;
  const CACHE = "github-reskin-css";

  const style = document.createElement("style");
  style.id = "github-reskin";
  // Paint the last theme right away so full page loads don't flash GitHub's colors.
  style.textContent = localStorage.getItem(CACHE) || "";
  document.documentElement.append(style);

  function apply(settings) {
    const text = settings.enabled ? css(palette(settings)) : "";
    style.textContent = text;
    if (text) localStorage.setItem(CACHE, text);
    else localStorage.removeItem(CACHE);
  }

  chrome.storage.local.get(DEFAULTS).then(apply);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") chrome.storage.local.get(DEFAULTS).then(apply);
  });
})();
