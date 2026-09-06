"use strict";

const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"..");
const roots=[
  "data/players",
  "data/teams",
  "data/generated/team-pages",
  "data/normalized/coppa-opponents-2026-27.json",
  "data/sources/coppa-opponents-2026-27.json",
  "data/sources/gazzetta-probable-lineups-md1-2026-27.json",
  "data/sources/milan/roster-2026-27.json",
  "data/sources/official-lineups-2026-27.json",
  "data/sources/probable-lineups-md1-2026-27.json",
  "data/sources/team-pages/completed-teams-2026-27.json",
  "data/sources/team-pages/remaining-teams-2026-27.json"
];

function files(target){
  const absolute=path.join(root,target);
  if(!fs.existsSync(absolute))return[];
  if(fs.statSync(absolute).isFile())return[absolute];
  return fs.readdirSync(absolute,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.relative(root,path.join(absolute,entry.name))):entry.name.endsWith(".json")?[path.join(absolute,entry.name)]:[]);
}

function purge(value){
  if(Array.isArray(value)){for(const item of value)purge(item);return;}
  if(!value||typeof value!=="object")return;
  delete value.shirtNumber;
  delete value.shirtNumbers;
  for(const child of Object.values(value))purge(child);
}

let changed=0;
for(const file of roots.flatMap(files)){
  const source=fs.readFileSync(file,"utf8");
  const data=JSON.parse(source);
  purge(data);
  const output=`${JSON.stringify(data,null,2)}\n`;
  if(output!==source){fs.writeFileSync(file,output);changed+=1;}
}

const championsPath=path.join(root,"data/sources/champions-registered-squads-2026-27.json");
const champions=JSON.parse(fs.readFileSync(championsPath,"utf8"));
for(const team of champions.teams)team.players=team.players.map(entry=>entry.length===4?entry.slice(1):entry);
fs.writeFileSync(championsPath,`${JSON.stringify(champions,null,2)}\n`);
console.log(`Numeri di maglia rimossi da ${changed} file Serie A e dallo snapshot Champions.`);
