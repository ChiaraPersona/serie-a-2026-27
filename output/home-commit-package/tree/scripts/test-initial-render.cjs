const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {styleLinks,applyStyleLinks}=require('./site-styles');
const root=path.resolve(__dirname,'..');
const pages=[...fs.readdirSync(root).filter(f=>f.endsWith('.html')),...fs.readdirSync(path.join(root,'statistiche-squadra')).filter(f=>f.endsWith('.html')).map(f=>'statistiche-squadra/'+f)];
for(const file of pages){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 const prefix=file.startsWith('statistiche-squadra/')?'../':'';
 const page=/<body[^>]*data-depth="team"/.test(html)?'team-detail':html.match(/<body[^>]*data-page="([^"]+)"/)?.[1]||'home';
 assert(html.includes(styleLinks(prefix,page)),`${file}: cascade or content hashes out of date`);
 assert(!html.includes('css/styles.css?'),`${file}: legacy CSS entry`);
 assert.equal(applyStyleLinks(html),html,`${file}: non-idempotent generation`);
 const head=html.split('</head>')[0];assert(head.includes('page-styles:start'),`${file}: blocking page CSS missing before render`);
 const sheet=fs.readFileSync(path.join(root,'css/pages',page+'.css'),'utf8');assert(sheet.includes('page-background.css: original cascade position'),`${file}: background missing from page cascade`);
}
const boot=fs.readFileSync(path.join(root,'js/initial-presentation.js'),'utf8');
for(const [page,search,expected] of [['readings','?match=a','serie-a'],['champions','?match=b','champions'],['readings','?match=a&layout=legacy',undefined],['readings','',undefined],['home','?match=a',undefined]]){
 const body={dataset:{page}};vm.runInNewContext(boot,{URLSearchParams,document:{body},location:{search}});assert.equal(body.dataset.readingDetailTheme,expected);
}
console.log(`OK initial render: ${pages.length} public HTML pages, blocking CSS cascade, content hashes, idempotence and initial route themes`);
