import json
from pathlib import Path
read=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
r=read('data/normalized/champions-registered-squads-2026-27.json');s=read('data/normalized/champions-player-stats-2026-27.json')
t=next(t for t in r['teams'] if t['id']=='lille');p=next(p for p in t['players'] if str(p.get('uefaPlayerId'))=='250128943')
assert str(p['providerIds']['espn'])=='318779','Haraldsson: ID provider assente nella rosa'
players=[x for t in s['teams'] if t['id']=='lille' for x in t['players'] if str(x.get('providerPlayerId'))==str(p['providerIds']['espn'])]
assert len(players)==1 and players[0]['currentSeason']['totals']['minutes']==494
ledger=read('data/sources/champions-player-identity-reconciliation-2026-11-11.json')
for c in ledger['corrections']:
 t=next(t for t in r['teams'] if t['id']==c['rosterTeamId']);ps=[p for p in t['players'] if str(p.get('uefaPlayerId'))==str(c['uefaPlayerId'])];assert len(ps)==1
 assert str(ps[0]['providerIds']['espn'])==c['espn']
 assert len({e['espn'] for e in c['evidence']})==1,'Provider ambiguo promosso'
 st=next(t for t in s['teams'] if t['id']==c['teamId']);assert len([x for x in st['players'] if str(x.get('providerPlayerId'))==c['espn']])<=1,'Duplicato provider nella squadra'
print('OK: Haraldsson 494 minuti e tutti i mapping esatti, senza provider ambigui o duplicati.')
