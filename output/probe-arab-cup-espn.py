import urllib.request,json,concurrent.futures
slugs=['fifa.arab','fifa.arab_cup','fifa.arab.cup','fifa.arabcup','global.arab_cup','global.arab.cup','arab.cup']
def run(s):
 u=f'https://sports.core.api.espn.com/v2/sports/soccer/leagues/{s}'
 try:
  with urllib.request.urlopen(u,timeout=15) as f:d=json.load(f)
  return s,d.get('name'),d.get('slug')
 except Exception as e:return s,str(e)
for d in concurrent.futures.ThreadPoolExecutor(max_workers=7).map(run,slugs):print(json.dumps(d))
