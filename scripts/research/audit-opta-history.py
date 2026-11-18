"""Audit a downloaded independent Opta archive; write research artifacts only."""
import csv, json, pathlib, hashlib, datetime, collections, gzip

ROOT = pathlib.Path(__file__).resolve().parents[2]
RAW = ROOT / 'data/raw/opta-history/2026-11-18/opta-club-rankings.csv'
MAPPING = ROOT / 'data/raw/opta-history/2026-11-18/team-mapping.csv'
OUT = ROOT / 'data/analysis/champions/opta-historical-feasibility-2026-11-18'
EXPECTED = '93610d3a9b0712435c21434544e29aafa6e513305fc24fce1c4a6d35e0c97905'

# Explicit reviewed candidates; country corroboration from the collector's
# crosswalk is mandatory. Names alone never resolve homonymous clubs.
IDS = {
 'Arsenal':'4dsgumo7d4zupm2ugsvm4zm4d', 'Bayern München':'apoawtpvac4zqlancmvw4nk4o',
 'Paris Saint-Germain':'2b3mar72yy8d6uvat1ka6tn3r', 'Barcelona':'agh9ifb2mw3ivjusgedj7c3fe',
 'Manchester City':'a3nyxabgsqlnqfkeg41m6tnpp', 'Real Madrid':'3kq9cckrnlogidldtdie2fkbl',
 'Liverpool':'c8h9bw1l82s06h77xxrelzhur', 'Inter':'3vo5mpj7catp66nrwwqiuhuup',
 'Aston Villa':'b496gs285it6bheuikox6z9mj', 'Borussia Dortmund':'dt4pinj0vw0t0cvz7za6mhmzy',
 'Club Brugge':'1oyb7oym5nwzny8vxf03szd2h', 'Como':'6uzfw7ahyxg4wrrfxo5u7qt0n',
 'Atlético de Madrid':'4ku8o6uf87yd8iecdalipo6wd', 'Roma':'2tk2l9sgktwc9jhzqdd4mpdtb',
 'Sporting CP':'7catg5lpivcmpf4xhggh6d8rk', 'Manchester United':'6eqit8ye8aomdsrrq0hk3v7gh',
 'Porto':'66bsnl0zjb7l5akwo00h0y5me', 'Bodø/Glimt':'ctvzi2jbl1q6xzq0s3sexj73g',
 'Leipzig':'9gefq4dz9b2hl8rqrxwrlrzmp', 'Stuttgart':'3dwlvz6cl4lcavvrg0y2dycrt',
 'Real Betis':'ah8dala7suqqkj04n2l8xz4zd', 'PSV Eindhoven':'24fvcruwqrqvqa3aonf8c3zuy',
 'Galatasaray':'esa748l653sss1wurz5ps3228', 'Napoli':'gi0l1habji5hpgar77dl5jqe',
 'Slavia Praha':'8kpapuorr6hf0vosnovbreqqd', 'Villarreal':'74mcjsm72vr3l9pw2i4qfjchj',
 'Lille':'be2k34rut1lz79jxenabttqlc', 'Fenerbahçe':'8lroq0cbhdxj8124qtxwrhvmm',
 'Viking':'bsykw9d70ffqe9atosc92n1e9', 'Lens':'3xedluek08t2ka7oypwuullcn',
 'AEK Athens':'7ruua9q5rtswwi5d6xtquuto5', 'Feyenoord':'20vymiy7bo8wkyxai3ew494fz',
 'LASK':'boxkkgnpn38ywao4kzu7dx58h', 'Shakhtar Donetsk':'cf8plcmeniaen0fc5emyb5j93',
 'Slovan Bratislava':'cmj1019uptq8i042n5y16itbd',
}

def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()

