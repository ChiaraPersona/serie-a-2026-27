import json,re,unicodedata,pathlib
r=pathlib.Path('.');read=lambda p:json.loads((r/p).read_text(encoding='utf8'));reg=read('data/normalized/champions-registered-squads-2026-27.json');cur=read('data/normalized/champions-player-stats-2026-27.json');cal=read('data/normalized/champions-league-2026-27.json');lines=(r/'data/analysis/champions/md3-probable-2026-10-19/uefa-extracted-lines.txt').read_text(encoding='utf-8-sig').splitlines();fixtures=[f for f in cal['fixtures'] if f['matchday']==3];assert len(lines)==36
norm=lambda s:re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
for i,line in enumerate(lines):
 f=fixtures[i//2];team=f['homeTeam' if i%2==0 else 'awayTeam'];t=next(t for t in reg['teams'] if t['team']==team);c=next(t for t in cur['teams'] if t['team']==team);players={p['id']:p for p in t['players']};players.update({p['id']:p for p in c['players']})
 names=re.split('[;,]',line.split('|')[0])+[x.split(' (')[0] for a in line.split('|')[1:] if a!='nessuno' for x in a.split(', ')]
 unresolved=[]
 for n in names:
  n=n.strip();exact=[p for p in players.values() if norm(p['name'])==norm(n)];candidates=exact or [p for p in players.values() if norm(p['name']).endswith(norm(n)) or norm(n).endswith(norm(p['name']))]
  unresolved.append(n+'='+('/'.join(p['id']+' ['+p['name']+']' for p in candidates) or 'UNRESOLVED'))
 print(t['id']+': '+'; '.join(unresolved))
