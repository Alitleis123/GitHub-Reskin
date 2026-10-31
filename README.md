# Better GitHub

GitHub only draws your contribution graph in green, plus whatever it picks for holidays. This draws it in your color, as an SVG you can put in your profile README.

![1,401 contributions in the last year, in amber](example.svg)

It reads the same calendar GitHub uses, through the GraphQL API, so the busy days and quiet days shade the same way they do on your profile. You pick the color for the busiest days. Quieter days get fainter mixes of it, blended toward the background.

## Add it to your profile

Your profile repo is the one named after you, like `you/you`. Add `.github/workflows/contributions.yml`:

```yaml
name: Contribution graph

on:
  schedule:
    - cron: "17 6 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: sidebandstudio/Better-GitHub@v1
        with:
          output: assets/contributions.svg
          color: "#f2a93b"

      - name: Commit if changed
        run: |
          git add assets/contributions.svg
          if git diff --cached --quiet; then exit 0; fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git commit -m "Refresh contribution graph [skip ci]"
          git pull --rebase
          git push
```

Run it once from the Actions tab, then put this in your README:

```html
<img src="assets/contributions.svg" alt="My GitHub contributions over the last year" width="100%">
```

It redraws every morning. GitHub still shows its own graph under your README, since there's no setting to hide it.

## Options

| Input | Default | What it does |
| --- | --- | --- |
| `username` | owner of the repo | Whose graph to draw. Set this when the repo belongs to an organization. |
| `color` | `#f2a93b` | Color of the busiest days |
| `background` | `#0a0a0b` | Panel color |
| `text` | `#ededea` | Text color. Empty days and labels are mixed from it. |
| `output` | `contributions.svg` | Where the SVG goes |
| `token` | the workflow token | Token for the GraphQL API |

Colors are 6-digit hex.

Private contributions show up as counts only if you turned on "Include private contributions on my profile" in your GitHub settings, same as the real graph.

## Run it on your computer

Needs Node 20 or newer and a GitHub token. With the GitHub CLI:

```sh
GITHUB_TOKEN=$(gh auth token) node index.mjs --username you --color "#7c5cff" --output contributions.svg
```

`node --test` runs the tests.

## License

MIT
