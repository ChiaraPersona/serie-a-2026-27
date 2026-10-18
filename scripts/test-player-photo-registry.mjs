import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createVerifier,validateThumbnailBinding}=require('./player-photo-verification.cjs');
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
 if(a.evidence.bytes.type==='ORIGINAL_SHA1')assert.equal(crypto.createHash('sha1').update(bytes).digest('hex'),page.imageinfo[0].sha1);
 else{
  assert.equal(a.evidence.bytes.type,'WIKIMEDIA_THUMBNAIL_ETAG');
  const records=JSON.parse(fs.readFileSync(new URL('../reports/player-photos/recovery/thumbnail-binding.json',import.meta.url))).results;
  const record=records.find(r=>r.localPath===e.localPath&&r.localSha256===a.sha256);
  assert(record);const head=record.attempts[record.verifiedAttempt];
  assert.equal(head.etag.replace(/^"|"$/g,''),crypto.createHash('md5').update(bytes).digest('hex'));assert.equal(head.contentLength,bytes.length);
  assert(validateThumbnailBinding(bytes,record,page.imageinfo[0],page));
  const bad=structuredClone(record);bad.attempts[bad.verifiedAttempt].etag='W/"'+head.etag+'"';assert(!validateThumbnailBinding(bytes,bad,page.imageinfo[0],page),'weak ETag must fail');
  const foreign=structuredClone(record);foreign.attempts[foreign.verifiedAttempt].finalUrl='https://example.com/photo.jpg';assert(!validateThumbnailBinding(bytes,foreign,page.imageinfo[0],page),'foreign host must fail');
  const changed=Buffer.from(bytes);changed[changed.length-1]^=1;assert(!validateThumbnailBinding(changed,record,page.imageinfo[0],page),'modified local bytes must fail');
  assert(!validateThumbnailBinding(bytes,record,{...page.imageinfo[0],sha1:'wrong-source'},page),'wrong original must fail');
 }
 const markup=playerPhoto(registry,e.playerId);
 assert(markup.includes(e.attribution.licenseUrl));assert(markup.includes('data-required-attribution'));
 assert(audit.images.some(i=>i.playerId===e.playerId&&i.review.status==='VERIFIED'&&i.currentRoster));
}
for(const i of audit.images.filter(i=>!i.currentRoster&&i.playerId))assert(!published.some(e=>e.localPath===i.localPath));
const missingLicense={...published[0],attribution:{...published[0].attribution,licenseUrl:null}};
assert(playerPhoto({entries:[missingLicense]},missingLicense.playerId).includes('player-placeholder.png'));
console.log('PASS: every published photo has original or thumbnail digest evidence, complete linked attribution; historical photos stay unpublished');

const baseline=JSON.parse(fs.readFileSync(new URL('../reports/player-photos/recovery/baseline-audit.json',import.meta.url)));
for(const i of baseline.images)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+i.localPath,import.meta.url))).digest('hex'),i.sha256,'previous photo must be preserved');
const replaced=JSON.parse(fs.readFileSync(new URL('../reports/player-photos/recovery/replacements.json',import.meta.url))).entries;
for(const r of replaced){assert.notEqual(r.localPath,r.previousPath);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+r.localPath,import.meta.url))).digest('hex'),r.sha256);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+r.previousPath,import.meta.url))).digest('hex'),r.previousSha256)}
assert.equal(new Set(published.map(e=>e.playerId)).size,published.length);
assert(published.some(e=>e.playerId==='jhon-lucumi'));
assert(!published.some(e=>['pietro-terracciano','alex-valle'].includes(e.playerId)));
console.log('PASS: all previous images preserved, replacements logged, forged or mutated thumbnail evidence rejected, recovered ID verified');
