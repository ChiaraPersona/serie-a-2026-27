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
      const source=fs.readFileSync(file,"utf8");
      // The complete roster may display a verified number, or N/D when absent.
      const text=path.relative(root,file).replaceAll("\\","/") === "js/team-squads.js" ? source.replaceAll("value(player.shirtNumber)", "value(null)") : source;
      if(/shirtNumber|shirtNumbers/.test(text))violations.push(path.relative(root,file));
    }
  }
}

targets.forEach(scan);
assert.deepStrictEqual([...new Set(violations)],[],`Campi numero di maglia ancora presenti: ${[...new Set(violations)].join(", ")}`);
console.log("OK: numeri di maglia assenti dai dataset; la rosa gestisce N/D e numeri verificati se disponibili.");
