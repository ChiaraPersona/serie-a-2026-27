'use strict';
const fs=require('node:fs'),path=require('node:path');
const {BASE,capture,evaluate}=require('./prospective.cjs');
function autoCapture(root){
 if(process.env.SPATIAL_CAPTURE_DISABLED==='1'||!fs.existsSync(path.join(root,BASE,'protocol.json')))return {status:'INACTIVE'};
 let result;try{result=capture(root);result.evaluation=evaluate(root);}
 catch(error){result={status:'BLOCKED',error:error.message};console.warn('Coordinate individuali: '+error.message);}
 const dir=path.join(root,'output/player-spatial-prematch');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'latest.json'),JSON.stringify({at:new Date().toISOString(),...result},null,2)+'\n');
 console.log('Coordinate individuali: '+result.status+'; confronto sperimentale separato dalle selezioni.');return result;
}
module.exports={autoCapture};
