'use strict';
const assert=require('node:assert/strict');
// Parse public server-rendered profile data as JSON. Never evaluate page scripts.
function profilePayload(html){
 return [...html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)].flatMap(m=>{try{const p=JSON.parse(m[1]);return typeof p[1]==='string'?[p[1]]:[];}catch{return [];}}).join('');
}
function arrayField(text,key){
 const at=text.indexOf('"'+key+'":[');if(at<0)return [];
 const start=at+key.length+3;let depth=0,quoted=false,escape=false;
 for(let i=start;i<text.length;i++){
  const c=text[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;}
  else if(c==='"')quoted=true;else if(c==='[')depth++;else if(c===']'&&!--depth)return JSON.parse(text.slice(start,i+1));
 }
 throw Error('Incomplete public profile field '+key);
}
const valid=n=>Number.isInteger(n)&&n>=0;
const sum=(a,b)=>valid(a)&&valid(b)?a+b:null;
function recentRows(html,cutoff){
 const rows=arrayField(profilePayload(html),'recentMatches'),seen=new Set();
 return rows.map(r=>{
  const date=String(r.timestamp||'').replace(/^\$D/,'');
  assert(Number.isFinite(Date.parse(date)),'Missing exact match timestamp');
  const h=r.HomeStats||{},a=r.AwayStats||{};
  return {id:String(r.id),date,competition:r.League?.name||null,competitionId:r.leagueApid,home:r.Home?.name||null,away:r.Away?.name||null,
   yellowCards:sum(h.yellowCards,a.yellowCards),redCards:sum(h.redCards,a.redCards),fouls:sum(h.foulsc,a.foulsc),penalties:sum(h.penalties,a.penalties),
   secondYellowCards:null,directRedCards:null,
   url:`https://www.footymetrics.com/fixtures/${r.id}-${r.slug}`,homeStats:h,awayStats:a};
 }).filter(r=>{
  if(Date.parse(r.date)>=Date.parse(cutoff))return false;
  if(seen.has(r.id))return false;seen.add(r.id);return true;
 }).sort((a,b)=>b.date.localeCompare(a.date));
}
function summary(rows){
 const out={matches:rows.length,from:rows.at(-1)?.date||null,to:rows[0]?.date||null};
 for(const key of ['yellowCards','redCards','fouls','penalties']){
  const available=rows.filter(r=>valid(r[key]));
  out[key]={matches:available.length,total:available.length?available.reduce((n,r)=>n+r[key],0):null,perMatch:available.length?available.reduce((n,r)=>n+r[key],0)/available.length:null};
 }
 return out;
}
function seasons(html){
 return arrayField(profilePayload(html),'seasonStats').map(r=>{
  assert(valid(r.fixtures)&&r.fixtures>0);
  const totals={yellowCards:r.totalYellowCards,redCards:r.totalRedCards,fouls:r.totalFouls,penalties:r.totalPenalties};
  const normalized={season:r.Season?.name||null,competition:r.Season?.League?.name||null,competitionId:r.leagueApid,matches:r.fixtures,
   updatedAt:String(r.updated||'').replace(/^\$D/,''),providerRecordId:r.id,metrics:{}};
  for(const [key,total] of Object.entries(totals))normalized.metrics[key]={total:valid(total)?total:null,perMatch:valid(total)?total/r.fixtures:null};
  return normalized;
 });
}
module.exports={profilePayload,arrayField,recentRows,summary,seasons};
