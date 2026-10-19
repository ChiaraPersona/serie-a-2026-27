"""Import the supplied research, without fetching or recalculating forecasts."""
import csv
import json
import re
import unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'data/analysis/champions/md3-referees-2026-10-19'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
research=read(BASE/'input/referees_md3_research.json')
csvrows=list(csv.DictReader((BASE/'input/referees_md3_research.csv').open(encoding='utf-8-sig',newline='')))
calendar=read(ROOT/'data/normalized/champions-league-2026-27.json')
fixtures=[f for f in calendar['fixtures'] if f['matchday']==3]
assert len(fixtures)==len(research['fixtures'])==len(csvrows)==18
assignments=[];profiles=[];mapping=[]
def nullable(v):return None if v=='' or v is None else float(v)
def slug(v):return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',v).encode('ascii','ignore').decode().lower()).strip('-')
for row in research['fixtures']:
    csvrow=[r for r in csvrows if (r['date'],r['home'],r['away'])==(row['date'],row['home'],row['away'])]
    assert len(csvrow)==1
    for k,v in row.items():
        if k in ['sample_matches','yellow_per_match','total_cards_per_match','fouls_per_match']:
            assert nullable(v)==nullable(csvrow[0][k])
        else:assert str(v)==csvrow[0][k],k
    matches=[f for f in fixtures if (f['date'],f['homeTeam'],f['awayTeam'])==(row['date'],row['home'],row['away'])]
    assert len(matches)==1, 'Exact fixture identity unavailable'
    fixture=matches[0];fid=fixture['id'];rid='research-referee:'+slug(row['referee'])
    assert row['asof_verified']==row['last_10_verified']==row['prediction_eligible']=='NO'
    appointments={'fixtureId':fid,'refereeId':rid,'status':'assigned','referee':{'name':row['referee'],'countryFlag':None},'statistics':None,'source':{'provider':'UEFA','url':row['appointment_source'],'verificationBasis':'user-supplied-research-package','importedAt':'2026-10-19'},'identity':{'providerRefereeId':None,'scope':'exact-name-as-delivered'}}
    assignments.append(appointments)
    scope=row['sample_scope'] or None
    n=nullable(row['sample_matches'])
    if n is not None:assert n>0 and n.is_integer();n=int(n)
    profile={'refereeId':rid,'name':row['referee'],'sample':{'scope':scope,'competition':{'category':'uefa.champions','label':'UEFA Champions League'} if scope=='historical_UCL_provider_cards' else {'category':'domestic-league','label':None} if scope else None,'seasons':['2025/26','2026/27'] if scope=='mixed_2025-26_2026-27_league' else None,'matches':n,'period':None,'cutoffDate':None,'cutoffCertified':False,'recentTenVerified':False},'metrics':{'yellowCardsPerMatch':nullable(row['yellow_per_match']),'providerCardsPerMatch':nullable(row['total_cards_per_match']),'foulsPerMatch':nullable(row['fouls_per_match']),'redCardsPerMatch':None},'metricDefinitions':{'providerCardsPerMatch':'Provider aggregate; not inferred as yellow plus red cards; historical sample only'},'source':{'url':row['stats_source'] or None,'collectedOn':research['generated_on'],'notes':row['notes']},'modelUsage':'informational-only','predictionEligible':False}
    assert all(v is None or v>=0 for v in profile['metrics'].values())
    profiles.append(profile);mapping.append({'fixtureId':fid,'home':row['home'],'away':row['away'],'referee':row['referee'],'refereeId':rid})
assert len({a['fixtureId'] for a in assignments})==18
common={'schemaVersion':1,'season':'2026-27','competition':'UEFA Champions League','matchday':3}
write(ROOT/'data/sources/champions-referee-assignments-md03-2026-27.json',{**common,'source':{'provider':'UEFA','url':research['fixtures'][0]['appointment_source'],'collectedOn':'2026-10-19','verificationBasis':'user-supplied-research-package'},'verification':{'designationsProvider':'UEFA','status':'confirmed','expected':18,'confirmed':18,'verificationBasis':'user-supplied-research-package'},'methodology':{'modelUsage':'informational-only'},'watchlist':[],'assignments':assignments})
write(ROOT/'data/sources/champions-referee-profiles-md03-2026-27.json',{**common,'modelUsage':'informational-only','predictionEligible':False,'referees':profiles})
write(BASE/'mapping.json',mapping)
print('Imported 18 exact fixture assignments; 15 descriptive profiles and 3 unavailable samples; all model gates closed.')
