if(!globalThis[Symbol.for('serie-a.public-presentation')])await import('../public-presentation.js');
const RELEASE=new URL(import.meta.url).searchParams.get("v")||"development";
const [utils,{createDataService},{createMatchComponents},{currentPage},{loadPage}]=await Promise.all([
  import(`./utils.js?v=${encodeURIComponent(RELEASE)}`),
  import(`../services/data-service.js?v=${encodeURIComponent(RELEASE)}`),
  import(`../components/match-card.js?v=${encodeURIComponent(RELEASE)}`),
  import(`./state.js?v=${encodeURIComponent(RELEASE)}`),
  import(`./router.js?v=${encodeURIComponent(RELEASE)}`)
]);

const page=currentPage();
const services=createDataService(RELEASE,{deduplicate:true});
const components=createMatchComponents(utils);
const dependencies={...utils,...services,...components};

document.querySelectorAll("[data-page-link]").forEach(link=>link.classList.toggle("active",link.dataset.pageLink===page));
const button=document.querySelector(".menu-button"),navigation=document.querySelector(".site-nav");
function setMenuOpen(open){
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

});
matchMedia("(max-width:900px)").addEventListener("change",()=>setMenuOpen(false));

try{
  const pageModule=await loadPage(page,RELEASE);
  await pageModule.createPage(dependencies).render();
  if(!document.querySelector(".rd-shell"))delete document.body.dataset.readingDetailTheme;
}catch(error){
  document.querySelector("#app").innerHTML=`<section class="empty"><h1>Dati non disponibili</h1><p>${utils.esc(error.message)}</p></section>`;
  console.error(error);
}
