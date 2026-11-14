"""Read canonical data; write an internal identity audit only. No production writes."""
import json, collections, unicodedata, re, gzip
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def tid(x):return {'bod-glimt':'bodo-glimt'}.get(x,x)
squads=read('data/normalized/champions-registered-squads-2026-27.json')
current=read('data/normalized/champions-player-stats-2026-27.json')
registries=[(p,read(p)) for p in ['data/normalized/champions-md03-player-database-2026-27.json','data/normalized/champions-md04-player-database-2026-27.json']]
shooting=read('data/normalized/champions-player-shooting-2026-27.json')
historical=read('data/normalized/champions-player-stats-2025-26.json')
aliases=read('data/sources/champions-player-history-aliases.json')
resolved=read('data/analysis/champions/season-shots-2026-10-20/identity-resolutions.json')
source=read('data/sources/champions-registered-squads-2026-27.json')
source['teams']+= [t for f in sorted((ROOT/'data/sources/champions-squads').glob('*.json')) for t in json.loads(f.read_text(encoding='utf-8-sig'))['teams']]
raw_rosters=[]
for base in ['data/raw/champions-player-stats/espn/rosters','data/raw/champions-season-shots/2026-10-20/rosters']:
 for file in (ROOT/base).glob('*.json.gz'):
  raw=json.loads(gzip.decompress(file.read_bytes()));payload=raw.get('payload',{});raw_rosters.append((str(file.relative_to(ROOT)),payload))
review=read('data/sources/champions-statistical-gap-review-2026-11-11.json')
accepted={(p['teamId'],p['playerId']) for p in review['acceptedPlayers']}
rows=[]
for t in squads['teams']:
 teamId=tid(t['id']);st=next(x for x in current['teams'] if x['id']==teamId)
 for p in t['players']:
  provider=p.get('providerIds',{}).get('espn');matched=[x for x in st['players'] if str(x.get('providerPlayerId'))==str(provider)] if provider else [x for x in st['players'] if x['id']==p['id']]
  totals=((matched[0].get('currentSeason') or {}).get('totals') or {}) if len(matched)==1 else {}
  if all(totals.get(f) is not None for f in ['minutes','shots','shotsOnTarget']):continue
  evidence=[];ids={p['id']}
  def add(providerId,path,identityId=None):
   if identityId:ids.add(identityId)
   if providerId:evidence.append({'espn':str(providerId),'source':path,'canonicalId':identityId})
  add(provider,'registered-roster',p['id'])
  for existing in matched:add(existing.get('providerPlayerId'),'current-exact-canonical-id',existing['id'])
  exact_names={p['name'],aliases.get('aliases',{}).get(t['team']+'|'+p['name'],p['name'])}
  for path,payload in raw_rosters:
   if str(payload.get('team',{}).get('id'))!=str(st.get('espnTeamId')):continue
   for athlete in payload.get('athletes',[]):
    if athlete.get('fullName') in exact_names or athlete.get('displayName') in exact_names:add(athlete.get('id'),path)
  for path,d in registries:
   mt=next((x for x in d['teams'] if x.get('teamId')==teamId),{})
   for mp in mt.get('players',[]):
    if p.get('uefaPlayerId') and str(mp.get('uefaPlayerId'))==str(p['uefaPlayerId']):add(mp.get('providerPlayerId'),path,mp.get('id') or mp.get('playerId'))
  src=next(x for x in source['teams'] if x['team']==t['team'])
  for ip in src.get('playerIdentities',[]):
   if p.get('uefaPlayerId') and str(ip.get('uefaPlayerId'))==str(p['uefaPlayerId']):add(ip.get('providerIds',{}).get('espn'),'canonical-roster-source',ip.get('canonicalStatisticsPlayerId') or ip.get('playerId'))
  for dataset,label in [(shooting,'verified-shooting-identities'),(historical,'historical-canonical-identities')]:
   dt=next((x for x in dataset['teams'] if tid(x.get('id'))==teamId or x.get('team')==t['team']),{})
   for ep in dt.get('players',[]):
    if ep['id'] in ids:add(ep.get('providerPlayerId') or ep.get('providerIds',{}).get('espn'),label,ep['id'])
  for ep in resolved:
   if ep['teamId']==teamId and ep['playerId'] in ids:add(ep.get('providerPlayerId'),'reviewed-identity-resolutions',ep['playerId'])
  for key in [t['team']+'|'+p['name']]:
   ep=aliases.get('providerIds',{}).get(key)
   if ep:add(ep.get('id'),'verified-provider-aliases')
  providers=sorted({e['espn'] for e in evidence})
  alternatives=[x for x in st['players'] if (len(providers)==1 and str(x.get('providerPlayerId'))==providers[0]) or x['id'] in ids]
  # A provider disagreement always requires manual review, even if one option has statistics.
  classification='conflicting-provider-ids' if len(providers)>1 else 'missing-provider-mapping' if not provider and len(providers)==1 else 'provider-not-resolved' if not providers else 'identity-consistent'
  usable=[x for x in alternatives if ((x.get('currentSeason') or {}).get('totals') or {}).get('minutes') is not None]
  rows.append({'teamId':teamId,'team':t['team'],'playerId':p['id'],'name':p['name'],'uefaPlayerId':p.get('uefaPlayerId'),'position':p.get('position'),'listB':p.get('registrationList')=='B','goalkeeperAccepted':p.get('position')=='goalkeeper','registeredEspn':provider,'missingFields':[f for f in ['minutes','shots','shotsOnTarget'] if totals.get(f) is None],'classification':classification,'evidence':evidence,'providerCandidates':providers,'canonicalIds':sorted(ids),'matchedRecords':len(matched),'alternativeRecords':[{'id':x['id'],'espn':x.get('providerPlayerId'),'minutes':((x.get('currentSeason') or {}).get('totals') or {}).get('minutes')} for x in alternatives],'recoverableCurrentRecord':len(providers)==1 and len(usable)==1 and (not matched or usable[0] not in matched),'nonPrimaryEvidence':[{'competition':e.get('competition'),'minutes':e.get('minutes'),'teamId':e.get('teamId')} for x in alternatives for e in (x.get('currentSeason') or {}).get('entries',[]) if e.get('minutes') is not None]})
