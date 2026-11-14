"""Acquire dated senior national scoreboards and match summaries; never build forecasts."""
import concurrent.futures, datetime, gzip, hashlib, json, re, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCOPE = json.loads((ROOT/'data/sources/champions-senior-national-history-scope-2025-26.json').read_text(encoding='utf-8'))
CACHE = ROOT/'data/raw/champions-senior-national-history/2025-26'
LEAGUES = SCOPE['officialLeagues'] + SCOPE['friendlyLeagues']
MONTHS = [f'2025{m:02d}' for m in range(7,13)] + [f'2026{m:02d}' for m in range(1,7)]

def acquire(url, relative):
    file = CACHE/relative
    if file.exists():
        return json.loads(gzip.decompress(file.read_bytes()))
    error = None
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={'Accept':'application/json','User-Agent':'champions-senior-history/1.0'})
            with urllib.request.urlopen(req, timeout=25) as response:
                payload = json.load(response)
            raw = {'url':url, 'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'payload':payload}
            file.parent.mkdir(parents=True,exist_ok=True)
            file.write_bytes(gzip.compress(json.dumps(raw,ensure_ascii=False).encode('utf-8')))
            return raw
        except Exception as exc:
            error = str(exc)
            if attempt == 0: time.sleep(.3)
    return {'url':url,'error':error}

def scoreboard(job):
    league, month = job
    relative = f'scoreboards/{league}/{month}.json.gz'
    raw = acquire(f'https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard?dates={month}&limit=1000', relative)
    if raw.get('error'): return {'league':league,'month':month,'error':raw['error'],'url':raw['url']}
    payload = raw['payload']
    actual = [l.get('slug') for l in payload.get('leagues',[])]
    if actual != [league]: return {'league':league,'month':month,'error':'unexpected league identity','actual':actual}
    events=[]
    for e in payload.get('events',[]):
        date=e.get('date','')[:10]
        comp=(e.get('competitions') or [{}])[0]
        if SCOPE['from'] <= date <= SCOPE['to'] and comp.get('status',e.get('status',{})).get('type',{}).get('completed'):
            events.append({'eventId':str(e['id']),'league':league,'date':date,'name':e.get('name'),'status':comp.get('status',e.get('status',{})),'nationalScope':'friendly' if league in SCOPE['friendlyLeagues'] else 'official'})
    return {'league':league,'month':month,'events':events,'returnedCount':len(payload.get('events',[])),'rawFile':str((CACHE/relative).relative_to(ROOT)).replace('\\','/'),'url':raw['url']}

def core_index(league):
    url=f"https://sports.core.api.espn.com/v2/sports/soccer/leagues/{league}/events?dates={SCOPE['from'].replace('-','')}-{SCOPE['to'].replace('-','')}&limit=1000"
    raw=acquire(url,f'indices/{league}.json.gz')
    if raw.get('error'):return {'league':league,'error':raw['error'],'url':url}
    payload=raw['payload'];items=list(payload.get('items',[]))
    for page in range(2,payload.get('pageCount',1)+1):
        extra=acquire(url+f'&page={page}',f'indices/{league}-page-{page}.json.gz')
        if extra.get('error'):return {'league':league,'error':extra['error'],'url':url}
        items.extend(extra['payload'].get('items',[]))
    events=[]
    for item in items:
        match=re.search(r'/leagues/([^/]+)/events/(\d+)',item.get('$ref',''))
        if not match or match[1]!=league:raise ValueError('Unexpected core event namespace')
        events.append({'eventId':match[2],'league':league,'date':None,'nationalScope':'friendly' if league in SCOPE['friendlyLeagues'] else 'official'})
    return {'league':league,'events':events,'count':payload.get('count'),'url':url}

def summary(event):
    relative=f"summaries/{event['league']}/{event['eventId']}.json.gz"
    raw=acquire(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{event['league']}/summary?event={event['eventId']}",relative)
    if raw.get('error'):return {**event,'error':raw['error'],'url':raw['url']}
    payload=raw['payload'];header=payload.get('header',{});comp=(header.get('competitions') or [{}])[0]
    date=comp.get('date',header.get('date',''))[:10]
    if not SCOPE['from']<=date<=SCOPE['to'] or not comp.get('status',{}).get('type',{}).get('completed'):
        return {**event,'excluded':'outside-period-or-not-completed','actualDate':date}
    if str(header.get('id'))!=event['eventId'] or event['date'] is not None and date!=event['date']:
        return {**event,'error':'fixture identity/date/completion mismatch','url':raw['url']}
    return {**event,'date':date,'rawFile':str((CACHE/relative).relative_to(ROOT)).replace('\\','/'),'url':raw['url'],'sha256':hashlib.sha256((CACHE/relative).read_bytes()).hexdigest(),'rosters':len(payload.get('rosters',[]))}

def main():
    boards=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for n,row in enumerate(pool.map(scoreboard,[(l,m) for l in LEAGUES for m in MONTHS]),1):
            boards.append(row)
            if n%48==0:print(f'Scoreboards {n}/{len(LEAGUES)*len(MONTHS)}',flush=True)
    events={}
    for row in boards:
        for event in row.get('events',[]):
            old=events.get(event['eventId'])
            if old and (old['league']!=event['league'] or old['date']!=event['date']):raise ValueError('Conflicting fixture identity')
            events[event['eventId']]=event
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        indices=list(pool.map(core_index,LEAGUES))
    additional=0
    for index in indices:
        for event in index.get('events',[]):
            if event['eventId'] not in events:
                events[event['eventId']]=event;additional+=1
    print(f'Additional core event references: {additional}',flush=True)
    print(f"Discovered {len(events)} completed senior fixtures; scoreboard errors {sum('error' in b for b in boards)}",flush=True)
    summaries=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for n,row in enumerate(pool.map(summary,events.values()),1):
            summaries.append(row)
            if n%100==0:print(f'Referti {n}/{len(events)}',flush=True)
    excluded=[s for s in summaries if 'excluded' in s]
    summaries=[s for s in summaries if 'excluded' not in s]
    result={'schemaVersion':1,'scope':SCOPE,'scoreboards':boards,'coreIndices':indices,'excluded':excluded,'matches':summaries,'summary':{'scoreboards':len(boards),'scoreboardErrors':sum('error' in b for b in boards),'coreIndexErrors':sum('error' in i for i in indices),'completedFixtures':len(summaries),'summaryErrors':sum('error' in s for s in summaries),'withRosters':sum(s.get('rosters',0)==2 for s in summaries)}}
    target=ROOT/'data/sources/champions-senior-national-history-acquisition-2025-26.json'
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result['summary']),flush=True)

if __name__=='__main__':main()
