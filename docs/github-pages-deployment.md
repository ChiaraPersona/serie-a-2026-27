# GitHub Pages

Pages uses `.github/workflows/pages.yml` and the repository setting `build_type: workflow`.
Pushes to `main` package the already committed site; the workflow does not regenerate sports data or forecasts.

`node scripts/package-pages.cjs --check` computes the package size without writing files.
`node scripts/test-package-pages.cjs` checks the size budget, runtime data and local HTML dependencies.
`node scripts/package-pages.cjs` copies the public site into a new `output/pages-site/` directory.
It refuses to overwrite an existing destination. This generated directory is ignored by Git.
`node scripts/check-pages-package-browser.cjs` tests this isolated package on desktop and mobile with the local Edge/Playwright runtime.

The package retains HTML, assets, browser scripts, team data, normalized public datasets,
generated projections, source datasets consumed by the browser, Champions derived data and forecast snapshots.
It excludes reports, operational output, raw archives, analysis datasets and bookmaker ingestion files.
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
