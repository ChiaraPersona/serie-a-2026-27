const RELEASE=new URL(import.meta.url).searchParams.get("v")||"development";
const [utils,{createDataService},{createMatchComponents},{currentPage},{loadPage}]=await Promise.all([
  import(`./utils.js?v=${encodeURIComponent(RELEASE)}`),
  import(`../services/data-service.js?v=${encodeURIComponent(RELEASE)}`),
  import(`../components/match-card.js?v=${encodeURIComponent(RELEASE)}`),
  import(`./state.js?v=${encodeURIComponent(RELEASE)}`),
  import(`./router.js?v=${encodeURIComponent(RELEASE)}`)
]);

const page=currentPage();
const services=createDataService(RELEASE);
const components=createMatchComponents(utils);
const dependencies={...utils,...services,...components};

document.querySelectorAll("[data-page-link]").forEach(link=>link.classList.toggle("active",link.dataset.pageLink===page));
const button=document.querySelector(".menu-button"),navigation=document.querySelector(".site-nav");
button?.addEventListener("click",()=>{const open=navigation.classList.toggle("open");button.setAttribute("aria-expanded",String(open))});

try{
  const pageModule=await loadPage(page,RELEASE);
  await pageModule.createPage(dependencies).render();
}catch(error){
  document.querySelector("#app").innerHTML=`<section class="empty"><h1>Dati non disponibili</h1><p>${utils.esc(error.message)}</p></section>`;
  console.error(error);
}
