const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>fs.writeFileSync(path.join(root,p),JSON.stringify(d,null,2)+'\n');
function build(){
  const original=read('data/sources/champions-original-markets-md02-2026-10-13.json');
  const report=read('data/sources/champions-verification-md02-2026-10-14.json');
  const originals=new Map(original.fixtures.flatMap(f=>f.selections).map(s=>[s.selectionId,s]));
  assert.equal(originals.size,58);assert.equal(report.records.length,58);assert.equal(new Set(report.records.map(r=>r.selectionId)).size,58);
  assert.equal(report.records.filter(r=>r.status==='VERDE').length,34);assert.equal(report.records.filter(r=>r.status==='ROSSO').length,24);assert.equal(report.records.filter(r=>r.excludeFromOperational).length,4);
  const open=[];
  for(const r of report.records){
    const s=originals.get(r.selectionId);assert(s,r.selectionId);
    for(const [a,b] of [['matchId','fixtureId'],['odds','odds'],['label','label'],['market','market'],['selection','selection']])assert.equal(s[a],r[b],`${r.selectionId}: ${a}`);
    if(/discord|discrepan|da confermare|settlementCaveat/i.test(r.reason)||r.settlementCaveat||(/Rashford 1 tiro/.test(r.reason)&&!r.label.includes('Rashford')))open.push(r.selectionId);
  }
  const data=read('data/normalized/schedina-champions-md02.json'),byId=new Map(report.records.map(r=>[r.selectionId,r]));
  for(const f of data.fixtures)for(const s of f.selections){
    const r=byId.get(s.selectionId);if(!r)continue;
    const pending=open.includes(r.selectionId);
    s.settlement={status:pending?'pending':r.status==='VERDE'?'won':'lost',label:pending?'DA VERIFICARE':r.status,reason:r.reason,sourceUrl:r.source,basis:'STATISTICAL_VERIFICATION',officiallySettled:false};
    const [home,away]=r.score.split('-').map(Number);f.status='finished';f.score={home,away};
  }
  const filtered=report.records.filter(r=>!r.excludeFromOperational&&data.fixtures.some(f=>f.selections.some(s=>s.selectionId===r.selectionId)));
  const considered=filtered.filter(r=>!open.includes(r.selectionId));
  const gross=considered.reduce((n,r)=>n+(r.status==='VERDE'?r.odds:0),0);
  data.verificationReport={original:{total:58,green:34,red:24,officiallySettled:false},filtered:{total:filtered.length,excluded:58-filtered.length,considered:considered.length,green:considered.filter(r=>r.status==='VERDE').length,red:considered.filter(r=>r.status==='ROSSO').length,pending:filtered.length-considered.length,stakeEuro:considered.length,grossReturnEuro:+gross.toFixed(2),roiPct:considered.length?+((gross-considered.length)/considered.length*100).toFixed(2):null},open:report.records.filter(r=>open.includes(r.selectionId)),replacements:[]};
  data.settlementPolicy='Verifica statistica, non liquidazione ufficiale Sisal. ROI ipotetico: 1 € per selezione filtrata confermata; esclusi non titolari e controversi. Archivio originario: 58 mercati, 34 verdi e 24 rossi.';
  const all=data.fixtures.flatMap(f=>f.selections),decided=all.filter(s=>['won','lost','void'].includes(s.settlement?.status));
  const totalGross=decided.reduce((n,s)=>n+(s.settlement.status==='won'?s.odds:s.settlement.status==='void'?1:0),0);
  Object.assign(data.summary,{won:all.filter(s=>s.settlement?.status==='won').length,lost:all.filter(s=>s.settlement?.status==='lost').length,pending:all.length-decided.length,stakeEuro:decided.length,grossReturnEuro:+totalGross.toFixed(2),profitLossEuro:+(totalGross-decided.length).toFixed(2),roiPct:decided.length?+((totalGross-decided.length)/decided.length*100).toFixed(2):null});
  write('data/normalized/schedina-champions-md02.json',data);write('output/champions-md02-settlement/verification-audit.json',data.verificationReport);return data.verificationReport;
}
module.exports={build};if(require.main===module)console.log(build());
