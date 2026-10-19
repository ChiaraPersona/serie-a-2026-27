export const currentPage=()=>document.body.dataset.page||"home";
export const queryParam=name=>new URLSearchParams(location.search).get(name);
