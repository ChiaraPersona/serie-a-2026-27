import urllib.request,json,concurrent.futures
urls=['https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/scoreboard?dates=20260331','https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260630','https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.friendly/summary?event=749917','https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/summary?event=761954']
def run(u):
 try:
  with urllib.request.urlopen(u,timeout=25) as f:d=json.load(f)
  if 'events' in d:return {'url':u,'events':[{'id':e['id'],'date':e.get('date'),'name':e.get('name'),'status':e.get('status'),'competition':[{k:c.get(k) for k in ['id','date','status','type']} for c in e.get('competitions',[])]} for e in d['events']]}
  h=d.get('header',{});rosters=d.get('rosters',[]);return {'url':u,'header':{k:h.get(k) for k in ['id','season','league','gameNote','competitions']},'team':rosters[0].get('team') if rosters else None,'playerKeys':list(rosters[0]['roster'][0]) if rosters and rosters[0].get('roster') else None}
 except Exception as e:return {'url':u,'error':str(e)}
for d in concurrent.futures.ThreadPoolExecutor(max_workers=4).map(run,urls):print(json.dumps(d)[:6500])
