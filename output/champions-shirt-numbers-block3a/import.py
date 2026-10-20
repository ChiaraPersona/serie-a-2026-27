import json,gzip,hashlib,unicodedata,re
from pathlib import Path
out=Path('output/champions-shirt-numbers-block3a');sp=Path('data/sources/champions-shirt-numbers-2026-27.json');dp=Path('data/normalized/champions-registered-squads-2026-27.json');s=json.loads(sp.read_text(encoding='utf-8'));db=json.loads(dp.read_text(encoding='utf-8'));md3path=Path('data/sources/champions-md03-squads-2026-27.json');md3=json.loads(md3path.read_text(encoding='utf-8'))
for name,p in [('registry.before.json.gz',sp),('database.before.json.gz',dp)]:
 with gzip.open(out/name,'wb') as f:f.write(p.read_bytes())
protected=[p for p in Path('data/normalized').glob('*.json') if p!=dp]+[md3path,Path('data/sources/champions-probable-formations-md03-2026-27.json'),Path('js/components/lineup-kit.mjs'),Path('js/components/champions-kits.mjs'),Path('css/reading-detail.css')]
(out/'protected-hashes.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in protected},indent=2),encoding='utf-8')
raw={
'galatasaray':'1 Çakır;3 Bitshiabu;4 Jakobs;6 Sánchez;7 Sallai;8 Gabriel Sara;10 Sané;11 Yunus Akgün;17 Elmalı;18 Ugochukwu;19 Güvenç;20 Gündoğan;21 Deniz Gül;24 Yılmaz;27 Rafael Leão;34 Torreira;42 Bardakcı;45 Osimhen;51 Tagay;53 Barış Alper Yılmaz;57 Yançel;62 Yüzgeç;64 Kahraman;67 Karasu;68 Koçak;70 Büyük;71 Akgün;73 Luş;74 Nhaga;76 Yıldız;83 Batrakov;90 Singo;99 Lemina',
'club-brugge':'1 Sommer;3 Han-beom Lee;4 Ordóñez;7 Tresoldi;8 Potts;9 Forbs;10 Vetlesen;11 Virgili;16 Tsawa;17 Vermant;20 Vanaken;27 Mike;29 Jackers;32 Dams;39 Robberechts;41 Siquet;44 Mechele;54 Coulibaly;58 Spileers;62 Audoor;64 Sabbe;65 Seys;67 Diakhon;71 De Corte;72 Da Silva;76 Delorge;77 Vasović;80 Lemaréchal;81 Vanden Driessche;82 Van Hoogen;85 Koren;86 Okon;89 Van Britsom;90 Garcia;91 Kestemont;92 Vandeperre;93 Verlinden;95 Elbay;97 Amengai;98 Wins'}
def norm(v):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',v.replace('ı','i')).encode('ascii','ignore').decode().lower())
new=[];ambiguous=[];missing=[];conflicts=[]
for tid,text in raw.items():
 team=next(t for t in md3['teams'] if t['teamId']==tid);old=next(t for t in db['teams'] if t['id']==tid)
 for row in text.split(';'):
  ns,name=row.split(' ',1);n=int(ns);key=norm(name)
  exact=[p for p in team['players'] if key in [norm(p.get(k,'')) for k in ['canonicalName','sourceName','displayName']]]
  # Proposals are reviewed against the already-confirmed number; bare surnames are never enabled as runtime aliases when shared.
  candidates=[p for p in team['players'] if key in [norm(p.get(k,'')) for k in ['canonicalName','sourceName','displayName']] or norm(p['canonicalName'].split()[-1])==key]
  hits=exact if len(exact)==1 else candidates
  identityNote=None
  if len(hits)>1:
   confirmed=[p for p in hits if p.get('shirtNumber')==n]
   ambiguous.append({'block':'3A','teamId':tid,'submittedName':name,'submittedNumber':n,'candidateIds':[p['playerId'] for p in hits],'resolution':'matched-existing-confirmed-number' if len(confirmed)==1 else 'unresolved','runtimeBareAliasEnabled':False})
   hits=confirmed;identityNote='shared surname resolved only by the already-confirmed number; bare runtime alias withheld'
  if len(hits)!=1:missing.append({'block':'3A','teamId':tid,'submittedPlayer':name,'shirtNumber':n,'status':'unresolved'});continue
  p=hits[0];aliases=list(dict.fromkeys(p.get(k) for k in ['canonicalName','sourceName','displayName'] if p.get(k)))
  if identityNote is None:aliases=list(dict.fromkeys(aliases+[name]))
  oldhits=[q for q in old['players'] if q['id']==p['playerId'] or q['name'] in aliases];assert len(oldhits)<=1
  previous=set(x for x in [p.get('shirtNumber')]+[q.get('shirtNumber') for q in oldhits] if x is not None)
  record={'block':'3A','teamId':tid,'uefaClubId':old['uefaClubId'],'playerId':p['playerId'],'stablePlayerId':p['stablePlayerId'],'canonicalName':p['canonicalName'],'submittedName':name,'aliases':aliases,'shirtNumber':n,'existingConfirmedNumber':p.get('shirtNumber'),'status':'conflict' if previous and previous!={n} else 'accepted'}
  if identityNote:record['identityResolution']=identityNote
  if oldhits and oldhits[0]['id']!=p['playerId']:record['playerIdAliases']=[oldhits[0]['id']]
  if record['status']=='conflict':conflicts.append(record)
  new.append(record)
s['importedBlocks'].append('3A');s['scope']+=list(raw);s['records']+=new;s['unmatched']+=missing;s.setdefault('ambiguousSubmittedNames',[]).extend(ambiguous)
for alias,candidates in [('Akgun',['cihan-akgun','yunus-akgun']),('Yilmaz',['jankat-yilmaz','baris-alper-yilmaz'])]:
 s['unresolvedDisplayAliases'].append({'block':'3A','teamId':'galatasaray','fixtureId':'ucl-2026-27-md01-11','suppliedName':alias,'candidateIds':candidates,'reason':'MD1 lineup contains a shared surname without stable ID; no number inferred','shirtNumber':None})
assert len(new)==73 and not missing and not conflicts
assert len({r['stablePlayerId'] for r in s['records']})==len(s['records'])
sp.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(out/'reconciliation.json').write_text(json.dumps({'accepted':len(new),'perTeam':{tid:sum(r['teamId']==tid for r in new) for tid in raw},'notFound':missing,'conflicts':conflicts,'ambiguousSubmittedNames':ambiguous,'unresolvedDisplayAliases':s['unresolvedDisplayAliases'][-2:]},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'accepted':len(new),'notFound':missing,'conflicts':conflicts,'ambiguousSubmittedNames':ambiguous},ensure_ascii=True))
