import {championsKit} from './champions-kits.mjs?v=20261022-assets-v1';
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

export function renderLineupKit(team, { goalkeeper = false, shirtNumber = null, competition = null } = {}) {
  if (goalkeeper) {
    const number=Number.isInteger(shirtNumber)&&shirtNumber>=1&&shirtNumber<=99?`<text x="24" y="34" text-anchor="middle" fill="#111" style="font:700 15px sans-serif">${shirtNumber}</text>`:'';
    return `<svg class="reading-kit-shirt" data-kit-pattern="solid" data-goalkeeper-kit viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="${silhouette}" style="fill:#ffdf00;stroke:none"/>${number}</svg>`;
  }
  const champions = competition === "champions" ? championsKit(team) : null;
  if(champions)return renderChampionsKit(champions,shirtNumber);
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
  const number=Number.isInteger(shirtNumber)&&shirtNumber>=1&&shirtNumber<=99?`<text x="24" y="34" text-anchor="middle" fill="#fff" stroke="#10201c" stroke-width="2" paint-order="stroke" style="font:700 15px sans-serif">${shirtNumber}</text>`:'';
  return `<svg class="reading-kit-shirt" data-kit-pattern="${kit.pattern}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"${colors}>${definition}<path class="kit-body" d="${silhouette}"${fill}/>${panel}<path class="kit-trim" d="M18 6Q24 17 30 6M2 21 10 25M38 25 46 21"/>${number}</svg>`;
}

function renderChampionsKit(kit,shirtNumber){
 const id=`lineup-kit-${++sequence}`,p=kit.primary,s=kit.secondary;
 let decoration='';
 if(kit.pattern==='vertical')for(let x=6;x<48;x+=12)decoration+=`<rect x="${x}" width="6" height="48" fill="${s}"/>`;
 if(kit.pattern==='horizontal')for(let y=6;y<48;y+=12)decoration+=`<rect y="${y}" width="48" height="6" fill="${s}"/>`;
 if(kit.pattern==='halves')decoration=`<rect x="24" width="24" height="48" fill="${s}"/>`;
 if(kit.pattern==='center')decoration=`<rect x="20" width="8" height="48" fill="${s}"/>`;
 if(kit.pattern==='chest')decoration=`<rect y="21" width="48" height="7" fill="${s}"/>`;
 if(kit.pattern==='sleeves')decoration=`<path d="M0 0H13V28H0ZM35 0H48V28H35Z" fill="${s}"/>`;
 const light=(color)=>{const c=color.slice(1);return .2126*parseInt(c.slice(0,2),16)+.7152*parseInt(c.slice(2,4),16)+.0722*parseInt(c.slice(4,6),16)>155};
 const ink=light(p)?'#111111':'#FFFFFF',outline=light(p)?'#FFFFFF':'#111111';
 const number=Number.isInteger(shirtNumber)&&shirtNumber>=1&&shirtNumber<=99?`<text x="24" y="34" text-anchor="middle" fill="${ink}" stroke="${outline}" stroke-width="2" paint-order="stroke" style="font:700 15px sans-serif">${shirtNumber}</text>`:`<text x="24" y="34" text-anchor="middle" fill="${ink}" stroke="${outline}" stroke-width="2" paint-order="stroke" style="font:700 15px sans-serif">—</text>`;
 return `<svg class="reading-kit-shirt" data-champions-kit="${kit.id}" data-kit-pattern="${kit.pattern}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><defs><clipPath id="${id}"><path d="${silhouette}"/></clipPath></defs><g clip-path="url(#${id})"><path d="${silhouette}" fill="${p}"/>${decoration}<path d="M18 6Q24 17 30 6M2 21 10 25M38 25 46 21" fill="none" stroke="${s}" stroke-width="2"/></g><path d="${silhouette}" fill="none" stroke="#d4d4d4" stroke-width="1"/>${number}</svg>`;
}
