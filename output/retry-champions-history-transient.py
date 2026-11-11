import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('supp','scripts/acquire-champions-club-history-supplement.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
p=Path('data/sources/champions-player-club-history-supplement-2025-26.json');d=json.loads(p.read_text(encoding='utf-8'))
for i,x in enumerate(d['players']):
 if any('503' in str(e) for e in x['errors']):
  target={k:x[k] for k in ['teamId','team','playerId','name','providerPlayerId']};new=m.worker(target);d['players'][i]=new;print(x['name'],'positive',len(new['entries']),'transientErrors',sum('503' in str(e) for e in new['errors']))
d['summary']={'checked':len(d['players']),'withPositiveHistory':sum(bool(x['entries']) for x in d['players']),'withErrors':sum(bool(x['errors']) for x in d['players'])};p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(d['summary'])
