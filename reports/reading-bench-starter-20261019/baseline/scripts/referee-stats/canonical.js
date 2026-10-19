const fs=require("fs"),path=require("path");
const aliases=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../../data/normalized/referee-aliases.json"),"utf8"));
const slug=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function canonical(kind,value){const hit=aliases[kind]?.[value],name=hit?.name||value||null;return {name,slug:hit?.slug||slug(name)}}
const team=value=>canonical("teams",value),referee=value=>canonical("referees",value);
module.exports={aliases,slug,team,referee};
