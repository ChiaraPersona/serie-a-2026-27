import {renderLineupKit} from "./lineup-kit.mjs";

const esc = value => String(value ?? "").replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));

// Rotate tactical lines into columns; mirror the visitors toward the left goal.
// Source arrays remain untouched, including the order within every tactical line.
export function lineupPositions(lineup, away = false) {
  const units = [1, ...lineup.formation.split("-").map(Number)];
  let offset = 0;
  return units.flatMap((count, line) => {
    const depth = 6 + line * 38 / (units.length - 1);
    const players = lineup.players.slice(offset, offset + count);
    offset += count;
    return players.map((name, index) => ({
      name, goalkeeper: line === 0, line,
      x: away ? 100 - depth : depth,
      y: 12 + 76 * (away ? (index + .5) / count : 1 - (index + .5) / count)
    }));
  });
}

export function renderLineupField(sides, { orientation = "horizontal", shirtNumberFor = () => null } = {}) {
  if (orientation === "vertical") {
    const {team, lineup} = sides[0];
    const [primary = "#174fa5", secondary = "#081d48"] = team.colors || [];
    const positions = lineupPositions(lineup);
    const players = positions.map(player => {
      const x = 4 + (player.y - 12) * 92 / 76;
      const y = 90 - (player.x - 6) * 80 / 38;
      const count = positions.filter(item => item.line === player.line).length;
      return `<div class="reading-kit-player${player.goalkeeper ? " is-goalkeeper" : ""}" data-tactical-line="${player.line}" style="left:${x}%;top:${y}%;width:${92 / count}%">${renderLineupKit(team, {goalkeeper: player.goalkeeper,shirtNumber:shirtNumberFor(player.name)})}<strong title="${esc(player.name)}">${esc(player.name)}</strong></div>`;
    }).join("");
    return `<div class="team-vertical-field" data-orientation="vertical" aria-label="${esc(team.name)} · ${esc(lineup.formation)}" style="--reading-lineup-primary:${esc(primary)};--reading-lineup-secondary:${esc(secondary)}"><svg class="reading-field-markings" viewBox="0 0 600 900" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><rect x="14" y="14" width="572" height="872" rx="4"/><path d="M14 450H586"/><circle cx="300" cy="450" r="70"/><circle cx="300" cy="450" r="2"/><path d="M165 14V145H435V14M235 14V65H365V14M165 886V755H435V886M235 886V835H365V886"/></g></svg>${players}</div>`;
  }
  const heading = sides.map(({team, lineup}) => `<div><span>${esc(team.name)}</span> <strong>${esc(lineup?.formation || "N/D")}</strong></div>`).join("");
  const players = sides.map(({team, lineup}, side) => {
    if (!lineup) return "";
    const [primary = "#174fa5", secondary = "#081d48"] = team.colors || [];
    return `<div class="reading-field-team" data-lineup-side="${side === 0 ? "home" : "away"}" aria-label="${esc(team.name)} · ${esc(lineup.formation)}" style="--reading-lineup-primary:${esc(primary)};--reading-lineup-secondary:${esc(secondary)}">${lineupPositions(lineup, side === 1).map(player => `<div class="reading-kit-player${player.goalkeeper ? " is-goalkeeper" : ""}" data-tactical-line="${player.line}" style="left:${player.x}%;top:${player.y}%">${renderLineupKit(team, {goalkeeper: player.goalkeeper})}<strong title="${esc(player.name)}">${esc(player.name)}</strong></div>`).join("")}</div>`;
  }).join("");
  const coaches = sides.map(({team, lineup}) => {
    const confirmation = lineup?.coachConfirmation ? ` (${esc(lineup.coachConfirmation)})` : "";
    const substitutes = lineup?.status === "official" && lineup.substitutes?.length ? `<p class="reading-lineup-substitutes"><strong>A disposizione:</strong> ${lineup.substitutes.map(esc).join(", ")}</p>` : "";
    return `<div><span>Allenatore: ${esc(lineup?.coach || team.coach || "N/D")}${confirmation}</span>${substitutes}</div>`;
  }).join("");
  return `<div class="reading-dual-lineup"><header>${heading}</header><p class="reading-field-scroll-hint">Scorri il campo in orizzontale per vedere entrambe le squadre ↔</p><div class="reading-field-scroll" tabindex="0" role="region" aria-label="Campo delle formazioni, scorrimento orizzontale"><div class="reading-horizontal-field"><svg class="reading-field-markings" viewBox="0 0 1080 600" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><rect x="16" y="16" width="1048" height="568" rx="4"/><path d="M540 16V584"/><circle cx="540" cy="300" r="70"/><circle cx="540" cy="300" r="2"/><path d="M16 165H160V435H16M1064 165H920V435H1064M16 235H72V365H16M1064 235H1008V365H1064M16 265H3V335H16M1064 265H1077V335H1064"/><circle cx="120" cy="300" r="2"/><circle cx="960" cy="300" r="2"/></g></svg>${players}</div></div><footer>${coaches}</footer></div>`;
}
