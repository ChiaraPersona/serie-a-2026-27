import urllib.request,json,concurrent.futures
urls=['https://sports.core.api.espn.com/v2/sports/soccer/leagues?limit=1000','https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/scoreboard?dates=20250701-20260630&limit=1000','https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.friendly/scoreboard?dates=20250701-20260630&limit=1000','https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20250701-20260630&limit=1000']
def run(u):
 try:
  with urllib.request.urlopen(u,timeout=25) as f:d=json.load(f)
  if 'items' in d:return {'url':u,'keys':list(d),'count':d.get('count'),'pageCount':d.get('pageCount'),'items':[x.get('$ref') for x in d['items']]}
  es=d.get('events',[]);return {'url':u,'keys':list(d),'leagues':[{'slug':x.get('slug'),'name':x.get('name')} for x in d.get('leagues',[])],'events':len(es),'first':[(e.get('id'),e.get('date'),e.get('season')) for e in es[:2]],'last':[(e.get('id'),e.get('date')) for e in es[-2:]]}
 except Exception as e:return {'url':u,'error':str(e)}
for d in concurrent.futures.ThreadPoolExecutor(max_workers=4).map(run,urls):print(json.dumps(d))
