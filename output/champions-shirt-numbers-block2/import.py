from pathlib import Path
import json,re,unicodedata,gzip,hashlib
out=Path('output/champions-shirt-numbers-block2')
registryPath=Path('data/sources/champions-shirt-numbers-2026-27.json');registry=json.loads(registryPath.read_text(encoding='utf-8'));dbPath=Path('data/normalized/champions-registered-squads-2026-27.json');db=json.loads(dbPath.read_text(encoding='utf-8'));md3Path=Path('data/sources/champions-md03-squads-2026-27.json');md3=json.loads(md3Path.read_text(encoding='utf-8'))
for name,path in [('registry.before.json.gz',registryPath),('database.before.json.gz',dbPath)]:
 with gzip.open(out/name,'wb') as f:f.write(path.read_bytes())
protected=[p for p in Path('data/normalized').glob('*.json') if p!=dbPath]+[md3Path,Path('data/sources/champions-probable-formations-md03-2026-27.json'),Path('js/components/lineup-kit.mjs'),Path('js/components/champions-kits.mjs'),Path('css/reading-detail.css')]
(out/'protected-hashes.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in protected},indent=2),encoding='utf-8')
text=Path(r'C:\Users\utente\.codex\attachments\aa03328d-078a-4c3b-adbf-fc34488e1c84\Testo incollato.txt').read_text(encoding='utf-8')
sections=re.split(r'^## \d+\. .+$',text,flags=re.M)[1:9]
ids=['liverpool','arsenal','paris-saint-germain','inter','napoli','manchester-united','atletico-de-madrid','borussia-dortmund']
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
manual={('liverpool',norm('Joshua Sonni-Lambie')):'josh-sonni-lambie',('arsenal',norm('Gabriel Magalhães')):'gabriel',('paris-saint-germain',norm('Matvey Safonov')):'matvei-safonov'}
new=[];unmatched=[];conflicts=[]
for tid,section in zip(ids,sections):
 team=next(t for t in md3['teams'] if t['teamId']==tid);registered=next(t for t in db['teams'] if t['id']==tid)
 for number,name in re.findall(r'^(\d{1,2}) (.+)$',section,re.M):
  n=int(number);key=norm(name);pid=manual.get((tid,key));hits=[p for p in team['players'] if p['playerId']==pid] if pid else [p for p in team['players'] if key in {norm(p.get(k,'')) for k in ['canonicalName','sourceName','displayName']}]
  if len(hits)!=1:
   unmatched.append(dict(block=2,teamId=tid,submittedPlayer=name,shirtNumber=n,status='not-in-current-database' if not hits else 'ambiguous-identity'));continue
  p=hits[0];names=list(dict.fromkeys([p.get(k) for k in ['canonicalName','sourceName','displayName'] if p.get(k)]+[name]));prior=[q for q in registered['players'] if q['id']==p['playerId'] or norm(q['name']) in {norm(s) for s in names}];assert len(prior)<=1
  existing=set(x for x in [p.get('shirtNumber')]+[q.get('shirtNumber') for q in prior] if x is not None)
  status='conflict' if existing and existing!={n} else 'accepted'
  record=dict(block=2,teamId=tid,uefaClubId=registered['uefaClubId'],playerId=p['playerId'],stablePlayerId=p['stablePlayerId'],canonicalName=p['canonicalName'],aliases=names,shirtNumber=n,existingConfirmedNumber=p.get('shirtNumber'),status=status)
  if prior and prior[0]['id']!=p['playerId']:record['playerIdAliases']=[prior[0]['id']]
  new.append(record)
  if status=='conflict':conflicts.append(record)
registry['importedBlocks']=[1,2];registry['scope']+=ids;registry['records']+=new;registry['unmatched']+=unmatched
registry['missingSubmittedNumbers']=[{'block':2,'teamId':'inter','playerId':p['playerId'],'canonicalName':p['canonicalName'],'action':'no-number-imported-existing-MD3-number-preserved'} for p in next(t for t in md3['teams'] if t['teamId']=='inter')['players'] if p['playerId'] in ['aleksandar-stankovic','pio-esposito']]
registry['withheldNumbers']=[{'block':2,'teamId':'borussia-dortmund','playerId':'emre-can','shirtNumber':None,'reason':'No Champions number provided; do not import Bundesliga number 23'}]
assert len({r['stablePlayerId'] for r in registry['records']})==len(registry['records'])
registryPath.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
result={'teams':{tid:{'accepted':sum(r['teamId']==tid and r['status']=='accepted' for r in new),'unmatched':[r for r in unmatched if r['teamId']==tid],'conflicts':[r for r in conflicts if r['teamId']==tid]} for tid in ids},'totalAccepted':sum(r['status']=='accepted' for r in new),'unmatched':unmatched,'conflicts':conflicts}
(out/'reconciliation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(result,ensure_ascii=True))
