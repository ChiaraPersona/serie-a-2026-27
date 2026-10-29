'use strict';
const fs=require('node:fs'),path=require('node:path');
const {BASE,capturePending}=require('./core.cjs');
const {evaluateToFile}=require('./evaluate.cjs');
function autoCapture(root){
 if(process.env.SPATIAL_CAPTURE_DISABLED==='1'||!fs.existsSync(path.join(root,BASE,'protocol.json')))return {status:'INACTIVE'};
 let result;try{result=capturePending(root);console.log(`Congelamento territoriale: ${result.captures.filter(r=>r.status==='CAPTURED').length} nuovi, ${result.captures.filter(r=>r.status==='UNCHANGED').length} invariati; gare iniziate escluse.`);}
 catch(error){result={status:'BLOCKED',error:error.message};console.warn('Congelamento territoriale non eseguito: '+error.message);}
 try{const evaluation=evaluateToFile(root);result.evaluation={prospectiveMatches:evaluation.prospective.matches,pilotMatches:evaluation.pilot.matches,pending:evaluation.pending.length};}
 catch(error){result.evaluationError=error.message;console.warn('Valutazione territoriale non aggiornata: '+error.message);}
 const out=path.join(root,'output/spatial-prematch');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'last-capture.json'),JSON.stringify({at:new Date().toISOString(),...result},null,2)+'\n');
 return result;
}
module.exports={autoCapture};
