import urllib.request,json,concurrent.futures
urls=['https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/scoreboard?dates=20250901-20250930&limit=100','https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.friendly/scoreboard?dates=20250901-20250930&limit=100','https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/scoreboard?dates=20250901-20250930&limit=1000','https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/scoreboard?dates=20250905']
def run(u):
 try:
  with urllib.request.urlopen(u,timeout=20) as x:d=json.load(x)
  return u,{'events':len(d.get('events',[])),'keys':list(d),'errors':d.get('errors'),'leagues':[(x.get('slug'),x.get('name')) for x in d.get('leagues',[])],'sample':[(x['id'],x['date']) for x in d.get('events',[])[:2]]}
 except Exception as e:return u,str(e)
for x in concurrent.futures.ThreadPoolExecutor(max_workers=4).map(run,urls):print(json.dumps(x))
