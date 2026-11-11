const fs=require('fs');const p='js/core/app.js';let s=fs.readFileSync(p,'utf8');s=s.replace('button?.addEventListener("click",()=>{const open=navigation.classList.toggle("open");button.setAttribute("aria-expanded",String(open))});',`function setMenuOpen(open){
  navigation.classList.toggle("open",open);
  button.setAttribute("aria-expanded",String(open));
  button.setAttribute("aria-label",open?"Chiudi menu":"Apri menu");
}
button?.setAttribute("aria-label","Apri menu");
button?.addEventListener("click",()=>setMenuOpen(!navigation.classList.contains("open")));
navigation?.addEventListener("click",event=>{if(event.target.closest("a"))setMenuOpen(false)});
document.addEventListener("keydown",event=>{
  if(!navigation?.classList.contains("open")||!matchMedia("(max-width:900px)").matches)return;
  if(event.key==="Escape"){setMenuOpen(false);button.focus()}
  if(event.key==="Tab"){
    const links=[...navigation.querySelectorAll("a[href]")],last=links.at(-1);
    if(event.shiftKey&&document.activeElement===button){event.preventDefault();last?.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();button.focus()}
  }
});
matchMedia("(max-width:900px)").addEventListener("change",()=>setMenuOpen(false));`);fs.writeFileSync(p,s);
const {applyStyleLinks}=require('../scripts/site-styles');const paths=fs.readdirSync('.').filter(f=>f.endsWith('.html'));for(const p of paths){let s=fs.readFileSync(p,'utf8');s=s.replace('aria-controls="site-nav" aria-expanded="false"','aria-controls="site-nav" aria-label="Apri menu" aria-expanded="false"').replace('<a class="brand" href=','<a class="brand" aria-label="Prima del Fischio — Home" href=');fs.writeFileSync(p,applyStyleLinks(s));}

