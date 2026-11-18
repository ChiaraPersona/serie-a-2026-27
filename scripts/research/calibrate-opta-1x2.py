"""Research-only chronological Opta 1X2 calibration. No production writes."""
import pathlib,json,gzip,hashlib,subprocess,collections
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'data/analysis/champions/opta-calibration-2026-11-18'
PAIRS=ROOT/'data/analysis/champions/opta-historical-feasibility-2026-11-18/historical-match-pairs.jsonl.gz'
HISTORY=ROOT/'data/normalized/uefa-europe-history-2023-26.json'
POLICY=ROOT/'data/sources/champions-european-result-policy.json'
PROTOCOL=OUT/'protocol.json'

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def features(gap):
    x=np.zeros((len(gap),3,3));x[:,0,0]=.5;x[:,0,1]=gap/20;x[:,1,2]=1;x[:,2,0]=-.5;x[:,2,1]=-gap/20
    return x
def prob(theta,x):
    z=x@theta;z-=z.max(axis=1,keepdims=True);e=np.exp(z);return e/e.sum(axis=1,keepdims=True)
def objective(t,x,y,lam):
    p=prob(t,x)
    return float(-np.log(np.maximum(p[np.arange(len(y)),y],1e-15)).sum()+lam*np.dot(t,t)/2)
def fit(x,y,lam):
    t=np.zeros(3);one=np.eye(3)[y]
    for iteration in range(100):
        p=prob(t,x);grad=np.einsum('nki,nk->i',x,p-one)+lam*t
        mean=np.einsum('nk,nki->ni',p,x)
        hess=np.einsum('nk,nki,nkj->ij',p,x,x)-mean.T@mean+lam*np.eye(3)
        active=[0,2] if t[1]<=0 and grad[1]>0 else [0,1,2]
        step=np.zeros(3);step[active]=np.linalg.solve(hess[np.ix_(active,active)],grad[active])
        old=objective(t,x,y,lam);scale=1.
        while scale>1e-10:
            new=t-scale*step;new[1]=max(0.,new[1])
            if objective(new,x,y,lam)<=old+1e-12:break
            scale/=2
        if scale<=1e-10:raise RuntimeError('Optimizer line search failed')
        change=np.max(np.abs(new-t));t=new
        if change<1e-9:break
    else:raise RuntimeError('Optimizer did not converge')
    return t
def losses(p,y):
    return -np.log(np.maximum(p[np.arange(len(y)),y],1e-15)),np.sum((p-np.eye(3)[y])**2,axis=1)
def metrics(p,y):
    ll,bs=losses(p,y);pred=p.argmax(axis=1);conf=p.max(axis=1);bins=[]
    for low,high in [(0,.4),(.4,.5),(.5,.6),(.6,.7),(.7,1.000001)]:
        mask=(conf>=low)&(conf<high)
        if mask.any():bins.append(dict(low=low,high=min(high,1),n=int(mask.sum()),meanConfidence=float(conf[mask].mean()),accuracy=float((pred[mask]==y[mask]).mean())))
    return dict(n=len(y),logLoss=float(ll.mean()),brier=float(bs.mean()),accuracy=float((pred==y).mean()),correct=int((pred==y).sum()),drawMean=float(p[:,1].mean()),drawFrequency=float((y==1).mean()),calibrationBins=bins)
def bootstrap(p,q,y,dates):
    diff=losses(p,y)[0]-losses(q,y)[0];bd=losses(p,y)[1]-losses(q,y)[1]
    clusters=[np.flatnonzero(dates==d) for d in sorted(set(dates))];rng=np.random.default_rng(20261118);values=[];bv=[]
    for _ in range(2000):
        idx=np.concatenate([clusters[i] for i in rng.integers(0,len(clusters),len(clusters))]);values.append(diff[idx].mean());bv.append(bd[idx].mean())
    return dict(clusters=len(clusters),logLossDelta=float(diff.mean()),logLoss95=np.quantile(values,[.025,.975]).tolist(),brierDelta=float(bd.mean()),brier95=np.quantile(bv,[.025,.975]).tolist())
