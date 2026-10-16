import json,pathlib,re,unicodedata,hashlib
r=pathlib.Path('output/reports/reading-scenario-kits-2026-10-16');read=lambda p:json.loads(pathlib.Path(p).read_text(encoding='utf-8-sig')); norm=lambda s:re.sub('[^a-z0-9 ]','',unicodedata.normalize('NFKD',s.lower().replace('ø','o').replace('ł','l')).encode('ascii','ignore').decode())
teams=read('data/normalized/teams.json');byname={norm(t['name']):t['id'] for t in teams};source=read('data/sources/team-pages/shirt-numbers-2026-27.json');docs=read(r/'document-links.json');meta={d['url'].split('/')[-1].split('.')[0]:d for d in docs if 'Numerazioni' in d['text'] and 'Serie A Enilive' in d['text']};entries=[]
for f in r.glob('*.ocr.json'):
 stem=f.name.split('-')[0]
 if stem=='iemie7278cw5kgsjii2k' or stem not in meta:continue
 lines=read(f);first=lambda x:x[0] if isinstance(x,list) else x
 clubs=[]
 for l in lines:
  n=norm(l['text']);x=first(l['x']);y=first(l['y'])
  if n in byname and x<630:clubs.append((y,byname[n]))
 clubs.sort()
 for l in lines:
  m=re.match(r'^(\d{1,2})[.,]\s*(.+)',l['text']);x=first(l['x']);y=first(l['y'])
  if not m or x<620 or int(m[1])<1:continue
  candidates=[c for c in clubs if c[0]<=y+75]
  if not candidates:continue
  team=max(candidates)[1];date=meta[stem]['text'].split('\n')[1].split('/');date='-'.join(reversed(date))
  entries.append(dict(teamId=team,shirtNumber=int(m[1]),sourceName=m[2],documentDate=date,sourceUrl=meta[stem]['url'],page=int(f.name.split('-')[1].split('.')[0]),image=f.name.replace('.ocr.json','')))
matched=[];unmatched=[]
for e in entries:
 squad=read(f'data/teams/{e["teamId"]}.json')['squad'];tokens=set(norm(e['sourceName']).split())
 matches=[p for p in squad if len(norm(p['name']).split())>=2 and set(norm(p['name']).split())<=tokens]
 if len(matches)==1: matched.append(dict(e,playerId=matches[0]['id'],playerName=matches[0]['name']))
 else:unmatched.append(e)
(r/'official-candidates.json').write_text(json.dumps(dict(matched=matched,unmatched=unmatched),ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(matched,ensure_ascii=False,indent=2));print('unmatched',len(unmatched),'total',len(entries))