for row in rows:
 row['acceptedForReview']=row['goalkeeperAccepted'] or (row['teamId'] in ['arsenal','liverpool'] and row['listB']) or (row['teamId'],row['playerId']) in accepted
 row['reviewReason']='goalkeeper' if row['goalkeeperAccepted'] else 'accepted-list-B' if row['teamId'] in ['arsenal','liverpool'] and row['listB'] else 'accepted-individual-review' if row['acceptedForReview'] else 'pending'
summary={'registeredPlayers':sum(len(t['players']) for t in squads['teams']),'auditedPlayers':len(rows),'minutesMissing':sum('minutes' in x['missingFields'] for x in rows),'goalkeepersAccepted':sum(x['goalkeeperAccepted'] for x in rows),'outfieldMinutesMissing':sum('minutes' in x['missingFields'] and not x['goalkeeperAccepted'] for x in rows),'classifications':dict(collections.Counter(x['classification'] for x in rows)),'recoverableCurrentRecords':sum(x['recoverableCurrentRecord'] for x in rows),'pendingReview':sum(not x['acceptedForReview'] for x in rows),'pendingMinutes':sum(not x['acceptedForReview'] and 'minutes' in x['missingFields'] for x in rows)}
out=ROOT/'output/champions-missing-identities-2026-11-11.json';out.write_text(json.dumps({'summary':summary,'players':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(summary))
for x in rows:
 if x['recoverableCurrentRecord'] or x['classification']=='conflicting-provider-ids':print(json.dumps({k:x[k] for k in ['team','name','classification','registeredEspn','providerCandidates','alternativeRecords','recoverableCurrentRecord']},ensure_ascii=True))
