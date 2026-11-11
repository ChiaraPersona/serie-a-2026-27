import urllib.request,json
for league in ['fifa.worldq.uefa','fifa.friendly']:
 u=f'https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard?dates=20250905'
 with urllib.request.urlopen(u,timeout=20) as x:d=json.load(x)
 l=d.get('leagues',[{}])[0];print(league,list(l));print(json.dumps({k:v for k,v in l.items() if 'calendar' in k.lower() or 'season' in k.lower()})[:2300])
