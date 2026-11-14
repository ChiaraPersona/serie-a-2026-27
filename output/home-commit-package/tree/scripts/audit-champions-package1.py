"""Read-only production audit; fetch evidence only into the internal analysis folder."""
import csv
import gzip
import hashlib
import json
from pathlib import Path
import sys
import collections
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/analysis/champions/package1-2026-10-19'
INPUT = OUT / 'input'
def read(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p, obj):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
def csvrows(name):
    return list(csv.DictReader(next(INPUT.rglob(name)).open(encoding='utf-8-sig', newline='')))
def key(r):
    return '|'.join(r[x] for x in ('league', 'event_id', 'player_id_espn'))
def snapshot():
    paths = [p for base in ('data','js','css') for p in (ROOT/base).rglob('*') if p.is_file() and OUT not in p.parents]
    paths += list(ROOT.glob('*.html'))
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
rows = csvrows('candidates_internal_checks.csv')
if '--fetch' in sys.argv:
    if not (OUT/'protected-before.json').exists():
        write(OUT/'protected-before.json', snapshot())
    urls = {r['source_url'] for r in rows}
    def fetch(url):
        event = url.split('event=')[-1]
        target = OUT/'evidence'/f'{event}.json'
        if target.exists():
            return {'event':event,'cached':True}
        try:
            with urllib.request.urlopen(url, timeout=35) as response:
                payload = json.load(response)
            write(target, {'url':url, 'retrievedAt':datetime.now(timezone.utc).isoformat(), 'payload':payload})
            return {'event':event,'ok':True}
        except Exception as exc:
            return {'event':event,'error':str(exc)}
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(fetch, sorted(urls)))
    write(OUT/'fetch-results.json',results)
    print(json.dumps({'events':len(results),'errors':[r for r in results if 'error' in r]}))
