"""Join audited historical club ratings to canonical past UEFA matches only."""
import pathlib,json,gzip,datetime,collections,hashlib,bisect
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'data/analysis/champions/opta-historical-feasibility-2026-11-18'
HISTORY=ROOT/'data/normalized/uefa-europe-history-2023-26.json'
MAX_AGE_DAYS=7
# Collector timestamps have no documented timezone. Keep two complete date
# boundaries between observation date and match date in this diagnostic cohort.
MIN_AGE_DAYS=2

def main():
    by_id=collections.defaultdict(dict)
    with gzip.open(OUT/'historical-club-ratings.jsonl.gz','rt',encoding='utf-8') as f:
        for line in f:
            r=json.loads(line);key=str(r['uefaTeamId'])
            old=by_id[key].get(r['date'])
            # If the collector ran repeatedly, use the earliest observation of
            # the date: the latest capture might include later information.
            if old is None or r['collectorUpdatedAt']<old['collectorUpdatedAt']:by_id[key][r['date']]=r
    dates={k:sorted(v) for k,v in by_id.items()}
    history=json.loads(HISTORY.read_text(encoding='utf-8'))
    def prior(team,date):
        key=str(team['id']); ds=dates.get(key,[])
        bound=(datetime.date.fromisoformat(date)-datetime.timedelta(days=MIN_AGE_DAYS)).isoformat()
        i=bisect.bisect_right(ds,bound)-1
        if i<0:return None
        r=by_id[key][ds[i]];lag=(datetime.date.fromisoformat(date)-datetime.date.fromisoformat(r['date'])).days
        if lag>MAX_AGE_DAYS:return None
        return r
    pairs=[];excluded=collections.Counter()
    for m in sorted(history['matches'],key=lambda m:(m['date'],str(m['id']))):
        if str(m['homeTeam']['id']) not in by_id or str(m['awayTeam']['id']) not in by_id:
            excluded['unmapped_team']+=1;continue
        h,a=prior(m['homeTeam'],m['date']),prior(m['awayTeam'],m['date'])
        if not h or not a:excluded['missing_recent_pre_match_rating']+=1;continue
        s=m.get('score90',{})
        if not all(type(s.get(k)) is int and s[k]>=0 for k in ('home','away')):
            excluded['invalid_regulation_score']+=1;continue
        assert h['date']<m['date'] and a['date']<m['date']
        pairs.append(dict(fixtureId=m['id'],date=m['date'],season=m['season'],competition=m['competitionCode'],homeTeam=m['homeTeam'],awayTeam=m['awayTeam'],homeRating=h,awayRating=a,score90=s,temporalEvidence='INDEPENDENT_COLLECTOR_DATE_NOT_PROVIDER_CERTIFIED'))
    assert len({r['fixtureId'] for r in pairs})==len(pairs)
    summary=dict(matches=len(pairs),bySeason=dict(collections.Counter(r['season'] for r in pairs)),byCalendarYear=dict(collections.Counter(r['date'][:4] for r in pairs)),minDate=min((r['date'] for r in pairs),default=None),maxDate=max((r['date'] for r in pairs),default=None),excluded=dict(excluded),minimumLagDays=MIN_AGE_DAYS,maximumLagDays=MAX_AGE_DAYS,fitPerformed=False,providerPublicationTimeVerified=False,historySha256=hashlib.sha256(HISTORY.read_bytes()).hexdigest())
    with gzip.open(OUT/'historical-match-pairs.jsonl.gz','wt',encoding='utf-8') as f:
        for r in pairs:f.write(json.dumps(r,ensure_ascii=False)+'\n')
    (OUT/'historical-pair-coverage.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary))

if __name__=='__main__':main()
