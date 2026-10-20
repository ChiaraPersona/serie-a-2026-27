"""Materialize MD3 eligibility only; never infer match call-ups from registration."""
import json,re,pathlib,gzip,unicodedata,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text(encoding='utf8'))
def write(p,d):(ROOT/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s.replace('ø','o').replace('ł','l')).encode('ascii','ignore').decode().lower())
def slug(s):return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',s.replace('ø','o').replace('ł','l')).encode('ascii','ignore').decode().lower()).strip('-')
# Reviewed aliases refer to existing ESPN roster records, never a second player.
CASES=[('borussia-dortmund','Nwaneri','Ethan Nwaneri','349733','ethan-nwaneri'),('arsenal','Lewis-Skelly','Myles Lewis-Skelly','352758','myles-lewis-skelly'),('bayern-munchen','Karl','Lennart Karl','402841','lennart-karl'),('inter','Esposito','Francesco Pio Esposito','362674','pio-esposito'),('leipzig','Nusa','Antonio Nusa','319368','antonio-nusa'),('borussia-dortmund','Veerman','Joey Veerman','240912','joey-veerman'),('borussia-dortmund','Gadou','Joane Gadou','371500','kouakou-gadou'),('psv-eindhoven','Fernandez','Noah Fernandez','386885','noah-fernandez'),('viking','Bjørdal','Henrik Bjørdal','186172','henrik-rorvik-bjordal'),('viking','Botheim','Erik Botheim','239925','erik-botheim'),('club-brugge','Sabbe','Kyriani Sabbe','351373','kyriani-sabbe'),('club-brugge','Spileers','Jorne Spileers','351301','jorne-spileers'),('club-brugge','Seys','Joaquin Seys','363068','joaquin-seys'),('feyenoord','Mika Mármol','Mika Mármol','332573','mika-medina'),('lask','Alemão','João Victor Tornich','338948','joao-victor-tornich')]
UEFA_IDS={'kouakou-gadou':'250177594','mika-medina':'250123956','joao-victor-tornich':'250223204'}
DISPLAY={'Pio Esposito':'Francesco Pio Esposito','Joane Gadou':'Kouakou Gadou','Henrik Bjørdal':'Henrik Rorvik Bjordal','João Victor Tornich':'Alemão','Mika Mármol':'Mika Mármol'}
probable=read('data/sources/champions-probable-formations-md03-2026-27.json')
registered=read('data/normalized/champions-registered-squads-2026-27.json')
current=read('data/normalized/champions-player-stats-2026-27.json')
overlay=read('data/sources/champions-player-identity-overlay-md02-2026-27.json')['players']
aliases=read('data/sources/champions-player-history-aliases.json')['aliases']
teams=[];cases=[];unparsed=[]
fixtures=[('paris-saint-germain','barcelona'),('liverpool','villarreal'),('manchester-city','aek-athens'),('roma','slovan-bratislava'),('porto','psv-eindhoven'),('napoli','bodo-glimt'),('fenerbahce','slavia-praha'),('stuttgart','atletico-de-madrid'),('sabah','borussia-dortmund'),('bayern-munchen','arsenal'),('real-madrid','leipzig'),('inter','shakhtar-donetsk'),('sporting-cp','lask'),('aston-villa','viking'),('club-brugge','lens'),('real-betis','feyenoord'),('lille','galatasaray'),('como','manchester-united')]
roles={'Portieri':'goalkeeper','Difensori':'defender','Centrocampisti':'midfielder','Attaccanti':'forward','Goalkeepers':'goalkeeper','Defenders':'defender','Midfielders':'midfielder','Forwards':'forward'}
for i,pair in enumerate(fixtures):
 rawPath=f'data/raw/champions-md3-uefa/{2049589+i}'+('-en' if i==7 else '')+'.txt'
 raw=(ROOT/rawPath).read_text(encoding='utf8');url=re.search(r'UEFA.com \((https[^)]+)\)',raw)[1]
 sections=re.split(r'## (Portieri|Difensori|Centrocampisti|Attaccanti|Allenatore|Goalkeepers|Defenders|Midfielders|Forwards|Coach)',raw)
 ti=-1;players=[]
 for k in range(1,len(sections),2):
  heading,body=sections[k:k+2]
  if heading not in roles:continue
  if roles[heading]=='goalkeeper':
   ti+=1
   if ti:teams[-1]['players']=players
   players=[]
   tid=pair[ti];pt=next(t for t in probable['teams'] if t['teamId']==tid)
   rt=next(t for t in registered['teams'] if t['team']==pt['team']);ct=next(t for t in current['teams'] if t['team']==pt['team'])
   rosterPath=f'data/raw/champions-player-stats/espn/rosters/{ct["id"]}.json.gz'
   roster=json.load(gzip.open(ROOT/rosterPath,'rt',encoding='utf8'))['payload']['athletes']
   known={p['name']:p for p in rt['players']}
   known.update({p['name']:p for p in ct['players']})
   for p in roster:known.setdefault(p['displayName'],{'id':slug(p['displayName']),'name':p['displayName'],'providerPlayerId':str(p['id'])})
   for name in list(known):
    for key,value in aliases.items():
     if key.startswith(pt['team']+'|') and value==name:known.setdefault(key.split('|',1)[1],known[name])
   for name,rawname in DISPLAY.items():
    if rawname in known:known[name]=known[rawname]
   teams.append({'fixtureId':pt['fixtureId'],'teamId':tid,'team':pt['team'],'status':'official-eligible-squad','source':{'url':url,'consultedAt':'2026-10-20','scope':'official-competition-squad-on-md3-match-page','rawPath':rawPath,'sha256':hashlib.sha256(raw.encode()).hexdigest()},'players':[]})
  # Link labels include full name, display name and optional nationality. Keep the full name only.
  body=re.sub(r'L\d+:\s*',' ',body)
  for m in re.finditer(r'(\d+)\s+cite(\d+)†([^]+)',body):
   label=m[3].strip();listB='*' in label;label=re.sub(r'\s*\*','',label);label=re.sub(r'\s+[A-Z]{3}$','',label).strip()
   candidates=sorted([n for n in known if label==n or label.startswith(n+' ')],key=len,reverse=True)
   if candidates:name=candidates[0];existing=known[name]
   else:
    words=label.split();cuts=[n for n in range(1,len(words)) if [w.lower() for w in words[n:]]==[w.lower() for w in words[n-len(words[n:]):n]]]
    if not cuts:unparsed.append((tid,label));continue
    name=' '.join(words[:min(cuts)]);existing={'id':slug(name),'name':name}
   provider=existing.get('providerPlayerId') or existing.get('providerIds',{}).get('espn')
   # Raw roster is an independent, team-scoped exact-name check.
   exact=[p for p in roster if norm(p['displayName'])==norm(name) or str(p['id'])==str(provider)]
   if len(exact)==1:provider=str(exact[0]['id'])
   canonical=[p for p in ct['players'] if provider and str(p.get('providerPlayerId'))==provider]
   if len(canonical)==1:existing=canonical[0]
   displayName=label[len(name):].strip()
   entry={'sourceName':name,'displayName':displayName,'canonicalName':existing['name'],'playerId':existing['id'],'registeredPlayerId':existing['id'],'providerPlayerId':provider,'shirtNumber':int(m[1]),'role':roles[heading],'registrationList':'B' if listB else None,'uefaPlayerId':None,'sourceLinkIndex':int(m[2]),'availability':'eligible-availability-unconfirmed','statistics':None}
   cache=ROOT/f'data/raw/champions-recovery/2026-10-09/uefa-squads/{tid}.json.gz'
   if cache.exists():
    body=json.load(gzip.open(cache,'rt',encoding='utf8'))['body']
    uefa=[uid for uid,title in re.findall(r'href="[^\"]*/players/(\d+)--[^\"]*" title="([^\"]+)"',body) if norm(title)==norm(name)]
    if len(set(uefa))==1:entry['uefaPlayerId']=uefa[0]
   case=next((c for c in CASES if c[0]==tid and (norm(c[2])==norm(name) or c[3]==str(provider) or (c[1]=='Alemão' and 'Tornich' in name))),None)
   if case:
    _,alias,canonical,pid,internal=case
    assert any(str(p['id'])==pid for p in roster),(tid,alias)
    entry.update(canonicalName=canonical,playerId=internal,registeredPlayerId=internal,providerPlayerId=pid,uefaPlayerId=UEFA_IDS.get(internal,entry['uefaPlayerId']))
    old=next((p for p in overlay if p['canonicalPlayerId']==internal),None)
    if old and not entry['uefaPlayerId']:entry['uefaPlayerId']=old['providerIds'].get('uefa')
    cases.append({'teamId':tid,'alias':alias,'canonicalName':canonical,'playerId':internal,'providerPlayerId':pid,'uefaPlayerId':entry['uefaPlayerId'],'rosterPath':rosterPath,'sourceUrl':url,'status':'resolved-existing-database-identity'})
   players.append(entry)
 teams[-1]['players']=players
