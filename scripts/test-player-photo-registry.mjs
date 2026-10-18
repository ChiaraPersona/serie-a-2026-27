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
const entry={playerId:'test',localPath:inventory.images[0].localPath,rightsStatus:'UNVERIFIED',attribution:{text:'Author — License'}};
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
