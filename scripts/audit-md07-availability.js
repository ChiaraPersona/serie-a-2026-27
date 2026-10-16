"use strict";
const fs = require('node:fs');
const raw=fs.readFileSync('data/raw/fantacalcio/probable-lineups-md7-2026-27.html','utf8');
const source=JSON.parse(fs.readFileSync('data/sources/probable-lineups-md7-2026-27.json'));
const roster=JSON.parse(fs.readFileSync('data/sources/fantacalcio-quotations-2026-27.json'));
const decode=s=>s.replace(/<[^>]+>/g,' ').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&nbsp;/g,' ').replace(/&agrave;/g,'à').replace(/&egrave;/g,'è').replace(/&ograve;/g,'ò').replace(/&ugrave;/g,'ù').replace(/&igrave;/g,'ì').replace(/&eacute;/g,'é').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const bySource=new Map(roster.players.filter(p=>p.status==='active').map(p=>[Number(p.sourceId),p]));
const sections=[];
for(const section of raw.matchAll(/<section class="(ballots|suspendeds|injureds|dubts)">([\s\S]*?)<\/section>/g)){
  for(const item of section[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)){
    const link=item[1].match(/href="https:\/\/www.fantacalcio.it\/serie-a\/squadre\/[^/]+\/[^/]+\/(\d+)"[\s\S]*?<span>([^<]+)<\/span>/);
    if(!link)continue;
    const player=bySource.get(+link[1]);
    sections.push({kind:section[1],sourceId:+link[1],name:decode(link[2]),teamId:player?.teamId||null,playerId:player?.playerId||null,detail:decode(item[1].match(/<p class="description">([\s\S]*?)<\/p>/)?.[1]||item[1].match(/<strong class="percentage">([^<]+)/)?.[1]||'')});
  }
}
const starters=new Set(source.teams.flatMap(t=>t.players.filter(p=>p.lineupStatus==='starter').map(p=>p.sourceId)));
const conflicts=sections.filter(p=>['suspendeds','injureds'].includes(p.kind)&&starters.has(p.sourceId));
const comments=[...raw.matchAll(/<h4 class="h6">([^<]+)<\/h4>\s*<div class="comment pt-2">([\s\S]*?)<\/div>/g)].map(m=>({team:decode(m[1]),text:decode(m[2])}));
const report={source:source.sourceUrl,rawSnapshot:source.rawSnapshot,importedAt:source.importedAt,sections,comments,conflicts,
  coverage:{teams:source.teams.length,comments:comments.length,ballotEntries:sections.filter(p=>p.kind==='ballots').length,injured:sections.filter(p=>p.kind==='injureds').length,suspended:sections.filter(p=>p.kind==='suspendeds').length,doubts:sections.filter(p=>p.kind==='dubts').length},
  policy:'Probabili e dubbi restano editoriali. I report medici non sono certificazioni di assenza; nessuna identita dedotta per somiglianza.'};
const output='data/sources/md07-availability-and-ballots.json';
fs.writeFileSync(`${output}.tmp`,JSON.stringify(report,null,2)+'\n');
fs.renameSync(`${output}.tmp`,output);
console.log(JSON.stringify({coverage:report.coverage,conflicts,commentsWithCoachChange:comments.filter(p=>/eson|nuovo allen|cambio.*panchina|subentr/.test(p.text))},null,2));