else:
    current = read(ROOT/'data/normalized/champions-player-stats-2026-27.json')
    teams = {t['id']:t for t in current['teams']}
    corrections = {key(r):r for r in csvrows('player_match_identity_corrected.csv')}
    resolved = {key(r):r for r in csvrows('needs_review_14_resolved.csv')}
    seen = set()
    audited = []
    fields = {'appearances':'appearances','shots':'totalShots','sot':'shotsOnTarget','goals':'totalGoals','assists':'goalAssists','yellow_cards':'yellowCards','red_cards':'redCards','fouls_committed':'foulsCommitted','fouls_suffered':'foulsSuffered'}
    for original in rows:
        r = dict(original)
        reasons = []
        k = key(r)
        t = teams.get(r['matched_team_id'])
        if t is None:
            candidates = [team for team in teams.values() if any(str(p.get('providerPlayerId'))==r['player_id_espn'] for p in team['players'])]
            if len(candidates)==1:
                t = candidates[0]
        players = [p for p in (t or {}).get('players',[]) if str(p.get('providerPlayerId'))==r['player_id_espn']]
        if len(players)!=1 or str(players[0].get('providerPlayerId'))!=r['player_id_espn']:
            reasons.append('CANONICAL_PLAYER_ID_UNCONFIRMED')
        else:
            r['canonicalTeamId'] = t['id']
            r['canonicalPlayerId'] = players[0]['id']
            r['packageIdCorrectedByExactProviderId'] = t['id']!=r['matched_team_id'] or players[0]['id']!=r['matched_player_id']
        evidence = OUT/'evidence'/f"{r['event_id']}.json"
        minutes = None
        status = 'missing'
        if not evidence.exists():
            reasons.append('SOURCE_UNAVAILABLE')
        else:
            raw = read(evidence)
            d = raw['payload']
            c = d.get('header',{}).get('competitions',[{}])[0]
            if str(d.get('header',{}).get('id'))!=r['event_id'] or c.get('date','')[:10]!=r['date']:
                reasons.append('EVENT_ID_DATE_MISMATCH')
            if d.get('header',{}).get('league',{}).get('slug')!=r['league']:
                reasons.append('COMPETITION_MISMATCH')
            if not c.get('status',{}).get('type',{}).get('completed'):
                reasons.append('NOT_FINISHED')
            if r['date']>'2026-10-19' or r['date']<'2026-07-01':
                reasons.append('OUTSIDE_SEASON_WINDOW')
            roster = [rt for rt in d.get('rosters',[]) if str(rt.get('team',{}).get('id'))==str((t or {}).get('espnTeamId'))]
            athlete = [a for rt in roster for a in rt.get('roster',[]) if str(a.get('athlete',{}).get('id'))==r['player_id_espn']]
            if len(athlete)!=1:
                reasons.append('MATCH_TEAM_PLAYER_ID_UNCONFIRMED')
            else:
                a = athlete[0]
                stats = {s['name']:s.get('value') for s in a.get('stats',[])}
                if stats.get('appearances')!=1:
                    reasons.append('NO_CONFIRMED_APPEARANCE')
                if bool(a.get('starter'))!=(r['starter']=='True'):
                    reasons.append('STARTER_MISMATCH')
                for field,source in fields.items():
                    value = float(r[field]) if r[field] else None
                    if value!=stats.get(source):
                        reasons.append('STAT_MISMATCH_'+field)
                if stats.get('shotsOnTarget') is not None and stats.get('totalShots') is not None and stats['shotsOnTarget']>stats['totalShots']:
                    reasons.append('SOT_EXCEED_SHOTS')
                box = [b for b in d.get('boxscore',{}).get('teams',[]) if str(b.get('team',{}).get('id'))==str((t or {}).get('espnTeamId'))]
                bs = {s['name']:float(s.get('value',s['displayValue'])) for b in box for s in b.get('statistics',[]) if str(s.get('value',s.get('displayValue',''))).replace('.','',1).isdigit()}
                if bs.get('totalShots') is None or bs.get('shotsOnTarget') is None or bs.get('totalShots')==0:
                    reasons.append('TEAM_ATTACK_UNVERIFIED')
                # The existing builder estimates elapsed minutes from substitution clocks.
                # No such estimate is labelled observed or verified.
                import re
                sub = next((p for p in a.get('plays',[]) if p.get('substitution') and p.get('clock',{}).get('displayValue')),None)
                match = re.search(r'\d+',sub['clock']['displayValue']) if sub else None
                minute = int(match[0]) if match else None
                if a.get('starter'):
                    minutes = min(90,minute) if a.get('subbedOut') and minute is not None else (None if a.get('subbedOut') else 90)
                elif a.get('subbedIn') and minute is not None:
                    minutes = max(0,90-min(90,minute))
                status = 'estimated' if minutes is not None else 'missing'
                r['evidencePlayerName'] = a['athlete'].get('fullName')
                r['evidenceRetrievedAt'] = raw['retrievedAt']
        duplicate = k in seen
        seen.add(k)
        if players:
            duplicate = duplicate or any(str(m['matchId'])==r['event_id'] for e in (players[0].get('currentSeason') or {}).get('entries',[]) for m in e.get('matches',[]) if e.get('competition')=={'eng.1':'Premier League','esp.1':'LaLiga','ger.1':'Bundesliga','ita.1':'Serie A','fra.1':'Ligue 1','por.1':'Primeira Liga','ned.1':'Eredivisie','bel.1':'Pro League','gre.1':'Super League Greece','nor.1':'Eliteserien'}.get(r['league'],r['league']))
        r.update(auditKey=k, reasons=reasons, disposition='quarantine' if reasons else 'duplicate' if duplicate else 'approved', minutesObserved=None, minutesEstimated=minutes, minutesStatus=status, identityCorrectionReviewed=k in corrections, resolved14Reviewed=k in resolved)
        audited.append(r)
    write(OUT/'row-audit.json',audited)
    summary = {'candidates':len(rows),'players':len({r['player_id_espn'] for r in rows}),'events':len({r['event_id'] for r in rows}),'dispositions':dict(collections.Counter(r['disposition'] for r in audited)),'reasons':dict(collections.Counter(reason for r in audited for reason in r['reasons'])),'minutes':dict(collections.Counter(r['minutesStatus'] for r in audited)),'resolved14':dict(collections.Counter(r['disposition'] for r in audited if r['resolved14Reviewed']))}
    write(OUT/'audit-summary.json',summary)
    print(json.dumps(summary))
