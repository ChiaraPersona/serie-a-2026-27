const routes={home:"home",calendar:"matches",team:"matches","team-stats":"teams",readings:"readings",referees:"referees",fantasy:"fantasy",cup:"cup"};
export async function loadPage(page,release){
  const moduleName=routes[page];
  if(!moduleName)throw new Error(`Pagina non supportata: ${page}`);
  return import(`../pages/${moduleName}.js?v=${release}`);
}
