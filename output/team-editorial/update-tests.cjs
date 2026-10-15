const fs=require('fs');const p='scripts/team-pages/test.js';let lines=fs.readFileSync(p,'utf8').split('\n');lines=lines.map(line=>{
if(line.includes('I collegamenti della pagina devono stare'))return 'assert.ok(teamPageSource.includes(\'${value(team.preferredFormation)}</p>${pageJumps}\'), "I collegamenti devono seguire allenatore e modulo preferito nella testata");';
if(line.includes("L'ordine della pagina squadra deve essere"))return `const editorialSections = ["identity", "season", "tactics", "statistics", "leaders", "comparator"];
for (const section of editorialSections) assert.ok(teamInterface.includes('data-editorial-section="'+section+'"'), 'Sezione editoriale assente: '+section);
for (const id of ["team-statistics-disclosure", "team-leaders-disclosure", "team-comparator-disclosure"]) assert.ok(teamInterface.includes(id), 'Pannello editoriale assente: '+id);`;
if(line.includes('I leader devono precedere filtri'))return 'assert.ok(teamPageSource.indexOf("${squadLeaderboards(team, currentLeaderboardRows)}") < teamPageSource.indexOf("${filters()}"), "I leader devono precedere filtri e tabella completa");';
return line;});fs.writeFileSync(p,lines.join('\n'));
