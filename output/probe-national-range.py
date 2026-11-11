import urllib.request,json,concurrent.futures,re
urls=['https://sports.core.api.espn.com/v2/sports/soccer/leagues?limit=1000']+[f'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/scoreboard?{q}' for q in ['dates=20250901-20250930&limit=1000','dates=20250901-20250930&limit=100','dates=20250905','dates=20250901-20250907&limit=1000','dates=20250901-20250930&limit=1000&groups=50']]
def run(u):
 try:
  with urllib.request.urlopen(u,timeout=25) as f:d=json.load(f)
  if 'items' in d:return {'url':u,'internationalSlugs':[x['$ref'].split('/leagues/')[1].split('?')[0] for x in d['items'] if re.search('/leagues/(fifa|uefa\\.(euro|nations)|caf\\.(nations|cosafa)|afc\\.(asian|saff)|conmebol\\.america|concacaf\\.(gold|nations)|global\\.)',x['$ref'])]}
  es=d.get('events',[]);return {'url':u,'keys':list(d),'n':len(es),'league':[l.get('name') for l in d.get('leagues',[])],'sample':[(e['id'],e['date']) for e in es[:2]],'last':[(e['id'],e['date']) for e in es[-2:]]}
 except Exception as e:return {'url':u,'error':str(e)}
for d in concurrent.futures.ThreadPoolExecutor(max_workers=5).map(run,urls):print(json.dumps(d))
