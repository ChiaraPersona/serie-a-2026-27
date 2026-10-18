const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {styleLinks,applyStyleLinks}=require('./site-styles');
const root=path.resolve(__dirname,'..');
const pages=[...fs.readdirSync(root).filter(f=>f.endsWith('.html')),...fs.readdirSync(path.join(root,'statistiche-squadra')).filter(f=>f.endsWith('.html')).map(f=>'statistiche-squadra/'+f),'champions-2026-27/motivazione.html'];
for(const file of pages){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 const prefix=file.startsWith('statistiche-squadra/')?'../':'';
 const reading=/<body[^>]*data-page="(?:readings|champions)"/.test(html);
 assert(html.includes(styleLinks(prefix,reading)),`${file}: cascade or content hashes out of date`);
 assert(!html.includes('css/styles.css?'),`${file}: legacy CSS entry`);
 assert.equal(applyStyleLinks(html),html,`${file}: non-idempotent generation`);
 const head=html.split('</head>')[0];assert(head.includes('css/page-background.css?'),`${file}: background missing before render`);
}
const boot=fs.readFileSync(path.join(root,'js/initial-presentation.js'),'utf8');
for(const [page,search,expected] of [['readings','?match=a','serie-a'],['champions','?match=b','champions'],['readings','?match=a&layout=legacy',undefined],['readings','',undefined],['home','?match=a',undefined]]){
 const body={dataset:{page}};vm.runInNewContext(boot,{URLSearchParams,document:{body},location:{search}});assert.equal(body.dataset.readingDetailTheme,expected);
}
console.log(`OK initial render: ${pages.length} public HTML pages, blocking CSS cascade, content hashes, idempotence and initial route themes`);
