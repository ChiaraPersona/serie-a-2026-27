'use strict';
const path=require('node:path');
const {capturePending}=require('./core.cjs');
function main(){
 const args=process.argv.slice(2),get=name=>args.includes(name)?args[args.indexOf(name)+1]:null;
 if(args.some(a=>a==='--now'||a==='--retrospective'||a==='--replace'))throw Error('Backdating and replacement are not supported');
 const day=get('--matchday');if(day!==null&&(!/^\d+$/.test(day)||Number(day)<1||Number(day)>38))throw Error('Invalid matchday');
 const result=capturePending(path.resolve(__dirname,'../..'),{matchId:get('--match'),matchday:day?Number(day):null,initializeProtocol:args.includes('--initialize')});
 console.log(JSON.stringify(result,null,2));
}
if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
