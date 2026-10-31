// Themes and the CSS that applies them. Shared by the popup and the content script.
(function () {
  "use strict";

  // Each theme sets four colors you can edit in the popup. Optional surface, border
  // and muted values follow the original palette and drop away once you edit.
  // palette() shifts muted text and links toward the text color when they'd be hard to read.
  // Palettes are from their open source projects, credited in the README.
  const THEMES = [
    { id: "editing-suite", name: "Editing Suite", bg: "#0a0a0b", text: "#ededea", accent: "#f2a93b", graph: "#f2a93b" },
    { id: "dracula", name: "Dracula", bg: "#282a36", text: "#f8f8f2", accent: "#bd93f9", graph: "#ff79c6", surface: "#21222c", border: "#44475a", muted: "#6272a4" },
    { id: "nord", name: "Nord", bg: "#2e3440", text: "#eceff4", accent: "#88c0d0", graph: "#88c0d0", surface: "#3b4252", border: "#4c566a", muted: "#616e88" },
    { id: "catppuccin-mocha", name: "Catppuccin Mocha", bg: "#1e1e2e", text: "#cdd6f4", accent: "#cba6f7", graph: "#a6e3a1", surface: "#181825", border: "#313244", muted: "#a6adc8" },
    { id: "gruvbox", name: "Gruvbox", bg: "#282828", text: "#ebdbb2", accent: "#fabd2f", graph: "#b8bb26", surface: "#32302f", border: "#504945", muted: "#a89984" },
    { id: "tokyo-night", name: "Tokyo Night", bg: "#1a1b26", text: "#c0caf5", accent: "#7aa2f7", graph: "#bb9af7", surface: "#16161e", border: "#292e42", muted: "#565f89" },
    { id: "rose-pine", name: "Rosé Pine", bg: "#191724", text: "#e0def4", accent: "#c4a7e7", graph: "#ebbcba", surface: "#1f1d2e", border: "#403d52", muted: "#908caa" },
    { id: "one-dark", name: "One Dark", bg: "#282c34", text: "#abb2bf", accent: "#61afef", graph: "#98c379", surface: "#21252b", border: "#3e4451", muted: "#5c6370" },
    { id: "solarized-dark", name: "Solarized Dark", bg: "#002b36", text: "#93a1a1", accent: "#268bd2", graph: "#2aa198", surface: "#073642", border: "#174652", muted: "#586e75" },
    { id: "catppuccin-latte", name: "Catppuccin Latte", bg: "#eff1f5", text: "#4c4f69", accent: "#8839ef", graph: "#40a02b", surface: "#e6e9ef", border: "#ccd0da", muted: "#6c6f85" },
    { id: "rose-pine-dawn", name: "Rosé Pine Dawn", bg: "#faf4ed", text: "#575279", accent: "#907aa9", graph: "#d7827e", surface: "#fffaf3", border: "#dfdad9", muted: "#797593" },
    { id: "solarized-light", name: "Solarized Light", bg: "#fdf6e3", text: "#073642", accent: "#268bd2", graph: "#2aa198", surface: "#eee8d5", border: "#ddd6c1", muted: "#657b83" },
  ];

  const DEFAULTS = { enabled: true, theme: THEMES[0].id, custom: null };
  const EDITABLE = ["bg", "text", "accent", "graph"];

  function rgb(color) {
    const n = parseInt(color.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }

  // Moves color a toward color b. t = 0 gives a, t = 1 gives b.
  function mix(a, b, t) {
    const [x, y] = [rgb(a), rgb(b)];
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }

  function luminance(color) {
    const [r, g, b] = rgb(color).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(a, b) {
    const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  }

  // GitHub puts white text on accent buttons. Darken the accent until that text reads.
  function darkenForWhiteText(color) {
    let t = 0;
    while (contrast(mix(color, "#000000", t), "#ffffff") < 4.5 && t < 1) t += 0.05;
    return mix(color, "#000000", Math.min(t, 1));
  }

  // Mixes color toward the text color until it reads on the background.
  function readable(color, bg, text) {
    let t = 0;
    while (contrast(mix(color, text, t), bg) < 4.5 && t < 1) t += 0.05;
    return mix(color, text, Math.min(t, 1));
  }

  function isHex(value) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  }

  // Settings from storage -> the full set of colors to paint.
  function palette(settings) {
    const theme = THEMES.find((t) => t.id === settings.theme) || THEMES[0];
    const custom = settings.custom && EDITABLE.every((k) => isHex(settings.custom[k])) ? settings.custom : null;
    const { bg, text, accent, graph } = custom || theme;
    const dark = luminance(bg) < 0.18;
    // If the chosen text color doesn't read on the background, derived colors and the
    // popup use black or white instead. One of the two always reaches 4.5:1.
    const ink =
      contrast(text, bg) >= 4.5 ? text : contrast("#000000", bg) > contrast("#ffffff", bg) ? "#000000" : "#ffffff";
    return {
      dark,
      bg,
      text,
      ink,
      accent,
      graph,
      surface: (!custom && theme.surface) || mix(bg, ink, 0.05),
      border: (!custom && theme.border) || mix(bg, ink, 0.18),
      muted: readable((!custom && theme.muted) || mix(bg, ink, 0.65), bg, ink),
      link: readable(accent, bg, ink),
      inset: mix(bg, "#000000", dark ? 0.3 : 0.03),
      raised: mix(bg, ink, 0.08),
      hover: mix(bg, ink, 0.12),
      strong: darkenForWhiteText(accent),
      shades: [mix(bg, ink, 0.09), ...[0.35, 0.55, 0.78, 1].map((t) => mix(bg, graph, t))],
    };
  }

  function css(p) {
    const vars = {
      "--bgColor-default": p.bg,
      "--bgColor-muted": p.surface,
      "--bgColor-inset": p.inset,
      "--bgColor-accent-emphasis": p.strong,
      "--bgColor-accent-muted": mix(p.bg, p.accent, 0.16),
      "--bgColor-neutral-muted": mix(p.bg, p.text, 0.12),
      "--fgColor-default": p.text,
      "--fgColor-muted": p.muted,
      "--fgColor-accent": p.link,
      "--fgColor-link": p.link,
      "--borderColor-default": p.border,
      "--borderColor-muted": mix(p.bg, p.border, 0.7),
      "--borderColor-accent-emphasis": p.accent,
      "--borderColor-accent-muted": mix(p.bg, p.accent, 0.4),
      "--header-bgColor": p.inset,
      "--header-fgColor-default": p.muted,
      "--header-fgColor-logo": p.text,
      "--header-borderColor-divider": p.border,
      "--headerSearch-bgColor": p.bg,
      "--headerSearch-borderColor": p.border,
      "--page-header-bgColor": p.bg,
      "--card-bgColor": p.bg,
      "--overlay-bgColor": p.raised,
      "--overlay-borderColor": p.border,
      "--control-bgColor-rest": p.surface,
      "--control-bgColor-hover": p.hover,
      "--control-borderColor-rest": p.border,
      "--control-fgColor-rest": p.text,
      "--button-default-bgColor-rest": p.raised,
      "--button-default-bgColor-hover": p.hover,
      "--button-default-bgColor-active": mix(p.bg, p.text, 0.16),
      "--button-default-borderColor-rest": p.border,
      "--button-default-borderColor-hover": p.border,
      "--button-default-fgColor-rest": p.text,
      "--button-primary-bgColor-rest": p.strong,
      "--button-primary-bgColor-hover": mix(p.strong, "#000000", 0.12),
      "--button-primary-bgColor-active": mix(p.strong, "#000000", 0.2),
      "--button-primary-borderColor-rest": p.strong,
      "--button-primary-fgColor-rest": "#ffffff",
      "--buttonCounter-default-bgColor-rest": mix(p.bg, p.text, 0.14),
      "--underlineNav-borderColor-active": p.accent,
      "--sideNav-bgColor-selected": p.raised,
      "--selection-bgColor": mix(p.bg, p.accent, 0.35),
      "--focus-outlineColor": p.accent,
    };
    // GitHub swaps in holiday palettes (Halloween, winter) for the graph and activity chart.
    for (const season of ["default", "halloween", "winter"]) {
      p.shades.forEach((shade, level) => (vars[`--contribution-${season}-bgColor-${level}`] = shade));
    }
    const declarations = Object.entries(vars).map(([name, value]) => `${name}:${value} !important;`).join("");
    const days = p.shades
      .map(
        (shade, level) =>
          `.ContributionCalendar-day[data-level="${level}"]{fill:${shade} !important;background-color:${shade} !important;border-color:transparent !important}`,
      )
      .join("\n");
    // The activity overview's shape has its holiday color in a fill attribute.
    const blob = `.js-highlight-blob{fill:${p.graph} !important;stroke:${p.graph} !important}`;
    // GitHub's own colors for the matching mode go first, so code, diffs and labels suit the background.
    const mode = (globalThis.GitHubReskinModes || {})[p.dark ? "dark" : "light"] || "";
    return `${blob}\n:root,[data-color-mode],[data-light-theme],[data-dark-theme]{${mode}${declarations}color-scheme:${p.dark ? "dark" : "light"} !important}\n${days}\n`;
  }

  globalThis.GitHubReskin = { THEMES, DEFAULTS, EDITABLE, palette, css, mix, contrast, isHex };
})();
