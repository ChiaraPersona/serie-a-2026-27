import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {playerPhoto} from '../js/components/player-photo.mjs';
const inventory=JSON.parse(fs.readFileSync(new URL('../reports/player-photos/inventory.json',import.meta.url)));
const registry=JSON.parse(fs.readFileSync(new URL('../data/player-photos.json',import.meta.url)));
assert.equal(new Set(registry.entries.map(e=>e.playerId)).size,inventory.summary.databasePlayers);
for(const i of inventory.images){
 const bytes=fs.readFileSync(new URL('../'+i.localPath,import.meta.url));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),i.sha256);
 assert(i.width>0&&i.height>0);
}
const entry={playerId:'test',localPath:inventory.images[0].localPath,rightsStatus:'UNVERIFIED',attribution:{text:'Author — CC BY 4.0',artist:'Author',url:'https://commons.wikimedia.org/wiki/File:Example.jpg',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'}};
assert(playerPhoto({entries:[entry]},'test').includes('player-placeholder.png'));
entry.rightsStatus='VERIFIED';
assert(playerPhoto({entries:[entry]},'test').includes(entry.localPath));
assert(playerPhoto({entries:[entry]},'test').includes('data-required-attribution'));
entry.localPath='https://example.com/portrait.jpg';
assert(playerPhoto({entries:[entry]},'test').includes('player-placeholder.png'));
entry.localPath='assets/images/players/../portrait.jpg';
assert(playerPhoto({entries:[entry]},'test').includes('player-placeholder.png'));
assert(playerPhoto(registry,'missing-id').includes('player-placeholder.png'));
console.log('PASS: ID uniqueness, image hashes/dimensions, rights gate, attribution, local paths, fallback');

const audit=JSON.parse(fs.readFileSync(new URL('../reports/player-photos/rights-audit.json',import.meta.url)));
const approvals=JSON.parse(fs.readFileSync(new URL('../data/sources/team-pages/player-photo-approvals.json',import.meta.url)));
const live=JSON.parse(fs.readFileSync(new URL('../reports/player-photos/live-metadata.json',import.meta.url)));
const published=registry.entries.filter(e=>e.rightsStatus==='VERIFIED');
assert.equal(published.length,audit.summary.publishableCurrentPhotos);
for(const e of published){
 const a=approvals.entries.find(a=>a.playerId===e.playerId&&a.localPath===e.localPath);
 const bytes=fs.readFileSync(new URL('../'+e.localPath,import.meta.url));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);
 const page=live.commons.flatMap(b=>Object.values(b.payload.query.pages)).find(p=>p.pageid===a.evidence.commonsPageId);
 assert.equal(crypto.createHash('sha1').update(bytes).digest('hex'),page.imageinfo[0].sha1);
 const markup=playerPhoto(registry,e.playerId);
 assert(markup.includes(e.attribution.licenseUrl));assert(markup.includes('data-required-attribution'));
 assert(audit.images.some(i=>i.playerId===e.playerId&&i.review.status==='VERIFIED'&&i.currentRoster));
}
for(const i of audit.images.filter(i=>!i.currentRoster&&i.playerId))assert(!published.some(e=>e.playerId===i.playerId));
const missingLicense={...published[0],attribution:{...published[0].attribution,licenseUrl:null}};
assert(playerPhoto({entries:[missingLicense]},missingLicense.playerId).includes('player-placeholder.png'));
console.log('PASS: every published photo has original-file digest evidence, complete linked attribution; historical photos stay unpublished');