assert not unparsed,unparsed
assert len(teams)==36
assert len(cases)==15,(len(cases),[c['alias'] for c in cases])
for t in teams:
 assert len(t['players'])>=18,(t['team'],len(t['players']))
 assert len({p['playerId'] for p in t['players']})==len(t['players']),t['team']
 pt=next(p for p in probable['teams'] if p['teamId']==t['teamId'])
 for cat in ['starters','unavailable','suspended','doubtful']:
  for p in pt[cat]:
   case=next((c for c in cases if c['teamId']==t['teamId'] and c['alias']==p['sourceName']),None)
   if case:p.update({k:case[k] for k in ['playerId','providerPlayerId','canonicalName']},registeredPlayerId=case['playerId'],identityStatus='resolved-md3-reviewed-existing-identity',identityEvidence={'sourceUrl':case['sourceUrl'],'rosterPath':case['rosterPath']})
   hits=[x for x in t['players'] if (p.get('playerId') and x['playerId']==p['playerId']) or norm(x['sourceName'])==norm(p['sourceName']) or norm(x['displayName'])==norm(p['sourceName']) or (p.get('providerPlayerId') and x['providerPlayerId']==p['providerPlayerId'])]
   if len(hits)==1:
    p['shirtNumber']=hits[0]['shirtNumber'];p['uefaRole']=hits[0]['role'];hits[0]['availability']=cat
    if not p.get('playerId'):
     p.update({k:hits[0][k] for k in ['playerId','registeredPlayerId','providerPlayerId','canonicalName']},identityStatus='resolved-exact-uefa-display-name',identityEvidence={'sourceUrl':t['source']['url']})
 # Potential bench is eligibility minus XI and known absences/doubts. It is NOT a match call-up.
 t['potentialBench']=[p for p in t['players'] if p['availability']=='eligible-availability-unconfirmed']
 t['unmatchedProbableStarters']=[p['sourceName'] for p in pt['starters'] if not any(x['playerId']==p.get('playerId') for x in t['players'])]
