import pdfplumber,json,re,unicodedata,pathlib
import sys
root=pathlib.Path(__file__).resolve().parents[2]
norm=lambda s: re.sub(r'[^a-z0-9 ]','',unicodedata.normalize('NFKD',s.lower().replace('ł','l').replace('ø','o')).encode('ascii','ignore').decode())
teams=json.loads((root/'data/normalized/teams.json').read_text(encoding='utf8'))
byname={norm(t['name']):t['id'] for t in teams}
entries=[]; team=None
with pdfplumber.open(sys.argv[1]) as doc:
 for pi,p in enumerate(doc.pages):
  for table in p.extract_tables():
   label=next((row[0].strip() for row in table if row[0] and row[0].strip()),None)
   if label: team=norm(label)
   for row in table:
    m=re.match(r'^(\d+)\.\s*(.+)',row[-1] or '')
    if m: entries.append(dict(team=team,teamId=byname.get(team),number=int(m[1]),name=m[2],page=pi+1))
matched=[]; unmatched=[]; absent=[]
for t in teams:
 squad=json.loads((root/f'data/teams/{t["id"]}.json').read_text(encoding='utf8'))['squad']
 rows=[e for e in entries if e['teamId']==t['id']]
 for p in squad:
  tokens=set(norm(p['name']).split()); candidates=[e for e in rows if tokens and tokens<=set(norm(e['name']).split())]
  # A surname-only match must identify exactly one person within this club.
  if len(candidates)==1:
   e=candidates[0]; matched.append(dict(teamId=t['id'],playerId=p['id'],playerName=p['name'],shirtNumber=e['number'],sourceName=e['name'],page=e['page']))
  else: absent.append(dict(teamId=t['id'],playerId=p['id'],name=p['name'],reason='ambiguous' if candidates else 'not-in-document'))
for e in entries:
 if not any(m['teamId']==e['teamId'] and m['sourceName']==e['name'] for m in matched): unmatched.append(e)
assert len({(m['teamId'],m['sourceName']) for m in matched})==len(matched)
source=dict(schemaVersion=1,competition='serie-a',season='2026-27',provider='Lega Calcio Serie A',document='C.S. 8 - NUMERAZIONI MAGLIE SERIE A ENILIVE 26-27.pdf',documentDate='2026-08-21',importedAt='2026-10-16',scope='Numerazioni, non lista rose. Associazioni solo nella stessa squadra; nessuna modifica alla composizione.',players=matched,documentEntries=entries,unmatchedDocumentPlayers=unmatched,rosterPlayersWithoutMatch=absent,teamsAbsentFromDocument=[t['id'] for t in teams if not any(e['teamId']==t['id'] for e in entries)])
(root/'data/sources/team-pages/shirt-numbers-2026-27.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(entries=len(entries),documentTeams=sorted(set(e['team'] for e in entries)),matched=len(matched),absentTeams=source['teamsAbsentFromDocument'],unmatched=unmatched),ensure_ascii=False,indent=2))
