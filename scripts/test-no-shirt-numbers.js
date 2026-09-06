"use strict";

const assert=require("assert");
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"..");
const targets=["data/players","data/teams","data/generated/team-pages","data/normalized","data/sources","js","scripts"];
const excluded=new Set(["remove-shirt-numbers.js","test-no-shirt-numbers.js"]);
const violations=[];

function scan(target){
  const absolute=path.join(root,target);
  if(!fs.existsSync(absolute))return;
  for(const entry of fs.readdirSync(absolute,{withFileTypes:true})){
    if(entry.name==="raw"||entry.name==="node_modules"||excluded.has(entry.name))continue;
    const file=path.join(absolute,entry.name);
    if(entry.isDirectory())scan(path.relative(root,file));
    else if(/\.(json|js|mjs)$/.test(entry.name)){
      const text=fs.readFileSync(file,"utf8");
      if(/shirtNumber|shirtNumbers/.test(text))violations.push(path.relative(root,file));
    }
  }
}

targets.forEach(scan);
assert.deepStrictEqual([...new Set(violations)],[],`Campi numero di maglia ancora presenti: ${[...new Set(violations)].join(", ")}`);
console.log("OK: numeri di maglia assenti da fonti, profili, output e codice applicativo.");
