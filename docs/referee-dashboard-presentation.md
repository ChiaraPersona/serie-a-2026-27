# Reading referee dashboard

Presentation-only shared component: `js/pages/reading-detail/referee-dashboard.mjs`.
It consumes existing fixture assignments and `data/generated/reading-referee-history.json`.
No importer, prediction, settlement, odds or statistical source is changed.

## Samples and missing data

The primary indicators use only the existing `analysis.seasonal` averages. The
existing `seasonLabel`, coverage limitations and per-metric n are displayed.
Mixed competitions are explicitly labelled; career and 2025/26 values remain in
a separate historical block and never fill a missing seasonal metric.
League comparisons are omitted because no verified same-period league baseline
is provided by this presentation contract.

Recent rows are sorted descending by date, restricted to dates before the fixture,
and limited to five. Disputed metrics are null for display. Existing analysis
averages are reused; where that analysis is absent, recent averages summarize
only known values in those same visible rows, with n shown. Total cards are never
constructed from an assumed sum when the existing total is unavailable.
Dismissals, direct reds and second yellows remain distinct; split denominators
are displayed, including when their coverage differs from dismissal coverage.
Existing penalty counts are retained as secondary text in the table.

## Indicator scale

Bars represent the seasonal referee value on a zero-based display scale, using
upper bounds of 8 yellow cards, 1 dismissal, 40 fouls and 10 total cards per game.
The upper bound expands to the value if it exceeds the nominal bound, so no value
is clipped. The numeric value and scale are exposed in each bar's accessible label.
These scales are display choices, not league means, thresholds or predictions.
No reference-marker or league average is fabricated. Null values have no filled bar.

## Layout and verification

The 1050px reading container is unchanged. Desktop columns follow 62/38 and 65/35
proportions; tablet stacks the lower section; phones use a 2x2 indicator grid and
a table-only horizontal scroll container. Theme surfaces use existing reading tokens.
The whistle is inline SVG. Team logos reuse existing Italian and Champions branding.
No sources or provenance links are emitted. Source metadata remains in input files.

Checks: `node scripts/test-referee-dashboard.mjs`,
`node scripts/test-referee-md07-analysis.mjs`,
`node scripts/test-css-modules.js`,
`node scripts/check-referee-dashboard.cjs`.
