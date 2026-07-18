const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,".."),out=path.join(root,"assets/images/teams");
const sources={
  cremonese:"https://uscremonese.it/wp-content/uploads/cremonese/logo_cremonese.svg",
  pisa:"https://pisasportingclub.com/wp-content/uploads/2025/03/pisasc-logo-1.svg"
};
async function download(url,file){const response=await fetch(url);if(!response.ok)throw new Error(`${url}: ${response.status}`);fs.writeFileSync(path.join(out,file),Buffer.from(await response.arrayBuffer()))}
async function run(){
  fs.mkdirSync(out,{recursive:true});
  await download(sources.cremonese,"cremonese.svg");
  await download(sources.pisa,"pisa.svg");
  const response=await fetch("https://www.hellasverona.it/");if(!response.ok)throw new Error(`Hellas Verona: ${response.status}`);
  const html=await response.text(),match=html.match(/data:image\/png;base64,([A-Za-z0-9+/=]{1000,})/);
  const veronaFile=path.join(out,"hellas-verona.png");
  if(match)fs.writeFileSync(veronaFile,Buffer.from(match[1],"base64"));
  else if(!fs.existsSync(veronaFile))throw new Error("Logo Hellas Verona dinamico non trovato e copia locale assente");
  console.log("Scaricati 3 loghi storici da fonti ufficiali.");
}
run().catch(error=>{console.error(error);process.exitCode=1});
