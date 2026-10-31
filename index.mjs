#!/usr/bin/env node
// Draws a GitHub contribution graph as an SVG in any color.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date weekday contributionLevel } }
      }
    }
  }
}`;

const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FONT = `Geist, 'Geist Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
const CELL = 12;
const GAP = 3;
const PAD = 24;

export async function fetchCalendar(username, token) {
  const res = await fetch(process.env.GITHUB_GRAPHQL_URL || "https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "better-github",
    },
    body: JSON.stringify({ query: QUERY, variables: { login: username } }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) {
    throw new Error(`GitHub API ${res.status}: ${JSON.stringify(body.errors ?? body.message)}`);
  }
  if (!body.data.user) throw new Error(`No GitHub user named ${username}`);
  return body.data.user.contributionsCollection.contributionCalendar;
}

function rgb(color) {
  const match = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) throw new Error(`Colors must be 6-digit hex, like #f2a93b. Got: ${color}`);
  const n = parseInt(match[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

// Moves color a toward color b. t = 0 gives a, t = 1 gives b.
export function mix(a, b, t) {
  const [x, y] = [rgb(a), rgb(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export function render(calendar, { color = "#f2a93b", background = "#0a0a0b", text = "#ededea" } = {}) {
  const shades = [mix(background, text, 0.08), ...[0.35, 0.55, 0.78, 1].map((t) => mix(background, color, t))];
  const muted = mix(background, text, 0.55);
  const { weeks, totalContributions } = calendar;
  const step = CELL + GAP;
  const left = PAD + 32;
  const top = 72;
  const gridRight = left + weeks.length * step - GAP;
  const gridBottom = top + 7 * step - GAP;
  const width = gridRight + PAD;
  const height = gridBottom + 48;
  const cell = (x, y, level) =>
    `<rect class="day" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${shades[level]}"/>`;

  const days = weeks.flatMap((week, col) =>
    week.contributionDays.map((day) =>
      cell(left + col * step, top + day.weekday * step, Math.max(0, LEVELS.indexOf(day.contributionLevel))),
    ),
  );

  // Label each column where a new month starts. Drop a label that would crowd the next one.
  const starts = [];
  weeks.forEach((week, col) => {
    const month = Number(week.contributionDays[0].date.slice(5, 7)) - 1;
    if (starts.at(-1)?.month !== month) starts.push({ col, month });
  });
  const months = starts
    .filter((start, i) => !starts[i + 1] || starts[i + 1].col - start.col >= 3)
    .map(({ col, month }) => `<text x="${left + col * step}" y="${top - 10}">${MONTHS[month]}</text>`);

  const weekdays = [
    [1, "Mon"],
    [3, "Wed"],
    [5, "Fri"],
  ].map(([row, name]) => `<text x="${PAD}" y="${top + row * step + CELL - 2}">${name}</text>`);

  const legendY = gridBottom + 18;
  const legendX = gridRight - 30 - 5 * step;
  const legend = shades.map((_, level) => cell(legendX + level * step, legendY, level));

  const total = totalContributions.toLocaleString("en-US");
  const summary = `${total} contribution${totalContributions === 1 ? "" : "s"} in the last year`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title">
<title id="title">${summary}</title>
<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="12" fill="${background}" stroke="${mix(background, color, 0.22)}"/>
<text x="${PAD}" y="${PAD + 14}" fill="${text}" font-family="${FONT}" font-size="14" font-weight="500">${summary}</text>
<g fill="${muted}" font-family="${FONT}" font-size="11">
${months.join("\n")}
${weekdays.join("\n")}
<text x="${legendX - 6}" y="${legendY + CELL - 2}" text-anchor="end">Less</text>
<text x="${gridRight}" y="${legendY + CELL - 2}" text-anchor="end">More</text>
</g>
${days.join("\n")}
${legend.join("\n")}
</svg>
`;
}

async function main() {
  const { values } = parseArgs({
    options: Object.fromEntries(
      ["username", "token", "color", "background", "text", "output"].map((name) => [name, { type: "string" }]),
    ),
  });
  // Flags win, then GitHub Action inputs.
  const option = (name) => values[name] || process.env[`INPUT_${name.toUpperCase()}`] || undefined;
  const username = option("username");
  const token = option("token") || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const output = option("output") || "contributions.svg";
  if (!username) throw new Error("Pass --username");
  if (!token) throw new Error("Set GITHUB_TOKEN or pass --token");

  const calendar = await fetchCalendar(username, token);
  const svg = render(calendar, {
    color: option("color"),
    background: option("background"),
    text: option("text"),
  });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, svg);
  console.log(`Wrote ${output} for ${username}: ${calendar.totalContributions} contributions`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
