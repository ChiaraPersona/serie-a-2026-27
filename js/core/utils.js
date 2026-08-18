export const labels={scheduled:"Programmata",live:"In corso",finished:"Conclusa",postponed:"Rinviata"};
export const esc=v=>String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
export const contrastInk=color=>{const hex=String(color||"").replace("#","");const value=hex.length===3?hex.split("").map(char=>char+char).join(""):hex;if(!/^[0-9a-f]{6}$/i.test(value))return"#fff";const channels=[0,2,4].map(index=>parseInt(value.slice(index,index+2),16)/255).map(channel=>channel<=.03928?channel/12.92:((channel+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722>.42?"#0b1320":"#fff"};
const playerRoleAbbreviations={Portiere:"POR",Difensore:"DC","Difensore centrale":"DC","Difensore centrale destro":"DC","Difensore centrale sinistro":"DC","Terzino destro":"TD","Terzino sinistro":"TS",Centrocampista:"CC","Centrocampista centrale":"CC","Centrocampista centrale destro":"CC","Centrocampista centrale sinistro":"CC",Mediano:"CDC","Mediano / regista":"CDC","Esterno destro":"ED","Esterno sinistro":"ES",Trequartista:"COC","Trequartista destro":"COC","Trequartista sinistro":"COC","Trequartista / ala":"COC",Regista:"COC",Attaccante:"ATT","Seconda punta":"ATT",Centravanti:"ATT","Ala destra":"AD","Ala sinistra":"AS"};
export const playerRoleLabel=role=>playerRoleAbbreviations[role]||role||"N/D";
export const dateOnly=v=>{if(!v)return null;const [year,month,day]=String(v).slice(0,10).split("-");const months=["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];return `${Number(day)} ${months[Number(month)-1]} ${year}`};
export const scheduleChronology=(left,right)=>{
  const leftDate=String(left.date||left.matchdayDate||"9999-12-31"),rightDate=String(right.date||right.matchdayDate||"9999-12-31");
  return leftDate.localeCompare(rightDate)||String(left.kickoff||"99:99").localeCompare(String(right.kickoff||"99:99"));
};
export const matchdayChronology=(left,right)=>(Number(left.matchday)||0)-(Number(right.matchday)||0)||scheduleChronology(left,right);
export const hero=(eyebrow,title,text,aside="")=>`<section class="hero"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lead">${text}</p></div>${document.body.dataset.page==="home"?"":aside}</section>`;
export const empty=text=>`<div class="empty">${text}</div>`;
export const competitionLabel=value=>value==="serie-a"?"Serie A":"Serie B";
