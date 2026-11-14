"""Apply unambiguous, team-scoped ID links from the canonical audit. No statistic calculations."""
import json,copy,hashlib,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def write(p,d):
 f=ROOT/p;compact=f.exists() and len(f.read_text(encoding='utf-8-sig').strip().splitlines())==1
 f.write_text(json.dumps(d,ensure_ascii=False,indent=None if compact else 2,separators=(',',':') if compact else None)+'\n',encoding='utf-8')
audit=read('output/champions-missing-identities-2026-11-11.json')
squadsPath='data/normalized/champions-registered-squads-2026-27.json';statsPath='data/normalized/champions-player-stats-2026-27.json'
squads=read(squadsPath);stats=read(statsPath);beforeStats=copy.deepcopy(stats);beforeSquads=copy.deepcopy(squads)
sourcePaths=['data/sources/champions-registered-squads-2026-27.json']+[str(f.relative_to(ROOT)).replace('\\','/') for f in sorted((ROOT/'data/sources/champions-squads').glob('*.json'))]
sources={p:read(p) for p in sourcePaths};changed=set();corrections=[]
for row in audit['players']:
 if row['classification']!='missing-provider-mapping':continue
 assert len(row['providerCandidates'])==1
 espn=row['providerCandidates'][0];team=next(t for t in squads['teams'] if t['team']==row['team']);p=next(p for p in team['players'] if str(p.get('uefaPlayerId'))==str(row['uefaPlayerId']))
 assert p.get('providerIds',{}).get('espn') in [None,espn]
 owners=[(path,t) for path,d in sources.items() for t in d['teams'] if t['team']==row['team']];assert len(owners)==1
 path,sourceTeam=owners[0];identities=[ip for ip in sourceTeam.get('playerIdentities',[]) if str(ip.get('uefaPlayerId'))==str(row['uefaPlayerId'])];assert len(identities)==1
 ip=identities[0];assert ip.get('providerIds',{}).get('espn') in [None,espn]
 ip['providerIds']={**ip.get('providerIds',{}),'espn':espn};p['providerIds']={**p.get('providerIds',{}),'espn':espn};changed.add(path)
 st=next(t for t in stats['teams'] if t['id']==row['teamId']);candidates=[x for x in st['players'] if str(x.get('providerPlayerId'))==espn]
 if not candidates:candidates=[x for x in st['players'] if x['id'] in row['canonicalIds']]
 assert len(candidates)<=1
 if candidates:
  cp=candidates[0];assert cp.get('providerPlayerId') in [None,espn];cp['providerPlayerId']=espn
  if cp['id']!=p['id']:ip['canonicalStatisticsPlayerId']=cp['id']
 corrections.append({'teamId':row['teamId'],'rosterTeamId':team['id'],'team':team['team'],'playerId':p['id'],'name':p['name'],'uefaPlayerId':p['uefaPlayerId'],'espn':espn,'sourceFile':path,'evidence':row['evidence'],'recoversCurrentStatistics':row['recoverableCurrentRecord']})
# Prove every statistic, ID, selection, name and unrelated roster field is preserved.
for oldTeam,newTeam in zip(beforeStats['teams'],stats['teams']):
 assert len(oldTeam['players'])==len(newTeam['players'])
 for old,new in zip(oldTeam['players'],newTeam['players']):
  x=copy.deepcopy(new);x['providerPlayerId']=old.get('providerPlayerId')
  if 'providerPlayerId' not in old:x.pop('providerPlayerId',None)
  assert old==x
for oldTeam,newTeam in zip(beforeSquads['teams'],squads['teams']):
 for old,new in zip(oldTeam['players'],newTeam['players']):
  x=copy.deepcopy(new);x['providerIds']=old.get('providerIds')
  if 'providerIds' not in old:x.pop('providerIds',None)
  assert old==x
ledger={'asOf':'2026-11-11','policy':'Only unique ESPN identities within canonical team, existing UEFA identity, reviewed aliases or exact full/display name in archived provider roster; no approximate matching or statistical replacement.','auditBefore':audit['summary'],'corrections':corrections}
print(json.dumps({'corrections':len(corrections),'statisticRecoveries':sum(c['recoversCurrentStatistics'] for c in corrections),'sourceFiles':len(changed),'apply':'--apply' in sys.argv}))
if '--apply' in sys.argv and corrections:
 for path in changed:write(path,sources[path])
 write(squadsPath,squads);write(statsPath,stats)
 write('data/sources/champions-player-identity-reconciliation-2026-11-11.json',ledger)
