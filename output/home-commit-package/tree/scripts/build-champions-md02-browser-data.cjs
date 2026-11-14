'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourcePath = 'data/normalized/champions-md02-integration-2026-27.json';
const outputPath = 'data/normalized/champions-md02-ui-2026-27.json';

// Presentation projection only. The complete integration remains the input for
// builders, identity resolution, quotes, settlement and technical audits.
function project(source) {
  if (source.competition !== 'UEFA Champions League' || source.season !== '2026-27' || source.matchday !== 2 ||
      source.fixtures?.length !== 18 || new Set(source.fixtures.map(f => f.fixtureId)).size !== 18 ||
      source.fixtures.some(f => !/^ucl-2026-27-md02-\d{2}$/.test(f.fixtureId) || !f.lineups || !f.availability)) {
    throw new Error('Integrazione Champions MD2 incompleta o fuori ambito');
  }
  return {
    schemaVersion: 1,
    competition: source.competition,
    season: source.season,
    matchday: source.matchday,
    generatedAt: source.generatedAt,
    fixtures: source.fixtures.map(({fixtureId, lineups, availability}) => ({fixtureId, lineups, availability}))
  };
}

function build() {
  const source = JSON.parse(fs.readFileSync(path.join(root, sourcePath), 'utf8'));
  const content = JSON.stringify(project(source)) + '\n';
  const output = path.join(root, outputPath);
  // No timestamps or forecast recalculation: repeated builds are byte-identical.
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== content) fs.writeFileSync(output, content);
  return {sourcePath, outputPath, bytes: Buffer.byteLength(content)};
}

module.exports = {project, build, sourcePath, outputPath};
if (require.main === module) console.log(JSON.stringify(build()));
