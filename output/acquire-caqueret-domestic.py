import json,re,urllib.request,concurrent.futures,datetime
from pathlib import Path
root=Path('data/raw/champions-domestic-seven-2026-11-11');d=json.loads((root/'caqueret-eventlog-season2026.json').read_text(encoding='utf-8'));jobs=[]
for p in d['payload']['events']['items']:
 if p.get('played'):
  m=re.search('/leagues/([^/]+)/events/(\\d+)',p['event']['$ref']);jobs.append((m[1],m[2]))
def run(j):
 league,event=j;u=f'https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/summary?event={event}'
 try:
  with urllib.request.urlopen(u,timeout=25) as x:d=json.load(x)
  (root/(event+'-summary.json')).write_text(json.dumps({'url':u,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'payload':d},ensure_ascii=False),encoding='utf-8')
  rows=[p for t in d.get('rosters',[]) for p in t.get('roster',[]) if str(p.get('athlete',{}).get('id'))=='265912'];c=d.get('header',{}).get('competitions',[{}])[0]
  return {'event':event,'date':c.get('date'),'status':c.get('status',{}).get('type',{}).get('name'),'rows':rows}
 except Exception as e:return {'event':event,'error':str(e)}
for v in concurrent.futures.ThreadPoolExecutor(max_workers=6).map(run,jobs):print(json.dumps(v,ensure_ascii=True)[:2200])
