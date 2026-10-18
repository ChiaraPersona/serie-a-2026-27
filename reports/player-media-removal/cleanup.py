import pathlib,json,re,hashlib
r=pathlib.Path('.')
out=r/'reports/player-media-removal'
keys={'photo','photoAttribution','remotePhotoSource','remoteImage','photoUrl','headshot','headshots'}
def clean(v):
 if isinstance(v,dict): return {k:clean(x) for k,x in v.items() if k not in keys and not(k=='photoAttribution')}
 if isinstance(v,list): return [clean(x) for x in v if not(isinstance(x,dict) and x.get('provider')=='Wikimedia Commons' and ('foto' in x.get('scope','').lower()))]
 return v
def digest(v): return hashlib.sha256(json.dumps(v,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
plan=json.loads((out/'deletion-targets.json').read_text())
excluded=set(plan['files'])
baseline={}; changed=[]
for p in (r/'data').rglob('*.json'):
 rel=p.as_posix()
 if rel in excluded: continue
 try: raw=p.read_text(encoding='utf-8-sig'); obj=json.loads(raw)
 except Exception: continue
 new=clean(obj); baseline[rel]=digest(new)
 if new!=obj:
  p.write_text(json.dumps(new,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');changed.append(rel)
(out/'data-baseline.json').write_text(json.dumps(baseline,indent=2))
(out/'data-fields-cleaned.json').write_text(json.dumps(changed,indent=2))
def edit(path,fn):
 p=r/path;s=p.read_text(encoding='utf-8-sig');p.write_text(fn(s),encoding='utf-8',newline='\n')
edit('js/pages/teams.js',lambda s: re.sub(r'^import .*player-photo.*\n','',s).replace('let directory,photos={entries:[]};','let directory;').replace('${playerPhoto(photos,player.id,{compact:true})}','').replace('${playerPhoto(photos,player.id)}','').replace('player-photo-details','player-comparison-details').replace('    if(page==="player-stats")photos=await loadPlayerPhotos();\n','').replace('    installPhotoFallback(document.querySelector("#app"));\n',''))
edit('js/team-squads.js',lambda s: re.sub(r'  const \{loadPlayerPhotos.*?  const defaultPlayerPhoto[^\n]*\n','',s,flags=re.S).replace('${avatar}','').replace('${portrait}','').replace('${playerPhoto(photoRegistry,player.id)}','').replace('      const avatar = playerPhoto(photoRegistry,player.id,{compact:true});\n','').replace('    const portrait = playerPhoto(photoRegistry,player.id);\n','') if False else s)
# Explicit bounded blocks preserve the surrounding roster code.
edit('js/team-squads.js',lambda s: re.sub(r'  const \{loadPlayerPhotos[^\n]*\n  const photoRegistry[^\n]*\n  installPhotoFallback[^\n]*\n  const defaultPlayerPhoto[^\n]*\n','',s))
edit('js/team-squads.js',lambda s: re.sub(r'  root.addEventListener\("error", event => \{.*?  \}, true\);\n','',s,flags=re.S).replace('${avatar}','').replace('${portrait}','').replace('${playerPhoto(photoRegistry,player.id)}','').replace('      const avatar = playerPhoto(photoRegistry,player.id,{compact:true});\n','').replace('    const portrait = playerPhoto(photoRegistry,player.id);\n',''))
for name in ['css/players.css','css/components.css','css/responsive.css']:
 edit(name,lambda s: re.sub(r'[^{}\n]*\.(?:player-portrait[\w-]*|mini-avatar)[^{}]*\{[^{}]*\}','',s))
edit('css/player-statistics.css',lambda s: re.sub(r'[^{}\n]*\.player-(?:photo[\w-]*|neutral-avatar)[^{}]*\{[^{}]*\}','',s).replace('grid-template-columns:80px minmax(0,1fr)','grid-template-columns:minmax(0,1fr)').replace('grid-template-columns:44px minmax(0,1fr)','grid-template-columns:minmax(0,1fr)').replace('/* Shared approved portraits; attribution is a legally required credit. */',''))
# Preserve canonical identifiers without a dependency on the former media registry.
edit('scripts/team-pages/build.js',lambda s: re.sub(r'const wikimediaPhotosFile[^\n]*\nconst wikimediaPhotos[^\n]*\nconst wikimediaPhotoByPlayer[^\n]*\n','const existingPlayerIds = new Map(fs.readdirSync(path.join(root,"data/teams")).filter(name=>name.endsWith(".json")).flatMap(name=>{const team=JSON.parse(fs.readFileSync(path.join(root,"data/teams",name),"utf8"));return (team.squad||[]).map(player=>[`${team.id}:${player.id}`,player.providerIds||{}]);}));\n',s).replace('wikidata: wikimediaPhoto?.wikidataId || null','wikidata: player.providerIds?.wikidata || existingPlayerIds.get(`${team.id}:${player.id}`)?.wikidata || null'))
edit('scripts/team-pages/build.js',lambda s: re.sub(r'    const wikimediaPhoto =.*?    return \{','    return {',s,flags=re.S))
edit('scripts/team-pages/build.js',lambda s: re.sub(r'      photo: wikimediaPhoto.*?      sources:', '      sources:',s,flags=re.S).replace(',\n        ...(photoSource ? [photoSource] : [])',''))
edit('scripts/team-pages/build.js',lambda s: '\n'.join(line for line in s.split('\n') if '...(wikimediaPhotos.retrievedAt' not in line).replace('photoAttribution: { anyOf: [{ type: "null" }, { type: "object", required: ["provider", "pageUrl", "artist", "license"] }] }, ',''))
edit('scripts/team-pages/import-milan.js',lambda s: re.sub(r'  const og =[^\n]*\n','',s).replace(',\n    remoteImage: og','').replace(', remoteImage: null',''))
edit('scripts/team-pages/import-milan.js',lambda s: re.sub(r'async function downloadPhoto\(.*?\n}\n','',s,flags=re.S))
edit('scripts/team-pages/import-milan.js',lambda s: '\n'.join(line for line in s.split('\n') if 'const photo = await downloadPhoto' not in line and 'const remotePhotoSource =' not in line).replace('photo: photo || seed.photo || p.remoteImage || remotePhotoSource, remotePhotoSource, ',''))
edit('scripts/team-pages/import-completed-teams.js',lambda s: re.sub(r'    const photoUrl =[^\n]*\n','',s).replace('photo: photoUrl, remotePhotoSource: photoUrl, ',''))
edit('package.json',lambda s: '\n'.join(line for line in s.split('\n') if 'import:wikimedia-photos' not in line))
edit('scripts/team-pages/test-all-teams.js',lambda s: re.sub(r'const wikimediaPhotos =[^\n]*\nconst wikimediaPhotoByPlayer[^\n]*\n','',s))
edit('scripts/team-pages/test-all-teams.js',lambda s: re.sub(r'    const wikimediaPhoto =.*?    if \(player.previousSeason.entries.length\)','    if (player.previousSeason.entries.length)',s,flags=re.S))
edit('scripts/team-pages/test-all-teams.js',lambda s: '\n'.join(line for line in s.split('\n') if 'assert.strictEqual(wikimediaPhotos.summary' not in line))
edit('scripts/check-player-statistics-browser.cjs',lambda s: s.replace("assert.equal(await page.locator('.player-comparator-head [data-registry-photo]').count(),2);", "assert.equal(await page.locator('.global-leader-player img,.player-comparator-head article img:not(.player-team-badge)').count(),0);").replace("assert.equal(await page.locator('.global-player-table [data-registry-photo]').count(),data.periods['2026/27'].rankings.goals.availablePlayers);",''))
edit('scripts/test-team-editorial-browser.cjs',lambda s: re.sub(r"el\?\.querySelectorAll\('img\[data-player-photo\]'\)\.forEach\(img=>\{.*?\}\);",'',s))
edit('scripts/build-site.js',lambda s:s.replace('20261018-approved-photos-v1','20261018-no-player-media-v1').replace('20261018-player-stats-v3','20261018-player-stats-v4'))
print('Cleaned data files:',len(changed),'baseline:',len(baseline))
