'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const {root, catalog, fixtureData, validate} = require('./model.cjs');
const files = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/pitch.js', ['pitch.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']], ['/public-presentation.js', ['../../js/public-presentation.js', 'text/javascript']]]);
const storage = path.join(root, 'output/lineup-admin');
const token = crypto.randomBytes(32).toString('hex');
const jobs = new Map();
let activeJob = null;
function json(res, code, data) {res.writeHead(code, {'Content-Type': 'application/json; charset=utf-8'}); res.end(JSON.stringify(data));}
async function body(req) {
  let value = '';
  for await (const chunk of req) {value += chunk; if (value.length > 64000) throw Error('Richiesta troppo grande.');}
  return JSON.parse(value);
}
function start({port = 8787} = {}) {
  const origin = `http://127.0.0.1:${port}`;
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (req.headers.host !== `127.0.0.1:${port}`) return json(res, 403, {error: 'Host non autorizzato.'});
    try {
      const url = new URL(req.url, origin);
      if (req.method === 'GET' && files.has(url.pathname)) {
        const [file, type] = files.get(url.pathname); res.writeHead(200, {'Content-Type': `${type}; charset=utf-8`}); return res.end(fs.readFileSync(path.join(__dirname, file)));
      }
      if (req.method === 'GET' && url.pathname === '/api/catalog') return json(res, 200, {fixtures: catalog(), token, localOnly: true});
      if (req.method === 'GET' && url.pathname === '/api/fixture') return json(res, 200, fixtureData(url.searchParams.get('id')));
      if (req.method === 'GET' && url.pathname === '/api/drafts') {
        const fixtureId = url.searchParams.get('fixtureId'); fixtureData(fixtureId);
        const directory = path.join(storage, 'drafts');
        const drafts = fs.existsSync(directory) ? fs.readdirSync(directory).filter(f => /^[a-f0-9-]{36}\.json$/.test(f))
          .map(f => JSON.parse(fs.readFileSync(path.join(directory, f), 'utf8'))).filter(d => d.fixtureId === fixtureId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10) : [];
        return json(res, 200, {drafts});
      }
      if (req.method === 'GET' && url.pathname === '/api/job') {
        const job = jobs.get(url.searchParams.get('id')); return json(res, job ? 200 : 404, job || {error: 'Elaborazione non trovata.'});
      }
      if (req.method !== 'POST' || !['/api/draft', '/api/recalculate'].includes(url.pathname)) return json(res, 404, {error: 'Pagina non trovata.'});
      if (req.headers.origin !== origin || req.headers['x-lineup-token'] !== token || !req.headers['content-type']?.startsWith('application/json')) return json(res, 403, {error: 'Richiesta non autorizzata.'});
      if (activeJob) return json(res, 409, {error: 'Attendi il termine del ricalcolo in corso.'});
      const draft = validate(await body(req));
      if (url.pathname === '/api/recalculate' && !draft.canRecalculate) return json(res, 422, {error: 'Ricalcolo isolato disponibile per Champions MD4/MD5. Per questa gara puoi salvare la bozza.'});
      const id = crypto.randomUUID();
      const record = {...draft, id, createdAt: new Date().toISOString(), actor: 'local-admin'};
      fs.mkdirSync(path.join(storage, 'drafts'), {recursive: true});
      fs.writeFileSync(path.join(storage, 'drafts', `${id}.json`), JSON.stringify(record, null, 2), {flag: 'wx'});
      if (url.pathname === '/api/draft') return json(res, 201, record);
      const job = {id, status: 'running', message: 'Ricalcolo isolato in corso', createdAt: record.createdAt};
      jobs.set(id, job); activeJob = id;
      const log = fs.openSync(path.join(storage, `${id}.log`), 'wx');
      const child = spawn(process.execPath, [path.join(__dirname, 'stage.cjs'), id], {cwd: root, stdio: ['ignore', log, log], windowsHide: true});
      fs.closeSync(log);
      const finish = error => {
        job.status = error ? 'failed' : 'completed'; job.message = error ? 'Ricalcolo non completato: consulta il registro locale.' : 'Ricalcolo completato nella copia isolata. Sito pubblico invariato.';
        const report = path.join(storage, 'runs', id, 'lineup-admin-report.json');
        if (fs.existsSync(report)) job.report = JSON.parse(fs.readFileSync(report, 'utf8'));
        if (error && !job.report?.error) {
          const output = fs.readFileSync(path.join(storage, `${id}.log`), 'utf8');
          job.error = output.match(/^Error: (.+)$/m)?.[1] || 'Il processo di ricalcolo si è interrotto.';
        }
        job.log = `output/lineup-admin/${id}.log`; activeJob = null;
      };
      child.once('error', finish); child.once('exit', code => finish(code !== 0));
      return json(res, 202, job);
    } catch (error) {json(res, 400, {error: error.message});}
  });
  server.listen(port, '127.0.0.1', () => console.log(`Pannello locale: ${origin}`));
  return server;
}
if (require.main === module) start({port: Number(process.env.LINEUP_ADMIN_PORT || 8787)});
module.exports = {start};
