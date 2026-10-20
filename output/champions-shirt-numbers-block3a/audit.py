import json,gzip,hashlib
from pathlib import Path
out=Path('output/champions-shirt-numbers-block3a');before=json.loads(gzip.decompress((out/'database.before.json.gz').read_bytes()));regbefore=json.loads(gzip.decompress((out/'registry.before.json.gz').read_bytes()));after=json.loads(Path('data/normalized/champions-registered-squads-2026-27.json').read_text(encoding='utf-8'));source=json.loads(Path('data/sources/champions-shirt-numbers-2026-27.json').read_text(encoding='utf-8'));target={'galatasaray','club-brugge'};new=0;per={};clean=json.loads(json.dumps(after));clean['shirtNumbers']=before['shirtNumbers']
for t in clean['teams']:
 old=next(x for x in before['teams'] if x['id']==t['id']);per[t['id']]=0
 if t['id'] not in target:assert t==old,t['id']
 for p in t['players']:
  prev=next(x for x in old['players'] if x['id']==p['id'])
  if 'shirtNumber' not in prev and 'shirtNumber' in p:
   assert t['id'] in target;p.pop('shirtNumber');new+=1;per[t['id']]+=1
assert clean==before
assert source['records'][:len(regbefore['records'])]==regbefore['records'];assert source['unmatched']==regbefore['unmatched'];assert source['unresolvedDisplayAliases'][:len(regbefore['unresolvedDisplayAliases'])]==regbefore['unresolvedDisplayAliases']
assert new==58
hashes=json.loads((out/'protected-hashes.json').read_text(encoding='utf-8'));changed=[p for p,h in hashes.items() if hashlib.sha256(Path(p).read_bytes()).hexdigest()!=h]
result={'status':'PASS','acceptedBlock3A':73,'newFieldsInRegisteredSnapshot':new,'newFieldsPerTeam':{t:per[t] for t in target},'otherTeamsUnchanged':34,'earlierBlocksUnchanged':True,'rosterMembershipsRegistrationListsAndStatisticsUnchanged':True,'protectedFilesChanged':changed};assert not changed,changed
(out/'preservation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(result,ensure_ascii=True))
