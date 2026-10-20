import json,hashlib
from pathlib import Path
root=Path('.')
raw={
'real-madrid':'1 thibaut-courtois;2 raul-asencio;3 eder-militao;4 dean-huijsen;5 jude-bellingham;6 eduardo-camavinga;7 vinicius-junior;8 federico-valverde;9 endrick;10 kylian-mbappe;11 rodrygo;12 trent-alexander-arnold;13 andriy-lunin;14 aurelien-tchouameni;15 arda-guler;16 ibrahima-konate;17 marc-cucurella;18 alvaro-carreras;19 carlos-espi;20 bernardo-silva;21 brahim-diaz;22 antonio-rudiger;23 ferland-mendy;24 denzel-dumfries;25 yan-diomande;27 thiago-pitarch',
'barcelona':'1 joan-garcia;2 joao-cancelo;3 alejandro-balde;4 brian-farinas;5 pau-cubarsi;6 gavi;7 fermin-lopez;8 pedri;9 gabriel-jesus;10 lamine-yamal;11 raphinha;12 xavi-espart;13 wojciech-szczesny;14 karim-adeyemi;15 andreas-christensen;16 rodri;17 anthony-gordon;18 gerard-martin;19 roony-bardghji;20 dani-olmo;21 frenkie-de-jong;22 marc-bernal;23 jules-kounde;24 eric-garcia;25 dominik-livakovic;27 jesse-bisiwu;29 hamza-abdelkarim',
'manchester-city':'1 gianluigi-donnarumma;3 ruben-dias;5 elliot-anderson;6 marc-guehi;7 iliman-ndiaye;8 mateo-kovacic;9 erling-haaland;10 rayan-cherki;11 jeremy-doku;13 marcus-bettinelli;17 enzo-fernandez;21 rayan-ait-nouri;22 vitor-reis;24 josko-gvardiol;27 matheus-nunes;28 geronimo-rulli;30 claudio-echeverri;32 ayyoub-bouaddi;33 nico-oreilly;37 allan-elias;42 antoine-semenyo;45 abdukodir-khusanov;47 phil-foden;56 ryan-mcaidoo;61 kaden-braithwaite;82 rico-lewis',
'bayern-munchen':'1 manuel-neuer;2 dayot-upamecano;3 minjae-kim;4 jonathan-tah;6 joshua-kimmich;7 serge-gnabry;8 tom-bischof;9 harry-kane;10 jamal-musiala;11 nathaniel-brown;14 luis-diaz;17 michael-olise;19 alphonso-davies;21 hiroki-ito;23 sacha-boey;26 sven-ulreich;27 konrad-laimer;30 cassiano-kiala;33 bastian-assomo;34 ismael-saibari;38 david-poder-stiube;39 bara-sapoko-ndiaye;40 jonas-urbig;42 lennart-karl;43 filip-pavic;44 josip-stanisic;45 aleksandar-pavlovic;46 tim-binder;47 david-daiber;49 maycon-cardozo'}
squads=json.loads((root/'data/sources/champions-md03-squads-2026-27.json').read_text(encoding='utf-8'))
old=json.loads((root/'data/normalized/champions-registered-squads-2026-27.json').read_text(encoding='utf-8'))
records=[];unmatched=[]
for tid,rows in raw.items():
 team=next(t for t in squads['teams'] if t['teamId']==tid)
 for row in rows.split(';'):
  n,pid=row.split(' ',1);hits=[p for p in team['players'] if p['playerId']==pid]
  if len(hits)!=1:
   unmatched.append(dict(teamId=tid,submittedPlayer=pid,shirtNumber=int(n),status='not-in-current-squad'));continue
  p=hits[0];existing=p.get('shirtNumber');status='conflict' if existing is not None and existing!=int(n) else 'accepted'
  aliases=list(dict.fromkeys(p.get(k) for k in ['canonicalName','sourceName','displayName'] if p.get(k)))
  records.append(dict(teamId=tid,uefaClubId=next(t['uefaClubId'] for t in old['teams'] if t['id']==tid),playerId=pid,stablePlayerId=p['stablePlayerId'],canonicalName=p['canonicalName'],aliases=aliases,shirtNumber=int(n),existingConfirmedNumber=existing,status=status))
source=dict(schemaVersion=1,competition='champions',season='2026-27',block=1,providedAt='2026-10-20',scope=list(raw),source='User-provided numbering, reconciled against existing MD3 squad identities and confirmed shirt numbers',identityRegistry='data/sources/champions-md03-squads-2026-27.json',records=records,unmatched=unmatched)
(root/'data/sources/champions-shirt-numbers-2026-27.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Snapshot protected files and the normalized registry for precise scope validation.
files=[p for p in (root/'data').rglob('*') if p.is_file() and p.name!='champions-shirt-numbers-2026-27.json']
snapshot={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
(root/'output/champions-shirt-numbers-block1/before-hashes.json').write_text(json.dumps(snapshot,indent=2),encoding='utf-8')
(root/'output/champions-shirt-numbers-block1/registered.before.json').write_text(json.dumps(old,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'accepted':len(records),'unmatched':unmatched,'conflicts':[r for r in records if r['status']=='conflict']},ensure_ascii=True))
