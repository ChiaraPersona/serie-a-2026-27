// Presentation only. Palette indices refer to the existing team.colors values.
const styles = Object.freeze({
  frosinone: { pattern: "solid", primary: 1 },
  napoli: { pattern: "solid" },
  roma: { pattern: "solid" },
  genoa: { pattern: "halves" },
  udinese: { pattern: "vertical", monochrome: true },
  fiorentina: { pattern: "solid" },
  como: { pattern: "solid" },
  lazio: { pattern: "solid" },
  juventus: { pattern: "vertical", monochrome: true },
  monza: { pattern: "solid" },
  parma: { pattern: "horizontal" },
  torino: { pattern: "solid" }
});

const silhouette = "M15 5 5 10 1 22 10 26 13 20 13 44 35 44 35 20 38 26 47 22 43 10 33 5 29 8 19 8Z";
let sequence = 0;
const hex = (value, fallback) => /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value || "") ? value : fallback;

export function lineupKitStyle(team) {
  const config = styles[team.id] || { pattern: "panel" };
  const [primary, secondary] = team.colors || [];
  return {
    pattern: config.pattern,
    // White is the existing kit-trim white; black comes from the club palette.
    primary: config.monochrome ? "#fff" : hex(team.colors?.[config.primary || 0], "#174fa5"),
    secondary: config.monochrome ? hex(secondary, "#000000") : hex(secondary, "#081d48")
  };
}

export function renderLineupKit(team, { goalkeeper = false } = {}) {
  const kit = goalkeeper ? { pattern: "panel" } : lineupKitStyle(team);
  const id = `lineup-kit-${++sequence}`;
  let definition = "";
  if (["halves", "vertical", "horizontal"].includes(kit.pattern)) {
    const halves = kit.pattern === "halves", horizontal = kit.pattern === "horizontal";
    const width = horizontal || halves ? 48 : 12;
    const height = horizontal ? 12 : 48;
    const band = horizontal ? '<rect width="48" height="6" y="6"' : `<rect width="${halves ? 24 : 6}" height="48" x="${halves ? 24 : 6}"`;
    definition = `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${kit.primary}"/>${band} fill="${kit.secondary}"/></pattern></defs>`;
  }
  const colors = goalkeeper ? "" : ` style="--kit-primary:${kit.primary};--kit-secondary:${kit.secondary}"`;
  const fill = definition ? ` style="fill:url(#${id})"` : "";
  const panel = kit.pattern === "panel" ? '<path class="kit-panel" d="M20 10H28V43H20Z"/>' : "";
  // The pattern fills the silhouette itself, so no part can spill outside it.
  return `<svg class="reading-kit-shirt" data-kit-pattern="${kit.pattern}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"${colors}>${definition}<path class="kit-body" d="${silhouette}"${fill}/>${panel}<path class="kit-trim" d="M18 6Q24 17 30 6M2 21 10 25M38 25 46 21"/></svg>`;
}
