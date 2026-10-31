import assert from "node:assert/strict";
import test from "node:test";
import { mix, render } from "./index.mjs";

const day = (date, weekday, contributionLevel) => ({ date, weekday, contributionLevel });

test("draws one cell per day in its level's shade", () => {
  const calendar = {
    totalContributions: 1234,
    weeks: [
      { contributionDays: [day("2026-01-03", 6, "NONE")] },
      { contributionDays: [day("2026-01-04", 0, "FOURTH_QUARTILE"), day("2026-01-05", 1, "FIRST_QUARTILE")] },
    ],
  };
  const svg = render(calendar, { color: "#ff0000", background: "#000000", text: "#ffffff" });
  assert.match(svg, /1,234 contributions in the last year/);
  // 3 days plus 5 legend cells.
  assert.equal(svg.match(/class="day"/g).length, 8);
  assert.match(svg, /y="72" width="12" height="12" rx="2.5" fill="#ff0000"/);
  assert.match(svg, /y="87" width="12" height="12" rx="2.5" fill="#590000"/);
});

test("says contribution for a single one", () => {
  const svg = render({ totalContributions: 1, weeks: [{ contributionDays: [day("2026-01-04", 0, "FIRST_QUARTILE")] }] });
  assert.match(svg, />1 contribution in the last year</);
});

test("mix blends hex colors", () => {
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(mix("#0a0a0b", "#f2a93b", 1), "#f2a93b");
  assert.throws(() => mix("red", "#ffffff", 0.5), /6-digit hex/);
});
