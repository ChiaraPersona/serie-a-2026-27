import json,re,urllib.request,concurrent.futures,datetime
from pathlib import Path
root=Path('data/raw/champions-four-premier-2026-11-11');jobs={}
for name,pid in [('harwood-bellis','281121'),('ait-nouri','272512')]:
 d=json.loads((root/(name+'-eventlog-season2026.json')).read_text(encoding='utf-8'))
 for x in d['payload']['events']['items']:
  if x.get('played'):
   m=re.search('/leagues/([^/]+)/events/(\\d+)',x['event']['$ref']);jobs[m[2]]=m[1]
def run(j):
 event,league=j;u=f'https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/summary?event={event}'
 try:
  with urllib.request.urlopen(u,timeout=25) as x:d=json.load(x)
  (root/(event+'-summary.json')).write_text(json.dumps({'url':u,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'payload':d},ensure_ascii=False),encoding='utf-8')
  out=[]
  for t in d.get('rosters',[]):
   for p in t.get('roster',[]):
    if str(p['athlete']['id']) in ['281121','272512']:
     st={s['name']:s.get('value') for s in p.get('stats',[])};out.append({'playerId':p['athlete']['id'],'teamId':t['team']['id'],'appearances':st.get('appearances'),'starter':p.get('starter'),'subbedIn':p.get('subbedIn'),'subbedOut':p.get('subbedOut'),'plays':p.get('plays',[]),'statistics':{k:st.get(k) for k in ['totalGoals','goalAssists','totalShots','shotsOnTarget']}})
  c=d['header']['competitions'][0];return {'event':event,'date':c.get('date'),'completed':c['status']['type']['completed'],'players':out}
 except Exception as e:return {'event':event,'error':str(e)}
for x in concurrent.futures.ThreadPoolExecutor(max_workers=6).map(run,jobs.items()):print(json.dumps(x,ensure_ascii=True))
