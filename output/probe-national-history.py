import urllib.request,json
jobs=[('scoreboard','https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.worldq.uefa/scoreboard?dates=20250701-20260630&limit=1000'),('friendly','https://site.api.espn.com/apis/site/v2/sports/soccer/international.friendly/scoreboard?dates=20250701-20260630&limit=1000'),('leagues','https://sports.core.api.espn.com/v2/sports/soccer/athletes/277385/leagues?limit=100')]
for name,url in jobs:
 try:
  with urllib.request.urlopen(url,timeout=25) as x:d=json.load(x)
  if name=='leagues':print(name,[x.get('$ref') for x in d.get('items',[])])
  else:print(name,'events',len(d.get('events',[])),'keys',list(d),'first',[(x.get('id'),x.get('date'),x.get('season'),x.get('status',{}).get('type',{}).get('completed')) for x in d.get('events',[])[:1]],'last',[(x.get('id'),x.get('date')) for x in d.get('events',[])[-1:]])
 except Exception as e:print(name,str(e))
