import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{applyStyleLinks}=require('./site-styles.js');
const boot=fs.readFileSync('js/initial-presentation.js','utf8');
for(const [page,search,dark] of [['betting','?competizione=champions&giornata=1',true],['betting','?competizione=champions&giornata=2',true],['betting','?giornata=7',false],['betting','',false]]){const document={body:{dataset:{page}}};vm.runInNewContext(boot,{document,location:{search},URLSearchParams});assert.equal(document.body.dataset.competitionTheme,dark?'champions':undefined);assert.equal(document.body.dataset.page,page);assert.equal(document.body.dataset.readingDetailTheme,undefined);}
const html=fs.readFileSync('schedina.html','utf8');assert.equal(applyStyleLinks(html),html);assert(/<body[^>]*data-page="betting"[^>]*><script src="js\/initial-presentation.js/.test(html));assert(!html.includes('data-reading-detail-css'));
const source=fs.readFileSync('js/pages/champions.js','utf8'),fn=source.slice(source.indexOf('  function pilotReadingDetail(')),fragment=fn.slice(fn.indexOf('    const statusLabel='),fn.indexOf('    const ',fn.indexOf('    const scoreLabel=')+10));
for(const [status,score,label,result] of [['finished',{home:0,away:2},'conclusa','0 – 2'],['finished',{home:0,away:0},'conclusa','0 – 0'],['finished',null,'conclusa','Risultato N/D'],['scheduled',null,'prepartita','VS'],['live',{home:1,away:0},'in corso','1 – 0'],['in_progress',null,'in corso','Risultato N/D'],['postponed',null,'rinviata','VS'],['cancelled',null,'annullata','VS']]){const actual=vm.runInNewContext(fragment+';({statusLabel,scoreLabel})',{fixture:{status,score}});assert.equal(actual.statusLabel,label);assert.equal(actual.scoreLabel,result);}
console.log('PASS bootstrap Champions betting, idempotent CSS hashes, no reading CSS on betting, eight legacy status/score cases');
