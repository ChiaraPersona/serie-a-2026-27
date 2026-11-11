import urllib.request,json,concurrent.futures
slugs=['afc.cupq','caf.championship','concacaf.confederations_playoff']
urls=[f'https://sports.core.api.espn.com/v2/sports/soccer/leagues/{s}' for s in slugs]+[f'https://sports.core.api.espn.com/v2/sports/soccer/leagues/{s}/events?dates={dates}&limit=1000' for s,dates in [('fifa.worldq.uefa','20250101-20250630'),('fifa.worldq.uefa','20250701-20260630'),('fifa.friendly','20250701-20260630'),('fifa.world','20250701-20260630')]]
def run(u):
 try:
  with urllib.request.urlopen(u,timeout=25) as f:d=json.load(f)
  if 'items' not in d:return {'url':u,'name':d.get('name'),'gender':d.get('gender')}
  return {'url':u,'count':d.get('count'),'pageCount':d.get('pageCount'),'items':len(d['items']),'first':d['items'][:1],'last':d['items'][-1:]}
 except Exception as e:return {'url':u,'error':str(e)}
for d in concurrent.futures.ThreadPoolExecutor(max_workers=7).map(run,urls):print(json.dumps(d))
