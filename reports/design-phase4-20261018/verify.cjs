const fs=require('fs'),assert=require('assert/strict');
const baseline=JSON.parse(fs.readFileSync(__dirname+'/before.json'));
for(const mode of process.argv.slice(2)){
 const result=JSON.parse(fs.readFileSync(__dirname+'/'+mode+'.json'));
 assert.deepEqual(result.errors,[],mode+' JavaScript errors');
 for(const current of result.results){const old=baseline.results.find(r=>r.route===current.route&&r.width===current.width);assert(old);
  for(const key of ['allText','mainImageSources','fields','tableContents','links','counts','theme'])assert.deepEqual(current[key],old[key],mode+' '+current.route+' '+current.width+' '+key);
  assert.equal(current.overflow,false,mode+' '+current.route+' '+current.width+' overflow');
 }
 console.log('PASS',mode,result.results.length,'views: text, images, fields, tables, links, controls, theme, no overflow');
}
