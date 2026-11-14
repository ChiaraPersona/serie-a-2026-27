const fs=require('fs');
const edit=(p,fn)=>fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')));
edit('js/pages/betting.js',s=>s.replace('hero("","Schedina","Le schedine e le MyCombo sono raccolte separatamente giornata per giornata.")',`hero("","Schedina","").replace('</h1>','</h1><p class="statistics-subtitle">Consulta le selezioni per giornata e crea la tua schedina personale.</p>')`));
edit('js/pages/cup.js',s=>s.replace(/hero\("Eliminazione diretta","Coppa Italia","[^"]*"\)/,`hero("Eliminazione diretta","Coppa Italia","").replace('</h1>','</h1><p class="statistics-subtitle">Segui il tabellone, il calendario e i risultati, turno dopo turno fino alla finale.</p>')`));
edit('css/site-layout.css',s=>s.replaceAll('body:is([data-page="team-stats"],[data-page="player-stats"])','body:is([data-page="team-stats"],[data-page="player-stats"],[data-page="betting"],[data-page="cup"])').replace('font-size:15px;line-height:1.6;text-wrap:balance','font-size:13px;line-height:1.6;text-wrap:balance'));
edit('css/readings-index.css',s=>s.replace('font-size:15px;line-height:1.6;text-wrap:balance','font-size:13px;line-height:1.6;text-wrap:balance'));
edit('js/pages/readings.js',s=>s.replace('${current?`<span class="ri-range">${range(current)}</span>`:""}',''));
