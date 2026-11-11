import urllib.request,json,concurrent.futures,datetime
from pathlib import Path
jobs=[('saliba','277385','eng.1'),('bradley','250183','eng.1'),('leoni','380082','eng.1'),('chambers','32572','eng.1'),('mabaya','329177','eng.1'),('ekitike','304901','eng.1'),('caqueret','265912','ita.1')]
out=Path('data/raw/champions-domestic-seven-2026-11-11');out.mkdir(parents=True,exist_ok=True)
def run(j):
 name,pid,league=j;u=f'https://sports.core.api.espn.com/v2/sports/soccer/leagues/{league}/seasons/2026/athletes/{pid}/eventlog?limit=100'
 try:
  req=urllib.request.Request(u,headers={'Accept':'application/json','User-Agent':'serie-a-domestic-audit/1.0'})
  with urllib.request.urlopen(req,timeout=25) as x:d=json.load(x)
  raw={'url':u,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'payload':d};(out/(name+'-eventlog-season2026.json')).write_text(json.dumps(raw,ensure_ascii=False),encoding='utf-8')
  return name,{'url':u,'keys':list(d),'ref':d.get('$ref'),'count':d.get('events',{}).get('count'),'items':d.get('events',{}).get('items',[])[:1]}
 except Exception as e:return name,{'error':str(e),'url':u}
for name,d in concurrent.futures.ThreadPoolExecutor(max_workers=7).map(run,jobs):print(name,json.dumps(d)[:1500])
