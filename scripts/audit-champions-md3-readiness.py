"""Offline package-2 closure and MD3 preparation; never imports or predicts."""
import collections
import csv
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'data/analysis/champions/md3-readiness-2026-10-19'
TEAM_ONLY={'slavia-praha','sabah','slovan-bratislava','shakhtar-donetsk'}
def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def write(name,data): (BASE/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def csvread(name): return list(csv.DictReader(next((BASE/'input').rglob(name)).open(encoding='utf-8-sig',newline='')))
current=read('data/normalized/champions-player-stats-2026-27.json')
history=read('data/normalized/champions-player-stats-2025-26.json')
registered=read('data/normalized/champions-registered-squads-2026-27.json')
source=read('data/sources/champions-pilot-match-stats-2025-27.json')
calendar=read('data/normalized/champions-league-2026-27.json')
odds=read('data/normalized/odds/sisal/champions-league.json')
ledger=read('data/sources/champions-package1-performances-2026-10-19.json')
teams={t['id']:t for t in current['teams']}
hist={t['id']:t for t in history['teams']}
reg={t['id']:t for t in registered['teams']}
config={t['id']:t for t in source['teams']}
leagueLabels={'ned.1':'Eredivisie','tur.1':'tur.1','aut.1':'Bundesliga austriaca'}
audit=[]
for row in csvread('audit_34.csv'):
    t=teams.get(row['matched_team_id'])
    ps=[p for p in (t or {}).get('players',[]) if str(p.get('providerPlayerId'))==row['player_id_espn']]
    matches=[]
    if len(ps)==1:
        for e in (ps[0].get('currentSeason') or {}).get('entries',[]):
            if e.get('competition')!=leagueLabels.get(row['league'],row['league']): continue
            if e.get('teamId', (t or {}).get('espnTeamId'))!=row['team_id_espn']: continue
            matches.extend(m for m in e.get('matches',[]) if str(m['matchId'])==row['event_id'] and m.get('date')==row['date'])
    flags=[flag for flag in row['quality_flags'].split('|') if flag]
    if t and t['espnTeamId']!=row['team_id_espn'] and 'TEAM_ROSTER_CONFLICT' not in flags: flags.append('TEAM_ROSTER_CONFLICT')
    disposition='duplicate' if matches else 'quarantine' if row['decision']=='QUARANTINE' else 'new-unapproved-review-required'
    audit.append({**row,'localMatchCount':len(matches),'localCanonicalPlayerId':ps[0]['id'] if len(ps)==1 else None,'localDisposition':disposition,'localFlags':flags})
assert len(audit)==34
assert len({(r['league'],r['event_id'],r['player_id_espn']) for r in audit})==34
counts=dict(collections.Counter(r['localDisposition'] for r in audit))
dedupKeys={(r['competition'],r['event_id'],r['player_id_espn']) for r in csvread('six_candidate_dedup.csv')}
assert dedupKeys=={(r['league'],r['event_id'],r['player_id_espn']) for r in audit if r['localDisposition']=='duplicate'}
write('package2-row-audit.json',audit)
write('package2-summary.json',{'candidates':34,'dispositions':counts,'imported':0,'quarantineReasons':dict(collections.Counter(f for r in audit if r['localDisposition']=='quarantine' for f in r['localFlags'])),'dedupReportRechecked':len(csvread('six_candidate_dedup.csv')),'package1Performances':len(ledger['performances'])})

teamReports=[]
for teamId,t in teams.items():
    cfg=config[teamId]
    collective=[]
    for match in source['matches']:
        side=next((s for s in ['home','away'] if match[s]['providerTeamId']==cfg['espnTeamId']),None)
        if side and match.get('coverage')=='complete':
            own=match[side];other=match['away' if side=='home' else 'home']
            def values(s): return {'goals':s['score'],**s.get('statistics',{})}
            required=['goals','totalShots','shotsOnTarget','wonCorners','foulsCommitted','yellowCards']
            valid=all(isinstance(values(s).get(k),(int,float)) for s in (own,other) for k in required)
            collective.append({'eventId':match['eventId'],'date':match['date'],'season':match['season'],'venue':side,'metricsFinite':valid})
    home=sum(m['venue']=='home' for m in collective);away=len(collective)-home
    usable=len(collective)>=6 and home>=2 and away>=2 and all(m['metricsFinite'] for m in collective)
    def corresponding_team(mapping):
        if teamId in mapping: return mapping[teamId]
        exact=[other for other in mapping.values() if other['team']==t['team']]
        assert len(exact)==1, f'{teamId}: unresolved team identity'
        return exact[0]
    historicTeam=corresponding_team(hist);registeredTeam=corresponding_team(reg)
    problems=[];usableCurrent=0;usableHistory=0;both=0;currentOnly=[];historyOnly=[];ids=[];providers=collections.defaultdict(list)
    for p in t['players']:
        def corresponding_player(players,provider_field):
            direct=[x for x in players if x['id']==p['id']]
            if len(direct)==1:return direct[0]
            exact=[x for x in players if p.get('providerPlayerId') and str(provider_field(x))==str(p['providerPlayerId'])]
            if len(exact)==1:return exact[0]
            # Membership diagnostic only: exact spelling is not an operational provider-ID mapping.
            named=[x for x in players if x['name']==p['name']]
            return named[0] if len(named)==1 else None
        h=corresponding_player(historicTeam['players'],lambda x:x.get('providerPlayerId'))
        r=corresponding_player(registeredTeam['players'],lambda x:x.get('providerIds',{}).get('espn'))
        cs=(p.get('currentSeason') or {}).get('totals') or {};hs=(h or {}).get('previousSeason') or {};hs=hs.get('totals') or {}
        cur=cs.get('minutes') is not None and cs['minutes']>0 and all(cs.get(k) is not None for k in ('shots','shotsOnTarget'))
        old=hs.get('minutes') is not None and hs['minutes']>0 and all(hs.get(k) is not None for k in ('shots','shotsOnTarget'))
        usableCurrent+=cur;usableHistory+=old;both+=cur and old
        if cur and not old:currentOnly.append(p['id'])
        if old and not cur:historyOnly.append(p['id'])
        flags=[]
        if not r: flags.append('NOT_IN_REGISTERED_SQUAD')
        elif r['id']!=p['id']: flags.append('REGISTRY_CANONICAL_ID_ALIAS_REQUIRES_EXACT_PROVIDER_JOIN' if p.get('providerPlayerId') else 'REGISTRY_NAME_ONLY_PROVIDER_UNRESOLVED')
        if not p.get('providerPlayerId'):flags.append('PROVIDER_ID_MISSING')
        if r and r.get('providerIds',{}).get('espn') and str(r['providerIds']['espn'])!=str(p.get('providerPlayerId')):flags.append('REGISTRY_PROVIDER_ID_DISAGREEMENT')
        if p.get('providerPlayerId'):providers[p['providerPlayerId']].append(p['id'])
        if not cur:flags.append('CURRENT_SHOTS_SOT_OR_MINUTES_UNAVAILABLE')
        if not old:flags.append('HISTORICAL_SHOTS_SOT_OR_MINUTES_UNAVAILABLE')
        elif hs['minutes']<700:flags.append('LIMITED_HISTORY_UNDER_EXISTING_700_MIN_LABEL')
        if cur and cs['shotsOnTarget']>cs['shots']:flags.append('CURRENT_SOT_EXCEEDS_SHOTS')
        if old and hs['shotsOnTarget']>hs['shots']:flags.append('HISTORICAL_SOT_EXCEEDS_SHOTS')
        if flags and teamId not in TEAM_ONLY:
            problems.append({'playerId':p['id'],'providerPlayerId':p.get('providerPlayerId'),'name':p['name'],'position':p['position'],'md3Role':'unassigned-lineup-and-bench-missing','currentMinutes':cs.get('minutes'),'historicalMinutes':hs.get('minutes'),'currentShots':cs.get('shots'),'currentSOT':cs.get('shotsOnTarget'),'flags':flags})
    for provider,players in providers.items():
        if len(players)>1:ids.append({'providerPlayerId':provider,'players':players,'reason':'MULTIPLE_CANONICAL_PLAYERS_SAME_PROVIDER_ID'})
    teamReports.append({'teamId':teamId,'team':t['team'],'historicalTeamId':historicTeam['id'],'registeredTeamId':registeredTeam['id'],'mode':'collective-only' if teamId in TEAM_ONLY else 'individual-evidence-review','rosterPlayers':len(t['players']),'individualForecastsAllowed':teamId not in TEAM_ONLY,'currentUsable':None if teamId in TEAM_ONLY else usableCurrent,'historyUsable':None if teamId in TEAM_ONLY else usableHistory,'bothUsable':None if teamId in TEAM_ONLY else both,'currentOnly':[] if teamId in TEAM_ONLY else currentOnly,'historyOnly':[] if teamId in TEAM_ONLY else historyOnly,'problems':problems,'duplicateIdentities':ids,'collective':{'completeMatches':len(collective),'currentSeasonMatches':sum(m['season']=='2026-27' for m in collective),'homeMatches':home,'awayMatches':away,'usableForDetailedVolumes':usable,'lastCompleteDate':max((m['date'] for m in collective),default=None),'teamSourceAsOf':source['asOf']},'individualAsOf':t.get('asOf',current['asOf'])})
write('team-coverage.json',teamReports)
byTeamName={t['team']:t for t in teamReports}
oddsByFixture={e['canonicalMatchId']:e for e in odds['events']}
fixtureReports=[]
for f in calendar['fixtures']:
    if f['matchday']!=3: continue
    sides=[];e=oddsByFixture.get(f['id']);markets=(e or {}).get('markets',[])
    selections=[s for m in markets for s in m.get('selections',[])]
    invalid=[s for s in selections if not s.get('providerSelectionId') or (s.get('status')=='open' and (not isinstance(s.get('odds'),(int,float)) or s['odds']<=1))]
    for side in ('home','away'):
        tr=byTeamName[f[side+'Team']];lineup=(f.get('probableFormation') or {}).get(side) or {}
        sides.append({'teamId':tr['teamId'],'team':tr['team'],'mode':tr['mode'],'individualForecastsAllowed':tr['individualForecastsAllowed'],'collectiveDetailedReady':tr['collective']['usableForDetailedVolumes'],'lineupCount':len(lineup.get('players') or []),'benchCount':len(lineup.get('bench') or []),'blockers':(['COLLECTIVE_ONLY_BY_USER'] if not tr['individualForecastsAllowed'] else ['CURRENT_SEASON_ENGINE_LINK_AWAITING_APPROVAL'])+(['MD3_LINEUP_MISSING'] if len(lineup.get('players') or [])!=11 else [])+(['MD3_BENCH_UNAVAILABLE'] if not lineup.get('bench') else [])})
    fixtureReports.append({'fixtureId':f['id'],'date':f['date'],'home':f['homeTeam'],'away':f['awayTeam'],'sides':sides,'odds':{'eventPresent':bool(e),'retrievedAt':(e or {}).get('retrievedAt'),'markets':len(markets),'selections':len(selections),'openQuotedSelections':sum(s.get('status')=='open' and isinstance(s.get('odds'),(int,float)) and s['odds']>1 for s in selections),'suspendedSelections':sum(s.get('status')=='suspended' for s in selections),'invalidSelections':len(invalid),'playerShotsMarkets':sum(m.get('marketCode')=='28507' for m in markets),'playerSOTMarkets':sum(m.get('marketCode')=='28506' for m in markets),'marketsMissingId':sum(not m.get('providerMarketId') for m in markets),'duplicateSelectionIds':len(selections)-len({s.get('providerSelectionId') for s in selections})},'individualGenerationReady':False,'definitiveGenerationAuthorized':False})
assert len(fixtureReports)==18 and len(teamReports)==36
for f in fixtureReports:
    event=oddsByFixture.get(f['fixtureId']) or {}
    f['odds']['canonicalDateMatches']=event.get('canonicalDate')==f['date']
write('md3-preparation-manifest.json',{'schemaVersion':1,'scope':'internal-preparation-only','matchday':3,'engineLinked':False,'definitiveGenerationAuthorized':False,'collectiveOnlyTeams':sorted(TEAM_ONLY),'teamStatisticsAsOf':source['asOf'],'individualStatisticsAsOf':current['asOf'],'fixtures':fixtureReports})
before=read(str((BASE/'protected-before.json').relative_to(ROOT)))
changed=[]
for p,h in before.items():
    file=ROOT/p
    if not file.exists() or hashlib.sha256(file.read_bytes()).hexdigest()!=h:changed.append(p)
ownChanges=['scripts/test-champions-current-season-data.js']
concurrentChanges=[p for p in changed if p not in ownChanges]
assert not any(p.startswith('data/') for p in changed), 'Production data or Package 1 changed during audit'
assert not any(p.startswith('scripts/') and p not in ownChanges for p in changed), 'Production builder changed during audit'
write('protected-verification.json',{'existingFilesChecked':len(before),'allowedChanged':[p for p in changed if p in ownChanges],'concurrentChangesPreserved':concurrentChanges,'package1Unchanged':True,'dataUnchanged':True})
print(json.dumps({'package2':counts,'teams':len(teamReports),'individualTeams':sum(t['individualForecastsAllowed'] for t in teamReports),'fixtures':len(fixtureReports),'oddsEvents':sum(f['odds']['eventPresent'] for f in fixtureReports),'collectiveOnlyDetailed':{t['teamId']:t['collective']['usableForDetailedVolumes'] for t in teamReports if not t['individualForecastsAllowed']},'protected':len(before)}))
