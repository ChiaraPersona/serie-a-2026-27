'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),{execFileSync}=require('node:child_process'),path=require('node:path');
const fs=require('node:fs'),baseline='output/champions-validation-six-points/md06-statistical-models.before.js';
const oldSource=fs.existsSync(baseline)?fs.readFileSync(baseline,'utf8'):execFileSync('git',['show','de61abf4:scripts/md06-statistical-models.js'],{encoding:'utf8',maxBuffer:8*1024*1024}),oldModule={exports:{}};
vm.compileFunction(oldSource,['require','module','exports','__dirname'])(require,oldModule,oldModule.exports,path.resolve('scripts'));
const before=oldModule.exports.buildStatisticalModelArtifact(),after=require('./md06-statistical-models').buildStatisticalModelArtifact();
assert.deepEqual(after.validation,before.validation);assert.deepEqual(after.evaluations,before.evaluations);assert.deepEqual(after.currentForecasts,before.currentForecasts);
console.log('PASS parità numerica motore Serie A con la versione precedente all intervento: validazione, probabilità, EV e previsioni invariati sugli input correnti.');
