// Read-only inventory of Sisal data dependencies; only writes this report folder.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const slash = p => p.replace(/\\/g, '/');
const rawRoot = path.join(root, 'data/raw/odds/sisal');
const rows = fs.readdirSync(rawRoot).flatMap(competition => fs.readdirSync(path.join(rawRoot, competition)).filter(n => n.endsWith('.json.gz')).map(name => ({competition, name, path:`data/raw/odds/sisal/${competition}/${name}`, bytes:fs.statSync(path.join(rawRoot, competition, name)).size, references:[]})));
const byName = new Map(rows.map(r => [r.name,r]));
// Include ignored/untracked source and documentation files, excluding Git and dependencies.
const files = execFileSync('rg', ['--files','--hidden','--no-ignore','-g','!.git/**','-g','!node_modules/**','-g','!**/node_modules/**','-g','!reports/sisal-retention/**','-g','*.json','-g','*.js','-g','*.cjs','-g','*.mjs','-g','*.md','-g','*.html','-g','*.txt','-g','*.yaml','-g','*.yml','-g','*.toml'], {cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim().split(/\r?\n/).map(slash);
const stamp = /\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json\.gz/g;
const normalized = [];
const schedine = [];
for (const file of files) {
  const body = fs.readFileSync(path.join(root,file),'utf8');
  for(const name of new Set(body.match(stamp)||[])) if(byName.has(name)) byName.get(name).references.push(file);
  if(/^data\/normalized\/odds\/sisal\/[^/]+\.json$/.test(file)) {
    const data=JSON.parse(body);
    normalized.push({path:file,bytes:Buffer.byteLength(body),events:data.events.length,rawReferences:[...new Set((body.match(stamp)||[]))]});
  }
  if(/^data\/normalized\/schedina[^/]*\.json$/.test(file)) {
    const data=JSON.parse(body); let priced=0, unknown=0;
    const walk = obj => { if(!obj||typeof obj!=='object')return; if(Object.hasOwn(obj,'odds')){if(typeof obj.odds==='number')priced++;else if(obj.odds===null)unknown++;} for(const value of Object.values(obj)) if(value&&typeof value==='object')walk(value); };
    walk(data); schedine.push({path:file,pricedObjects:priced,unknownOddsObjects:unknown,rawReferences:[...new Set(body.match(stamp)||[])]});
  }
}
for(const row of rows) {
  try { const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,row.path)))); row.integrity='gzip-and-json-ok'; row.retrievedAt=data.retrievedAt??null; }
  catch(error){row.integrity=error.message;}
  row.currentNormalized=normalized.filter(n=>n.rawReferences.includes(row.name)).map(n=>n.path);
  row.schedinaReferences=row.references.filter(p=>/schedina/i.test(p));
  row.codeReferences=row.references.filter(p=>/^(scripts|js)\//.test(p));
  row.classification=row.currentNormalized.length?'KEEP_CURRENT_VALIDATION':row.codeReferences.length?'KEEP_CODE_DEPENDENCY':row.references.length?'REVIEW_DOCUMENTED_EVIDENCE':'NO_LITERAL_REFERENCE';
}
const counts={};for(const row of rows){const c=counts[row.classification]??={files:0,bytes:0};c.files++;c.bytes+=row.bytes;}
const report={generatedAt:new Date().toISOString(),scope:'Existing local text files including ignored/untracked files; basename references; gzip JSON integrity. No deletion. Dynamic references require separate code review.',scannedTextFiles:files.length,counts,normalized,schedine,raw:rows};
fs.writeFileSync(path.join(__dirname,'audit.json'),JSON.stringify(report,null,2)+'\n');
const lines=['# Controllo riferimenti Sisal','',`Generato: ${report.generatedAt}. Nessun dato eliminato.`, '', 'Il controllo comprende file di testo locali, anche ignorati e non tracciati, esclusi .git e node_modules. I riferimenti letterali sono cercati per nome snapshot; le dipendenze dinamiche vanno valutate nel codice.','', '| Classe | File | Byte |','| --- | ---: | ---: |',...Object.entries(counts).map(([k,v])=>`| ${k} | ${v.files} | ${v.bytes} |`),'','## Download grezzi','','| Snapshot | Classe | Riferimenti |','| --- | --- | ---: |',...rows.map(r=>`| ${r.path} | ${r.classification} | ${r.references.length} |`),'','## Dipendenze dinamiche verificate','','- scripts/normalize-sisal-odds.js legge il raw più recente o quello passato con --raw; --identifiers-only legge tutti i raw richiamati dal normalizzato.','- scripts/validate-sisal-odds.js richiede rawFile, rawFiles e provenienza degli identificativi.','- scripts/sisal/test-identifiers.js ricostruisce i dataset dai raw richiamati dai normalizzati.','- scripts/report-sisal-md06-market-analysis.js e scripts/research/sisal-duo/report-md06.js leggono odds.rawFile.','- js/pages/betting.js carica Schedine normalizzate e dati di supporto; le quote pubblicate sono incorporate nei record, senza lettura diretta dei gzip.','', '## Limiti e conclusione','','NO_LITERAL_REFERENCE indica un candidato alla rimozione, non una prova che il download non sia mai stato usato. I file con soli riferimenti documentali richiedono una decisione sulla conservazione delle evidenze. I dataset normalizzati correnti servono ancora ai builder e non sono candidati alla cancellazione immediata. Non sono stati eseguiti builder né modificati quote o pagine. I dettagli per file e i conteggi degli oggetti con quota sono in audit.json.'];
fs.writeFileSync(path.join(__dirname,'REPORT.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({scannedTextFiles:files.length,counts,normalized,schedine,integrityFailures:rows.filter(r=>r.integrity!=='gzip-and-json-ok').map(r=>r.path)},null,2));
