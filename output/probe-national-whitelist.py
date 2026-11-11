import urllib.request,json,re,concurrent.futures
u='https://sports.core.api.espn.com/v2/sports/soccer/leagues?limit=1000'
with urllib.request.urlopen(u) as f:d=json.load(f)
slugs=[x['$ref'].split('/leagues/')[1].split('?')[0] for x in d['items']];print('other continental', [s for s in slugs if s.startswith(('afc.','caf.','concacaf.','fifa.','global.'))])
urls=[f'https://sports.core.api.espn.com/v2/sports/soccer/leagues/{s}' for s in ['fifa.friendly','fifa.worldq.uefa','caf.cosafa','afc.saff.championship','global.gulf_cup','global.finalissima','fifa.wcq.ply']]
def run(u):
 try:
  with urllib.request.urlopen(u,timeout=25) as f:d=json.load(f)
  return {'url':u,'name':d.get('name'),'slug':d.get('slug'),'isTournament':d.get('isTournament'),'gender':d.get('gender'),'keys':list(d)[:25]}
 except Exception as e:return {'url':u,'error':str(e)}
for d in concurrent.futures.ThreadPoolExecutor(max_workers=6).map(run,urls):print(json.dumps(d))
