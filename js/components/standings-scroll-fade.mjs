export function configureStandingsScrollFade(table){
  if(!table||table.dataset.scrollFadeConfigured)return;
  table.dataset.scrollFadeConfigured='true';
  const scrollArea=table.closest('.table-wrap');
  const content=[...table.querySelectorAll('tr')].flatMap(row=>[...row.children].slice(2).map(cell=>{
    const span=document.createElement('span');span.className='standings-fading-content';
    span.append(...cell.childNodes);cell.append(span);return span;
  }));
  let frame;
  const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
    const bounds=scrollArea.getBoundingClientRect();
    const pinned=table.querySelector('.champions-pinned-logo');
    const leftEdge=getComputedStyle(pinned).display==='none'?bounds.left:pinned.getBoundingClientRect().right;
    const positions=content.map(span=>{const rect=span.getBoundingClientRect();return [span,leftEdge-rect.left,bounds.right-rect.left]});
    positions.forEach(([span,left,right])=>{
      span.style.setProperty('--fade-left',left+'px');span.style.setProperty('--fade-left-end',(left+18)+'px');
      span.style.setProperty('--fade-right-start',(right-16)+'px');span.style.setProperty('--fade-right',right+'px');
    });
  })};
  const observer=new ResizeObserver(()=>{if(!table.isConnected){observer.disconnect();cancelAnimationFrame(frame);scrollArea.removeEventListener('scroll',update);return}update()});
  observer.observe(scrollArea);scrollArea.addEventListener('scroll',update,{passive:true});update();
}
