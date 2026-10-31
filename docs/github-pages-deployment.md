# GitHub Pages

Pages uses `.github/workflows/pages.yml` and the repository setting `build_type: workflow`.
Pushes to `main` package the already committed site; the workflow does not regenerate sports data or forecasts.

`node scripts/package-pages.cjs --check` computes the package size without writing files.
`node scripts/test-package-pages.cjs` checks the size budget, runtime data and local HTML dependencies.
`node scripts/package-pages.cjs` copies the public site into a new `output/pages-site/` directory.
JSON is compacted in that deploy copy only; canonical repository files remain untouched.
The size plan measures the actual compact representation and reports source size, saved
bytes and remaining budget. `node scripts/test-package-pages.cjs --site output/pages-site`
compares every published JSON value with its original and checks every other file byte for byte.
It refuses to overwrite an existing destination. This generated directory is ignored by Git.
`node scripts/check-pages-package-browser.cjs` tests this isolated package on desktop and mobile with the local Edge/Playwright runtime.

The package retains HTML, assets, browser scripts, team data, normalized public datasets,
generated projections, source datasets consumed by the browser, Champions derived data and forecast snapshots.
It excludes reports, operational output, raw archives, analysis datasets and bookmaker ingestion files.
It also excludes `data/normalized/referee-history/` and research-only prediction directories
(`champions-event-snapshots`, `exact-score-research`, `player-spatial-prospective`,
`player-spatial-v2-prospective`, `spatial-prospective`). Browser verification snapshots
under `data/predictions/snapshots/` and generated referee projections remain included.
Those files remain versioned in the repository. Nothing in the publication step changes their contents.
The package budget is 950,000,000 bytes, below the 1 GB published-site limit.

## Incident, 29 October 2026

Run https://github.com/ChiaraPersona/serie-a-2026-27/actions/runs/40907744377 built successfully,
but deploy job 123569924207 reported an uploaded artifact of 2,070,431,202 bytes,
warned that it exceeded the 1 GB limit, remained in `syncing_files`, and timed out after ten minutes.
The legacy Pages configuration published the repository root, including internal output and reports.
The tracked tree measured 6,282,410,143 bytes; the dedicated package measured 905,527,564 bytes.

Reference: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
Workflow configuration: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Incident, 31 October 2026

Run https://github.com/ChiaraPersona/serie-a-2026-27/actions/runs/41192689314 failed
in the build size check: 1,003,135,485 bytes exceeded the 950,000,000-byte budget.
The MD10 update added research freezes that the broad prediction-directory inclusion
also packaged for Pages. Research freezes and the full referee archive have no browser
consumers; excluding them reduces the local package to 898,294,350 bytes while retaining
all published forecasts and runtime verification snapshots. The package test now rejects
those internal paths. No sports data, forecast, settlement or source archive is deleted.

`node scripts/check-pages-package-browser.cjs output/<new-package-directory>` can verify
a newly built package without replacing the existing local package. The browser checks
include the MD10 Schedina and an MD10 reading on desktop and mobile.

### Additional headroom

Compacting JSON in the deployment copy reduces the same 2,111-file package from
898,294,350 to 641,638,059 bytes (256,656,291 saved), leaving 308,361,941 bytes
under the existing budget. This removes formatting whitespace without removing data,
changing forecast contracts or rewriting archived source files. Snapshot integrity uses
canonical JSON values and remains independent of file indentation.
Future matchdays still grow the package: the existing CI size check remains mandatory.

### Build-only inputs and superseded versions

A second dependency audit excludes eleven exact paths via `internalFiles` in
`scripts/package-pages.cjs`. They comprise the full MD2 integration (the browser uses
`champions-md02-ui-2026-27.json`), the MD3 historical individual intermediate and superseded
seven-fixture v1 catalogs (the browser uses v2), team matchup and shooting-evidence build
inputs, three exploratory prediction previews and two research summaries. Their compact
copies total 97,743,095 bytes. All originals remain tracked and available to builders.

The package is now 2,100 files and 543,894,964 bytes, with 406,105,036 bytes of headroom.
Tests require the active UI/v2 replacements and reject literal browser references to any
excluded filename, so introducing a new consumer requires revisiting the exclusion.
The full output comparison continues to verify all retained JSON values and static assets.
