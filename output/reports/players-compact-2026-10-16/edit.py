from pathlib import Path
import hashlib,json
root=Path.cwd()
baseline=json.loads((root/'output/reports/players-compact-2026-10-16/before.json').read_text(encoding='utf-8'))
for name in ('js/pages/reading-detail/people.mjs','css/reading-detail.css'):
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==baseline['hashes'][name], f'Concurrent change: {name}'
p=root/'js/pages/reading-detail/people.mjs'
s=p.read_text(encoding='utf-8')
s=s.replace('const cards=players.map((p,i)=>{','const rows=players.map(p=>{',1)
start=s.index('  return `<article class="rd-player-card" data-player-card')
end=s.index('\n }).join(\'\');',start)
old=s[start:end]
detail=old[old.index("${details('Mini-dashboard e dettagli',")+len("${details('Mini-dashboard e dettagli',"):]
assert detail.endswith('`)}</article>`;')
detail=detail[:-len('`)}</article>`;')]
# Retain the original complete dashboard, including all source records and market links.
new='''  return {player:p,html:`<details class="rd-player-row" data-player-card data-player-id="${esc(p.id||'')}" data-player-outsider="${p.outsider}" data-player-search="${esc((p.name+' '+p.team).toLocaleLowerCase('it'))}"><summary title="Espandi statistiche di ${esc(p.name)}"><span class="rd-row-number" aria-label="Numero di maglia ${esc(p.number??'non disponibile')}">${esc(p.number??'—')}</span><span class="rd-row-identity"><h3>${esc(p.name)}</h3>${p.outsider?'<small class="rd-compact-outsider">Outsider</small>':''}</span><span class="rd-row-shot" data-player-shots aria-label="Tiri previsti: ${number(shots)}">${number(shots)}</span><span class="rd-row-sot" data-player-sot aria-label="SOT previsti: ${number(sot)}">${number(sot)}</span><span class="rd-row-chevron" aria-hidden="true">＋</span></summary><div class="rd-player-expanded"><p class="rd-player-role">${esc(p.team)} · ${esc(p.role||'Ruolo N/D')}</p><dl class="rd-player-kpis">${metric('Tiri previsti',shots)}${metric('SOT previsti',sot)}${metric('Minuti attesi',a?s.expectedMinutes:null,"′")}</dl><div class="rd-player-probabilities"><span>2+ tiri <b>${pct(a?s.shotProbabilities?.over15:null,true)}</b></span><span>1+ SOT <b>${pct(a?s.shotOnTargetProbabilities?.over05:null,true)}</b></span></div>'''+detail[1:]+'''</div></details>`};'''
# The dashboard was a template literal argument: concatenate its contents in the row.
s=s[:start]+new+s[end:]
s=s.replace("\n }).join('');\n return `<div class=\"rd-player-toolbar\">", "\n });\n const assigned=new Set();\n const columns=[model.home,model.away].map((side,i)=>{\n  const sideRows=rows.filter(({player:p})=>!assigned.has(p)&&(p.team===side.name||p.team===side.id||p.source.teamId===side.id||evidence.lineups[i]?.players.some(q=>q.id&&q.id===p.id)));sideRows.forEach(r=>assigned.add(r.player));\n  return `<section class=\"rd-player-team\" data-player-team=\"${i?'away':'home'}\" aria-label=\"Giocatori ${esc(side.name)}\"><h3 class=\"rd-player-team-name\">${esc(side.name)}</h3><div class=\"rd-player-column-labels\" aria-hidden=\"true\"><span>Giocatore</span><span>Tiri</span><span>SOT</span></div>${sideRows.map(r=>r.html).join('')||missing('Proiezioni individuali non disponibili.')}</section>`;\n }).join('');\n const unassigned=rows.filter(r=>!assigned.has(r.player));\n return `<div class=\"rd-player-toolbar\">",1)
s=s.replace('<div class="rd-player-grid">${cards||missing(\'Proiezioni individuali non disponibili.\')}</div>`;','<div class="rd-player-columns">${columns}</div>${unassigned.length?`<div class="rd-player-unassigned">${missing(\'Squadra non identificata nella fonte.\')}${unassigned.map(r=>r.html).join(\'\')}</div>`:\'\'}`;',1)
assert 'const cards=' not in s
p.write_text(s,encoding='utf-8',newline='\n')
