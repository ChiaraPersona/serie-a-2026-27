import pathlib,json,re,unicodedata,pdfplumber
r=pathlib.Path('output/reports/reading-scenario-kits-2026-10-16');read=lambda p:json.loads(pathlib.Path(p).read_text(encoding='utf-8-sig'));norm=lambda s:re.sub('[^a-z0-9 ]','',unicodedata.normalize('NFKD',s.lower().replace('ÃƒÂ¸','o').replace('Ã…â€š','l')).encode('ascii','ignore').decode());source=read('data/sources/team-pages/shirt-numbers-2026-27.json');teams=read('data/normalized/teams.json');tm=read(r/'transfermarkt-squads.json');clubids={'46':'inter','506':'juventus','1047':'como','5':'milan','12':'roma','800':'atalanta','6195':'napoli','430':'fiorentina','398':'lazio','1025':'bologna','6574':'sassuolo','416':'torino','252':'genoa','410':'udinese','130':'parma','1390':'cagliari','607':'venezia','8970':'frosinone','2919':'monza','1005':'lecce'}
tmteams={clubids[re.search('/verein/(\d+)',c['url'])[1]]:c for c in tm if c['rows'] and '/kader/' in c['url'] and c['seasonConfirmed']}
# OCR is only a candidate extractor. Visually verified rows and searchable PDF tables take precedence.
candidates=read(r/'official-candidates.json');entries=candidates['matched']+candidates['unmatched'];entries=[e for e in entries if not any(stem in e['sourceUrl'] for stem in ['z5faqyrzc8dzgsc6m5ol','zl8aoa8yqawuq9awnxqf'])]
byname={norm(t['name']):t['id'] for t in teams};docs=read(r/'document-links.json')
for stem in ['z5faqyrzc8dzgsc6m5ol','zl8aoa8yqawuq9awnxqf']:
 meta=next(d for d in docs if stem in d['url']);date='-'.join(reversed(meta['text'].split('\n')[1].split('/')))
 with pdfplumber.open(r/(stem+'.pdf')) as pdf:
  for pi,p in enumerate(pdf.pages):
   for table in p.extract_tables():
    team=next((byname.get(norm(row[0])) for row in table if row[0]),None)
    for row in table:
     m=re.match(r'^(\d+)\.\s*(.+)',row[-1] or '')
     if m and team:entries.append(dict(teamId=team,shirtNumber=int(m[1]),sourceName=m[2],documentDate=date,sourceUrl=meta['url'],page=pi+1))
for e in entries:
 if e.get('playerId')=='franck-kessie':e['shirtNumber']=19
aliases=read('data/sources/player-identity-aliases-2026-27.json')['players']
official=read('data/sources/official-lineups-2026-27.json')
def identity(team,p):
 names=[a['canonicalName'] for a in aliases if a['teamId']==team and a['playerId']==p['id']]
 for f in official['fixtures']:
  for t in f.get('teams',[]):
   if t.get('teamId')==team:
    names += [q.get('currentName','') for q in t.get('players',[]) if q.get('playerId')==p['id']]
 for e in p.get('previousSeason',{}).get('entries',[]):
  url=e.get('sourceUrl','') or ''
  if 'footystats.org/players/' in url:names.append(url.rstrip('/').split('/')[-1].replace('-',' '))
 return names
verified=[];pending=[]
for team in teams:
 squad=read(f'data/teams/{team["id"]}.json')['squad'];club=tmteams[team['id']];rows={re.search('/spieler/(\d+)',q['url'])[1]:q for q in club['rows'] if q['number'] and q['number'].isdigit()}
 for e in [x for x in entries if x['teamId']==team['id']]:
  tokens=set(norm(e['sourceName']).split());matches=[]
  for p in squad:
   q=rows.get(str(p.get('providerIds',{}).get('transfermarkt')))
   names=[p['name']]+identity(team['id'],p)+([q['name']] if q else [])
   if any(len(norm(n).split())>=2 and set(norm(n).split())<=tokens for n in names):matches.append(p)
  if len(matches)==1:verified.append(dict(e,playerId=matches[0]['id'],playerName=matches[0]['name']))
  else:pending.append(e)
latest={(p['teamId'],p['playerId']):dict(p,documentDate='2026-08-21',sourceUrl='https://images.legaseriea.it/image/private/fl_attachment/prd/iemie7278cw5kgsjii2k.pdf',provider='Lega Calcio Serie A') for p in source['players']}
for e in sorted(verified,key=lambda e:e['documentDate']):latest[e['teamId'],e['playerId']]=dict(e,provider='Lega Calcio Serie A')
conflicts=[];missing=[];coverage=[]
for team in teams:
 squad=read(f'data/teams/{team["id"]}.json')['squad'];club=tmteams[team['id']];rows={re.search('/spieler/(\d+)',q['url'])[1]:q for q in club['rows'] if q['number'] and q['number'].isdigit()}
 for p in squad:
  key=(team['id'],p['id']);q=rows.get(str(p.get('providerIds',{}).get('transfermarkt')))
  if not q:
   names=[n for n in [p['name']]+identity(team['id'],p) if len(norm(n).split())>=2]
   exact=[x for x in rows.values() if norm(x['name']) in [norm(n) for n in names]]
   if len(exact)==1:q=exact[0]
  if q:
   if key in latest and latest[key]['shirtNumber']!=int(q['number']):conflicts.append(dict(teamId=team['id'],playerId=p['id'],name=p['name'],official=latest[key]['shirtNumber'],transfermarkt=int(q['number']),officialDate=latest[key]['documentDate']))
   if key not in latest:latest[key]=dict(teamId=team['id'],playerId=p['id'],playerName=p['name'],shirtNumber=int(q['number']),provider='Transfermarkt',sourceUrl=club['url'],playerUrl=q['url'],documentDate='2026-10-16',sourceName=q['name'])
  if key not in latest:missing.append(dict(teamId=team['id'],playerId=p['id'],name=p['name']))
 coverage.append(dict(teamId=team['id'],roster=len(squad),verified=sum((team['id'],p['id']) in latest for p in squad),official=sum(latest.get((team['id'],p['id']),{}).get('provider')=='Lega Calcio Serie A' for p in squad)))
(r/'number-plan.json').write_text(json.dumps(dict(players=list(latest.values()),officialUpdates=verified,unmatchedOfficial=pending,conflicts=conflicts,missing=missing,coverage=coverage),ensure_ascii=False,indent=2),encoding='utf8')
print('official updates',len(verified),'numbered',len(latest),'missing',len(missing),'conflicts',len(conflicts));print(json.dumps(conflicts,ensure_ascii=True));print(json.dumps(coverage))
