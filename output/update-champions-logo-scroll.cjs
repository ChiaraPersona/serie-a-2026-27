const fs=require('fs'),p='js/pages/champions.js';let s=fs.readFileSync(p,'utf8');s=s.replace('    const results=document.querySelector("#champions-fixtures");',`    const logoScroll=document.querySelector(".champions-team-logo-scroll");
    if(logoScroll){
      logoScroll.tabIndex=0;
      logoScroll.setAttribute("aria-label","Squadre Champions League: scorri orizzontalmente");
      const reducedMotion=matchMedia("(prefers-reduced-motion:reduce)");
      let stopped=false,lastTime=null,direction=1,position=0;
      const stop=()=>{stopped=true};
      for(const event of ["pointerdown","wheel","focusin","pointerenter"])logoScroll.addEventListener(event,stop,{passive:true,once:true});
      const animate=time=>{
        if(stopped||!logoScroll.isConnected||reducedMotion.matches)return;
        if(lastTime!==null&&!document.hidden){
          const max=logoScroll.scrollWidth-logoScroll.clientWidth;
          position=Math.max(0,Math.min(max,position+direction*Math.min(time-lastTime,50)*.025));
          logoScroll.scrollLeft=position;
          if(position>=max)direction=-1;
          else if(position<=0)direction=1;
        }
        lastTime=time;
        requestAnimationFrame(animate);
      };
      if(!reducedMotion.matches)requestAnimationFrame(animate);
    }
    const results=document.querySelector("#champions-fixtures");`);fs.writeFileSync(p,s);
