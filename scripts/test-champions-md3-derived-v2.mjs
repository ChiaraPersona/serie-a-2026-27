import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const hash=relative=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex');
const archived=read('data/normalized/champions-md03-probable-individuals-2026-27.json');
const fresh=read('data/derived/champions-md03/probable-individuals-v2-2026-10-20.json');
const derived=read('data/derived/champions-md03/market-catalog-v2-2026-10-20.json');
const frozen=read('data/normalized/schedina-champions-md03.json');
const starterCount=team=>team.players.filter(p=>p.projectedRole==='starter'&&Number.isFinite(p.projectedShots)&&Number.isFinite(p.projectedSOT)).length;
const byTeam=dataset=>new Map(dataset.fixtures.flatMap(f=>f.teams).map(t=>[t.teamId,t]));
const before=byTeam(archived),after=byTeam(fresh);
for(const teamId of ['fenerbahce','bayern-munchen','club-brugge']){
  assert.equal(starterCount(before.get(teamId)),0,`${teamId} archived`);
  assert.equal(starterCount(after.get(teamId)),10,`${teamId} derived`);
}
for(const [teamId,team] of after){
  if(['fenerbahce','bayern-munchen','club-brugge'].includes(teamId))continue;
  assert.equal(starterCount(team),starterCount(before.get(teamId)),`unrelated team ${teamId}`);
}
assert.equal(starterCount(after.get('shakhtar-donetsk')),0);
assert(after.get('shakhtar-donetsk').players.some(p=>p.blockers?.includes('COLLECTIVE_ONLY_TEAM')));
assert.equal(derived.individuals.operationalStarters,260);
assert.equal(derived.individuals.operationalPlayers,459);
assert.equal(derived.individuals.sha256,hash(derived.individuals.path));
assert.equal(derived.frozenInputs.schedinaSha256,hash(derived.frozenInputs.schedina));
assert.equal(derived.frozenInputs.collectiveSha256,hash(derived.frozenInputs.collective));
assert.equal(derived.frozenInputs.oddsSha256,hash(derived.frozenInputs.odds));
assert.equal(derived.matches.length,18);
assert.equal(derived.summary.selected,113);
assert.deepEqual(derived.summary.selectedByMarket,{goals:17,result:17,teamCorners:24,teamSOT:30,teamShots:25});
const original=new Map(frozen.marketCatalog.matches.map(m=>[m.matchId,new Map(m.selections.filter(l=>l.marketScope!=='player').map(l=>[l.selectionId,l]))]));
for(const match of derived.matches){
  for(const leg of match.selections){
    if(leg.marketScope!=='player'){
      const old=original.get(match.matchId).get(leg.selectionId);
      assert(old,`missing archived collective ${leg.selectionId}`);
      assert.equal(leg.odds,old.odds);
      assert.equal(leg.betSelection.evaluation.modelProbabilityPct,old.betSelection.evaluation.modelProbabilityPct);
    }
    if(leg.suggestionAnalysis?.suggested){
      assert.notEqual(leg.selection,'12');
      assert.equal(leg.selectionStatus,'PRELIMINARY');
      assert.equal(leg.qualifiedSelection,false);
      assert.equal(leg.suggestionAnalysis.conservativeExpectedValuePct,null);
      assert(Number.isFinite(leg.betSelection.evaluation.modelProbabilityPct));
      assert.equal(leg.betSelection.identity.status,'VERIFIED_PROVIDER_IDS');
    }
  }
}
const load=name=>Promise.resolve(read(`data/normalized/${name}`));
const workspace=await loadChampionsWorkspaceMd3Derived(load,3);
assert.equal(workspace.derivedVersion,derived.version);
assert.equal(workspace.marketCatalog.matches.length,18);
assert.equal(workspace.all.filter(l=>l.suggestionAnalysis?.suggested).length,113);
assert.deepEqual(workspace.source.marketCatalog.myCombo,frozen.marketCatalog.myCombo);
assert.deepEqual(workspace.source.slips,frozen.slips);
console.log('PASS Champions MD3 derived v2: 30 recovered starters, 18 fixtures, 113 preliminary selections, frozen inputs/MyCombo intact');