def main():
    protected=[PAIRS,HISTORY,POLICY,PROTOCOL,ROOT/'scripts/research/european-rating-model.cjs']
    before={str(p.relative_to(ROOT)):sha(p) for p in protected}
    with gzip.open(PAIRS,'rt',encoding='utf-8') as f:rows=sorted([json.loads(s) for s in f],key=lambda r:(r['date'],str(r['fixtureId'])))
    assert len(rows)==136 and len({str(r['fixtureId']) for r in rows})==136
    for r in rows:
        assert r['homeRating']['date']<r['date'] and r['awayRating']['date']<r['date']
    gap=np.array([r['homeRating']['rating']-r['awayRating']['rating'] for r in rows]);x=features(gap)
    y=np.array([0 if r['score90']['home']>r['score90']['away'] else 1 if r['score90']['home']==r['score90']['away'] else 2 for r in rows])
    dates=np.array([r['date'] for r in rows]);train=dates<'2025-01-01';val=(dates>='2025-01-01')&(dates<'2025-07-01');test=dates>='2025-07-01'
    assert train.sum()==57 and val.sum()==42 and test.sum()==37
    selection=[]
    for lam in [.1,1.,10.]:
        theta=fit(x[train],y[train],lam);selection.append(dict(lam=lam,theta=theta.tolist(),validation=metrics(prob(theta,x[val]),y[val])))
    chosen=min(selection,key=lambda r:r['validation']['logLoss']);frozen=fit(x[~test],y[~test],chosen['lam']);candidate=prob(frozen,x[test])
    frequencies=(np.bincount(y[~test],minlength=3)+1)/(int((~test).sum())+3);freq=np.tile(frequencies,(int(test.sum()),1))
    # Reuse exact existing Elo replay implementation: all matches of a date
    # predicted before any result from that date is applied.
    code="const fs=require('fs');const {sequence}=require('./scripts/research/european-rating-model.cjs');const h=JSON.parse(fs.readFileSync('data/normalized/uefa-europe-history-2023-26.json'));const p=JSON.parse(fs.readFileSync('data/sources/champions-european-result-policy.json'));console.log(JSON.stringify(sequence(h.matches,p.parameters).predictions.map(r=>({id:String(r.match.id),probability:r.probability,eligible:r.eligible}))));"
    proc=subprocess.run([r'C:\Program Files\nodejs\node.exe','-e',code],cwd=ROOT,check=True,capture_output=True,text=True)
    elo={r['id']:r for r in json.loads(proc.stdout)}
    tested=[r for r,t in zip(rows,test) if t]
    ep=np.array([[elo[str(r['fixtureId'])]['probability'][k] for k in ['home','draw','away']] for r in tested]);eligible=np.array([elo[str(r['fixtureId'])]['eligible'] for r in tested])
    assert np.allclose(candidate.sum(axis=1),1) and np.isfinite(candidate).all() and (candidate>0).all() and frozen[1]>=0
    # Model-specific checks: a larger home rating cannot reduce home-win odds;
    # with zero home advantage, swapping teams swaps the 1/2 probabilities.
    check=frozen.copy();check[0]=0;ps=prob(check,features(np.array([-10.,0.,10.])))
    assert ps[0,0]<=ps[1,0]<=ps[2,0] and np.allclose(ps[0],[ps[2,2],ps[2,1],ps[2,0]])
    predictionRows=[]
    for i,r in enumerate(tested):predictionRows.append(dict(fixtureId=r['fixtureId'],date=r['date'],home=r['homeTeam']['name'],away=r['awayTeam']['name'],actual=int(y[test][i]),candidate=candidate[i].tolist(),elo=ep[i].tolist(),eloEligible=bool(eligible[i]),frequencyBaseline=freq[i].tolist()))
    result=dict(status='EXPERIMENTAL_NOT_PROMOTED',protocol=before[str(PROTOCOL.relative_to(ROOT))],inputs=before,split=dict(train=int(train.sum()),validation=int(val.sum()),test=int(test.sum()),testFrom=str(min(dates[test])),testThrough=str(max(dates[test]))),selection=selection,frozenModel=dict(type='symmetric-multinomial-logit',homeIntercept=float(frozen[0]),slopePerTenRatingPoints=float(frozen[1]),drawIntercept=float(frozen[2]),regularization=chosen['lam'],trainingMatches=int((~test).sum()),trainedThrough=str(max(dates[~test])),ratingScale='Opta 0-100',extraLeagueBonus=False),test=dict(candidate=metrics(candidate,y[test]),eloReplay=metrics(ep,y[test]),frequency=metrics(freq,y[test])),paired=dict(candidateVsElo=bootstrap(candidate,ep,y[test],dates[test]),candidateVsFrequency=bootstrap(candidate,freq,y[test],dates[test])),eloEligibleCohort=dict(n=int(eligible.sum()),candidate=metrics(candidate[eligible],y[test][eligible]) if eligible.any() else None,elo=metrics(ep[eligible],y[test][eligible]) if eligible.any() else None),predictions=predictionRows,limitations=json.loads(PROTOCOL.read_text(encoding='utf-8'))['limitations'],checksPassed=['chronological split','pre-match rating dates','unique fixtures','probability simplex','nonnegative strength slope','team-swap symmetry without home advantage','monotonic home win probability','input hashes unchanged'])
    for p in protected:assert sha(p)==before[str(p.relative_to(ROOT))]
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    report=['# Calibrazione sperimentale Opta 1X2','','## Campione e metodo','',f"57 gare per addestramento, 42 per selezione della regolarizzazione; modello rifittato sulle 99 gare precedenti al 1 luglio 2025. Test separato su 37 gare, dal {result['split']['testFrom']} al {result['split']['testThrough']}. Nessuna modifica operativa.",'','Tre parametri: vantaggio casa, differenza dei rating individuali, propensione al pareggio. Nessun bonus aggiuntivo campionato. Le tre regolarizzazioni prefissate sono selezionate soltanto sulla log loss di validazione.','','## Test cronologico','','| Modello | Gare | Log loss (meno e meglio) | Brier (meno e meglio) | Esiti corretti |','|---|---:|---:|---:|---:|']
    for name,key in [('Opta calibrato','candidate'),('Elo esistente, replay retrospettivo','eloReplay'),('Frequenze addestramento + validazione','frequency')]:
        m=result['test'][key];report.append(f"| {name} | {m['n']} | {m['logLoss']:.4f} | {m['brier']:.4f} | {m['correct']}/{m['n']} ({100*m['accuracy']:.1f}%) |")
    report+=['','## Differenze appaiate di log loss','']
    for k,v in result['paired'].items():report.append(f"- {k}: {v['logLossDelta']:.4f}; IC descrittivo 95% [{v['logLoss95'][0]:.4f}, {v['logLoss95'][1]:.4f}], {v['clusters']} cluster di data.")
    report+=['','Delta = Opta meno riferimento; negativo favorisce Opta. Gli intervalli non certificano disponibilita temporale del provider o validazione prospettica.','','## Parametri congelati','',json.dumps(result['frozenModel'],ensure_ascii=False),'','## Limiti','']+[f'- {s}' for s in result['limitations']]
    report+=['','I rating individuali correnti e i loro intervalli non vanno trattati come probabilita. Questo esperimento produce una mappa 1X2 preliminare; non dimostra accuratezza di gol, tiri, SOT, corner, disciplina o rendimento. Nessuna promozione automatica.']
    (OUT/'REPORT.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
    print(json.dumps({k:result[k] for k in ['split','frozenModel','test','paired','eloEligibleCohort']},indent=2))

if __name__=='__main__':main()