write('data/sources/champions-md03-squads-2026-27.json',{'schemaVersion':1,'competition':'champions','season':'2026-27','matchday':3,'asOf':'2026-10-20','policy':'Eligibility is not match call-up or confirmed availability. No statistics inferred. Frozen MD1/MD2 registry is preserved.','identityResolutions':cases,'teams':teams})
write('data/sources/champions-probable-formations-md03-2026-27.json',probable)
callups=read('data/sources/champions-callups-md03-2026-27.json')
for t in callups['teams']:
 squad=next(x for x in teams if x['teamId']==t['teamId'])
 for p in t.get('players') or []:
  hits=[x for x in squad['players'] if (p.get('playerId') and x['playerId']==p['playerId']) or norm(p['sourceName']) in [norm(x['sourceName']),norm(x['canonicalName']),norm(x['displayName'])]]
  if len(hits)==1:
   x=hits[0];p.update({k:x[k] for k in ['playerId','registeredPlayerId','providerPlayerId','canonicalName','shirtNumber']},identityStatus='resolved-exact-md3-squad',eligibilityStatus='listed-md3-squad')
  else:p['eligibilityStatus']='not-reconciled-with-md3-eligible-squad'
write('data/sources/champions-callups-md03-2026-27.json',callups)
print(json.dumps({'teams':len(teams),'players':sum(len(t['players']) for t in teams),'resolved':len(cases),'unmatchedStarters':{t['teamId']:t['unmatchedProbableStarters'] for t in teams if t['unmatchedProbableStarters']}},ensure_ascii=True))
