"""Acquire verified previous-season club totals only for gaps with known ESPN IDs."""
import concurrent.futures, datetime, gzip, json, re, threading, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'data/raw/champions-club-history-supplement/2025-26'
lock=threading.Lock();season_cache={}
def request(url,key):
 file=CACHE/(key+'.json.gz')
 if file.exists():return json.loads(gzip.decompress(file.read_bytes()))
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'Accept':'application/json'}),timeout=20) as r:payload=json.load(r)
  raw={'url':url,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'payload':payload}
  file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(gzip.compress(json.dumps(raw,ensure_ascii=False).encode('utf-8')));return raw
 except Exception as exc:return {'url':url,'error':str(exc)}
def allowed(league):
 return bool(re.fullmatch(r'[a-z]{3}\.[1-4]',league) or re.fullmatch(r'uefa\.(champions|europa|europa\.conf)(_qual)?',league) or league in ['eng.fa','eng.league_cup','ita.coppa_italia','ger.dfb_pokal','fra.coupe_de_france','esp.copa_del_rey','por.taca.portugal','tur.cup'])
def worker(player):
 pid=player['providerPlayerId'];index=request(f'https://sports.core.api.espn.com/v2/sports/soccer/athletes/{pid}/leagues?limit=100',f'{pid}-leagues')
 entries=[];errors=[]
 if index.get('error'):return {**player,'entries':[],'errors':[index]}
 leagues=[]
 for item in index['payload'].get('items',[]):
  m=re.search(r'/leagues/([^?]+)',item.get('$ref',''))
  if m and allowed(m[1]):leagues.append(m[1])
 for league in sorted(set(leagues)):
  with lock:
   if league not in season_cache:season_cache[league]=request(f'https://sports.core.api.espn.com/v2/sports/soccer/leagues/{league}/seasons/2025?lang=en&region=us',league+'-season')
   season=season_cache[league]
  if season.get('error'):errors.append({'league':league,'stage':'season','error':season['error']});continue
  meta=season['payload'];label=meta.get('displayName','')
  seasonLabel='2025/26' if re.search(r'2025[-/](?:26|2026)\b',label) else '2025' if re.match(r'^2025\b',label) and meta.get('year')==2025 and '2026' not in label else None
  if not seasonLabel:errors.append({'league':league,'stage':'season-label','label':label});continue
  value=request(f'https://sports.core.api.espn.com/v2/sports/soccer/leagues/{league}/seasons/2025/types/1/athletes/{pid}/statistics/0?lang=en&region=us',f'{pid}-{league}')
  if value.get('error'):errors.append({'league':league,'stage':'statistics','error':value['error']});continue
  reference=value['payload'].get('$ref','')
  if f'/leagues/{league}/seasons/2025/' not in reference or f'/athletes/{pid}/' not in reference:
   errors.append({'league':league,'stage':'statistics-identity','reference':reference});continue
  stats={s['name']:s['value'] for c in value['payload'].get('splits',{}).get('categories',[]) for s in c.get('stats',[]) if isinstance(s.get('value'),(int,float))}
  if stats.get('appearances',0)>0:entries.append({'league':league,'seasonLabel':seasonLabel,'competition':label,'stats':stats,'sourceUrl':value['url'],'retrievedAt':value['retrievedAt'],'clubAttribution':'historical-club-not-inferred'})
 return {**player,'entries':entries,'errors':errors}
def main():
 context=json.loads((ROOT/'data/normalized/champions-player-history-context-2025-26.json').read_text(encoding='utf-8'))
 players=[{'teamId':t['teamId'],'team':t['team'],'playerId':p['playerId'],'name':p['name'],'providerPlayerId':p['providerPlayerId']} for t in context['teams'] for p in t['players'] if not p.get('club') and p.get('providerPlayerId')]
 results=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  for n,row in enumerate(pool.map(worker,players),1):
   results.append(row)
   if n%20==0:print(f"Club gaps checked {n}/{len(players)}; positive histories {sum(bool(x['entries']) for x in results)}",flush=True)
 target=ROOT/'data/sources/champions-player-club-history-supplement-2025-26.json'
 previous=json.loads(target.read_text(encoding='utf-8')) if target.exists() else {'players':[]}
 merged={(p['teamId'],p['playerId']):p for p in previous['players']}
 merged.update({(p['teamId'],p['playerId']):p for p in results})
 all_results=list(merged.values())
 output={'schemaVersion':1,'season':'2025/26','policy':'Positive explicitly labelled seasonal club statistics; no inferred zero or historical club attribution; no national or youth competitions mixed in.','players':all_results,'summary':{'checked':len(all_results),'withPositiveHistory':sum(bool(x['entries']) for x in all_results),'withErrors':sum(bool(x['errors']) for x in all_results)}}
 target.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(output['summary']),flush=True)
if __name__=='__main__':main()