def run():
    assert digest(RAW)==EXPECTED, 'Downloaded archive differs from GitHub digest'
    crosswalk=list(csv.DictReader(MAPPING.open(encoding='utf-8')))
    canonical=json.loads((ROOT/'data/normalized/champions-team-strength-2026-27.json').read_text(encoding='utf-8'))['teams']
    uefa={t['team']:t['uefaTeamId'] for t in json.loads((ROOT/'data/sources/champions-team-history-map-2026-27.json').read_text(encoding='utf-8'))['teams']}
    identities=[]; accepted={}
    for team in canonical:
        name=team['team']; identifier=IDS.get(name)
        evidence=[r for r in crosswalk if r['id_opta']==identifier and r['country']==team['association']]
        status='COLLECTOR_ID_AND_COUNTRY_CORROBORATED' if evidence else 'UNRESOLVED'
        identities.append(dict(team=name,uefaTeamId=uefa[name],association=team['association'],optaContestantId=identifier if evidence else None,candidateId=identifier,status=status,evidence=evidence))
        if evidence: accepted[identifier]=name
    daily=collections.Counter(); selected=[]; malformed=[]; date_errors=0; name_ids=collections.defaultdict(set)
    for index,r in enumerate(csv.DictReader(RAW.open(encoding='utf-8',newline='')),2):
        try:
            rating=float(r['rating']); rank=float(r['rank']); day=datetime.date.fromisoformat(r['date'])
            timestamp=datetime.datetime.strptime(r['updated_at'],'%Y-%m-%d %H:%M:%S')
            assert 0<=rating<=100 and rank>=1 and rank.is_integer() and r['id']
            assert timestamp.date()==day
        except (ValueError,TypeError,KeyError,AssertionError):
            malformed.append({'line':index,'reason':'invalid record or collector date/timestamp disagreement'})
            continue
        daily[r['date']]+=1; name_ids[r['team']].add(r['id'])
        if r['id'] in accepted:
            selected.append(dict(team=accepted[r['id']],optaContestantId=r['id'],uefaTeamId=uefa[accepted[r['id']]],rating=rating,rank=int(rank),date=r['date'],collectorUpdatedAt=r['updated_at'],collectorTimezone=None,rawTeam=r['team'],line=index))
    seen={}; exact_duplicates=0; conflicts=[]
    for r in selected:
        key=(r['optaContestantId'],r['date'],r['collectorUpdatedAt'])
        if key in seen:
            if (seen[key]['rating'],seen[key]['rank'])==(r['rating'],r['rank']):exact_duplicates+=1
            else:conflicts.append({'key':key,'lines':[seen[key]['line'],r['line']]})
        else:seen[key]=r
    counts=collections.Counter(r['team'] for r in selected)
    dates=sorted(daily)
    summary=dict(validRows=sum(daily.values()),invalidRows=len(malformed),minDate=dates[0],maxDate=dates[-1],dates=len(dates),calendarDays=(datetime.date.fromisoformat(dates[-1])-datetime.date.fromisoformat(dates[0])).days+1,selectedRows=len(selected),identityCorroboratedTeams=len(accepted),unresolvedTeams=[r['team'] for r in identities if r['status']=='UNRESOLVED'],selectedExactDuplicateRows=exact_duplicates,selectedConflictingKeys=len(conflicts),currentSeasonRequiredDatesCovered=0,sha256=EXPECTED)
    OUT.mkdir(parents=True,exist_ok=True)
    with gzip.open(OUT/'historical-club-ratings.jsonl.gz','wt',encoding='utf-8') as f:
        for r in selected: f.write(json.dumps(r,ensure_ascii=False)+'\n')
    report=dict(summary=summary,identityLevel='Independent collector crosswalk; not provider-certified and not used operationally',dateLevel='Collector date strings with unspecified timezone; no immutable day-by-day release provenance',malformedRows=malformed,conflicts=conflicts,identities=identities,rowsPerTeam=dict(counts),dailyCounts=dict(sorted(daily.items())),nameAmbiguities={k:sorted(v) for k,v in name_ids.items() if k in ['Arsenal','Liverpool','Barcelona','Aston Villa','Sabah']},source=dict(url='https://github.com/tonyelhabr/club-rankings/releases/download/club-rankings/opta-club-rankings.csv',rawPath=str(RAW.relative_to(ROOT)),size=RAW.stat().st_size,mappingSha256=digest(MAPPING)),limitations=['Archive does not cover September-November 2026.','Hash verifies this file, not original provider correctness or every historical publication timestamp.','No automatic fuzzy matching, filling, extrapolation or calibration.'])
    (OUT/'archive-content-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    assert digest(RAW)==EXPECTED
    print(json.dumps(summary,ensure_ascii=True))

if __name__=='__main__': run()
