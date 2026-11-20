// Fixture-scoped editorial interpretation. Does not change forecasts or markets.
import {expectationComparisons} from './champions-expectation-comparisons.mjs?v=20261120-expectation-section-v7';
const expectations={
 '01':[
  'Il Bodø/Glimt può costruire il proprio vantaggio soprattutto in casa. Nelle prime due gare europee interne ha battuto il Dortmund 1–0 e pareggiato 0–0 con il Lille, mentre nelle ultime cinque partite di campionato disponibili ha raccolto quattro vittorie.',
  'Il LASK arriva però da due successi europei, 3–2 sul campo dello Sporting e 4–0 sullo Slovan. Il rendimento nel campionato austriaco e quello nella lega norvegese non sono direttamente confrontabili; la vittoria a Lisbona mostra che gli ospiti possono creare problemi anche fuori casa.',
  'Ci aspettiamo un Bodø/Glimt propositivo, con il LASK capace di rispondere. Il vantaggio casalingo sostiene i norvegesi, ma non basta a considerare scontata una vittoria larga o una partita senza gol ospiti.'
 ],
 '02':[
  'Il Galatasaray arriva da cinque vittorie consecutive nel campionato turco e da due successi europei, contro Lille e Stuttgart. In casa ha però già subito quattro gol dal Barcellona: l’iniziativa offensiva non garantisce sempre equilibrio difensivo.',
  'L’Aston Villa ha segnato dodici gol nelle prime quattro di Champions, ma sei sono arrivati in una sola gara contro il Fenerbahçe. Nelle due trasferte ha vinto 3–2 a Bruges e perso 0–3 a Barcellona. Il contesto della Premier League va distinto da quello del campionato turco, senza trasformarlo in un vantaggio automatico.',
  'Ci aspettiamo una gara contendibile, con occasioni per entrambe. Il campo e la forma sostengono il Galatasaray; la capacità realizzativa del Villa rende fragile l’idea di un successo interno senza difficoltà.'
 ],
 '03':[
  'L’Arsenal presenta segnali di continuità: tre vittorie e un pareggio nelle prime quattro europee, oltre a cinque successi nelle ultime cinque partite di Premier League disponibili. In quattro di queste cinque gare di campionato non ha subito gol.',
  'Il Dortmund ha vinto tre partite europee su quattro, ma in trasferta ha perso 0–1 a Bodø e vinto 2–1 contro il Sabah. Il rendimento in Bundesliga descrive un avversario competitivo, mentre il 2–2 dell’Arsenal sul campo del Bayern offre già un confronto europeo di livello elevato.',
  'Ci aspettiamo un Arsenal capace di controllare lunghi tratti, con il Dortmund chiamato a sfruttare le occasioni concesse. Un successo interno contenuto è uno sviluppo credibile; una goleada richiederebbe una rottura dell’equilibrio che i dati non rendono inevitabile.'
 ],
 '04':[
  'Il Como ha segnato diciannove gol nelle prime quattro europee, nove dei quali nell’ultima trasferta contro il Lens. Anche le due gare interne, vinte entrambe 4–1 contro Leipzig e Manchester United, indicano un potenziale offensivo importante.',
  'L’AEK ha subito undici gol nelle quattro gare di Champions, perdendo entrambe le trasferte contro Shakhtar e Manchester City. I risultati nel campionato greco non possono essere trasferiti direttamente a questo confronto. Allo stesso tempo, il 9–1 del Como è un risultato estremo, non una nuova media da attendersi ogni settimana.',
  'Ci aspettiamo un Como in grado di prendere l’iniziativa e creare più occasioni dell’AEK. La produzione europea invita a considerare anche un successo con più gol di scarto, pur senza assumere che l’efficacia dell’ultima partita si ripeta integralmente.'
 ],
 '05':[
  'Feyenoord e Porto arrivano con un percorso europeo irregolare. Gli olandesi hanno perso tre gare su quattro; il Porto ha interrotto tre sconfitte consecutive battendo il Napoli 4–1.',
  'In casa il Feyenoord ha vinto 3–2 con il Como e perso 0–3 con l’Inter. Il Porto ha invece vinto le ultime cinque gare di campionato disponibili. Eredivisie e campionato portoghese offrono contesti diversi: la forma domestica sostiene gli ospiti, ma da sola non cancella le difficoltà europee.',
  'Ci aspettiamo una partita aperta nella quale il fattore campo del Feyenoord si confronti con la maggiore continuità recente del Porto. Nessuna delle due ha mostrato una tenuta europea sufficiente per considerare scontato il controllo completo della gara.'
 ],
 '06':[
  'Il Manchester City ha segnato dodici gol nelle prime quattro europee, ma arriva da tre sconfitte consecutive nelle ultime partite di Premier League disponibili. Il potenziale offensivo resta evidente, mentre la continuità recente invita alla prudenza.',
  'Il Napoli ha perso entrambe le trasferte di Champions, 1–3 contro il Villarreal e 1–4 a Porto. Anche le ultime cinque gare di Serie A disponibili restituiscono una sola vittoria. La difficoltà dell’impegno inglese non va confusa con una garanzia di rendimento del City.',
  'Ci aspettiamo un City più spesso all’attacco e un Napoli chiamato a difendere con maggiore continuità rispetto alle precedenti trasferte europee. Il vantaggio dei padroni di casa è credibile, ma la loro forma recente lascia spazio a una partita meno lineare di quanto suggerisca il divario tecnico.'
 ],
 '07':[
  'Il Leipzig arriva da quattro vittorie nelle ultime cinque gare di Bundesliga disponibili, con una produzione offensiva elevata. In Champions, però, ha perso tre gare su quattro e ha già subito quattro gol sia dal Como sia dal Real Madrid.',
  'Il Lens ha incassato sedici gol nelle prime quattro europee, nove nell’ultima gara contro il Como. Quel risultato estremo non va proiettato automaticamente sulla partita successiva; resta comunque una fragilità europea che i risultati più equilibrati in Ligue 1 non eliminano.',
  'Ci aspettiamo un Leipzig capace di mettere sotto pressione la difesa ospite. Un successo interno anche netto è uno sviluppo possibile, ma le difficoltà difensive dei tedeschi sconsigliano di leggere il confronto come una gara necessariamente a senso unico.'
 ],
 '08':[
  'Il Real Madrid ha vinto tutte le prime quattro europee, segnando tredici gol e subendone sette. Arriva inoltre da cinque vittorie nelle ultime cinque gare di Liga disponibili: il favore del pronostico trova sostegno nella continuità dei risultati.',
  'Il PSV ha segnato soltanto tre gol nelle prime quattro di Champions, mentre nelle ultime due partite di Eredivisie disponibili ne ha realizzati dodici. È un esempio concreto di quanto il livello degli avversari possa cambiare la lettura delle medie domestiche.',
  'Ci aspettiamo un Real Madrid capace di creare le occasioni migliori e indirizzare la partita. Il PSV può trovare spazi, perché il Real ha subito gol in tutte le quattro gare europee; la recente abbondanza offensiva olandese non basta però a prevederne la stessa efficacia a Madrid.'
 ],
 '09':[
  'Lo Slovan ha perso le prime quattro europee, con un gol fatto e diciassette subiti. Il Betis ha invece vinto tre gare su quattro, superando Lille, Porto e Feyenoord prima della sconfitta di Dortmund.',
  'Il rendimento recente dello Slovan nel campionato slovacco è più positivo, ma il salto verso gli avversari di Champions è già emerso chiaramente. La continuità del Betis contro club di campionati differenti offre un riferimento più pertinente di un confronto diretto tra le sole medie domestiche.',
  'Ci aspettiamo un Betis capace di prendere il controllo e costruire più occasioni. La fragilità europea dello Slovan rende plausibile anche una vittoria ospite larga; il fattore campo, da solo, non giustifica una lettura di sostanziale parità.'
 ],
 '11':[
  'Lo Slavia ha raccolto un punto nelle prime quattro europee, segnando cinque gol e subendone nove. In casa ha perso entrambe le gare, contro Lens e Arsenal, sempre riuscendo a segnare.',
  'Il Villarreal ha mostrato un attacco capace di produrre anche fuori casa, con due gol a Dortmund e tre a Liverpool, ma ha perso entrambe le trasferte ed è reduce dallo 0–6 contro il Paris Saint-Germain. La copertura domestica dello Slavia è insufficiente per un confronto omogeneo tra campionato ceco e Liga.',
  'Ci aspettiamo una gara nella quale entrambe possano creare occasioni e incontrare difficoltà nel proteggere il risultato. Il Villarreal ha segnali offensivi interessanti, ma la sua tenuta europea non permette di considerare semplice la trasferta.'
 ],
 '12':[
  'L’Atlético ha vinto quattro delle ultime cinque gare di Liga disponibili, pur perdendo l’ultima contro il Barcellona. In Champions ha segnato quattro gol in quattro partite: il suo vantaggio non implica automaticamente una produzione offensiva elevata.',
  'Il Viking ha segnato nove gol nelle prime quattro europee, ma nelle due trasferte ha perso entrambe le volte 1–3, contro Stuttgart e Aston Villa. Le recenti vittorie nel campionato norvegese vanno lette insieme a questa maggiore difficoltà lontano da casa contro avversari europei.',
  'Ci aspettiamo un Atlético capace di gestire meglio i momenti della gara, con il Viking in grado di cercare almeno un episodio offensivo. Un successo interno controllato appare più sostenibile dell’idea di una goleada inevitabile.'
 ],
 '13':[
  'Il Club Brugge ha vinto le ultime tre europee, segnando nove gol contro Inter, Lens e PSV. Il Liverpool ha realizzato quattordici gol nelle prime quattro gare, ma ne ha anche subiti dieci.',
  'Il Brugge arriva da risultati positivi nel campionato belga e ha già dimostrato di poter battere avversari di altri campionati. Il Liverpool ha vinto tre delle ultime cinque partite di Premier League disponibili: il diverso contesto domestico non basta a ignorare la competitività europea dei padroni di casa.',
  'Ci aspettiamo una partita con occasioni da entrambe le parti, nella quale il Liverpool dovrà limitare gli spazi concessi nelle precedenti gare europee. Il Brugge ha elementi concreti per contendere il risultato, oltre al vantaggio del campo.'
 ],
 '14':[
  'L’Inter ha vinto le ultime due europee senza subire gol, contro Shakhtar e Feyenoord. Nelle prime due aveva invece incassato sei reti contro Real Madrid e Club Brugge: il percorso recente segnala un miglioramento, non una difesa sempre impermeabile.',
  'Lo Stuttgart ha raccolto sette punti nelle prime quattro gare, ma le sue due trasferte sono state molto diverse: 3–0 sullo Slovan e 0–2 contro il Galatasaray. I risultati in Bundesliga e Serie A vanno contestualizzati rispetto agli avversari, senza trasformare le medie domestiche in una previsione diretta.',
  'Ci aspettiamo un’Inter capace di prendere l’iniziativa, con lo Stuttgart chiamato a reggere una pressione maggiore rispetto alla trasferta di Bratislava. Il successo interno è uno sviluppo credibile; il margine dipenderà dalla capacità nerazzurra di mantenere l’equilibrio mostrato nelle ultime due gare europee.'
 ],
 '15':[
  'Lo Shakhtar ha segnato quattro gol e ne ha subiti quattro nelle prime quattro europee. Le ultime due gare si sono concluse entrambe con una sconfitta per 0–1, contro Inter e Sporting: il problema recente è stato soprattutto trovare il gol.',
  'Il Fenerbahçe arriva dal 3–2 sul Liverpool, ma l’unica trasferta europea finora è terminata 0–6 contro l’Aston Villa. Le ultime cinque gare di campionato disponibili comprendono tre vittorie e due sconfitte; il rendimento turco non risolve da solo l’incertezza sul comportamento in trasferta.',
  'Ci aspettiamo una partita contendibile. Lo Shakhtar può provare a limitarne il ritmo, mentre il Fenerbahçe ha dimostrato di poter rendere la gara più aperta. Un equilibrio iniziale è plausibile, ma la forte variabilità degli ospiti invita a non considerare obbligato un punteggio basso.'
 ],
 '16':[
  'Il Bayern ha segnato dodici gol nelle prime quattro europee ed è rimasto imbattuto. Il Lille ha raccolto un punto, segnando quattro gol e subendone dieci: il confronto europeo sostiene il vantaggio degli ospiti.',
  'Il Lille è però imbattuto nelle ultime cinque gare di Ligue 1 disponibili e ha appena fermato il Bodø/Glimt sullo 0–0. Il Bayern ha vinto 2–0 sul campo dell’Atlético ma pareggiato 3–3 in casa del Viking: anche una squadra superiore può concedere occasioni quando la gara si apre.',
  'Ci aspettiamo un Bayern capace di occupare più spesso la metà campo avversaria e costruire più occasioni. Il Lille può provare a prolungare l’equilibrio attraverso la tenuta difensiva recente, ma non può trasferire automaticamente quella solidità dal campionato a questo avversario.'
 ],
 '17':[
  'Il Paris Saint-Germain ha vinto le prime quattro europee segnando venti gol e subendone cinque, battendo anche Manchester City e Barcellona. Le ultime cinque gare di Ligue 1 disponibili si sono concluse tutte con una vittoria.',
  'La Roma arriva da una buona produzione offensiva in Serie A, con diciassette gol nelle ultime cinque partite disponibili. In Champions ha però vinto soltanto contro lo Slovan, perdendo con Real Madrid e Manchester United: il rendimento domestico non garantisce la stessa efficacia contro il PSG.',
  'Ci aspettiamo un Paris Saint-Germain capace di imporre una pressione offensiva importante. La Roma ha argomenti per segnare, ma il percorso europeo dei francesi invita a considerare anche un successo interno con più gol di scarto, oltre alla stima più prudente dello scenario.'
 ],
 '18':[
  'Lo Sporting ha vinto tre delle prime quattro europee, ma l’unica sconfitta è arrivata in casa, 2–3 contro il LASK. Il Manchester United ha invece perso entrambe le trasferte, contro Atlético e Como, segnando un solo gol e subendone sei.',
  'Nelle ultime cinque gare di Premier League disponibili lo United non ha vinto e ha subito undici gol. Lo Sporting arriva da due successi consecutivi nel campionato portoghese. Il contesto inglese resta diverso, ma non è sufficiente a cancellare le difficoltà recenti degli ospiti.',
  'Ci aspettiamo uno Sporting capace di mettere in difficoltà la difesa dello United e sfruttare il campo. Gli inglesi conservano capacità offensiva, come mostra il recente 4–4 in campionato, ma per contendere il controllo dovranno migliorare sensibilmente la tenuta mostrata nelle trasferte europee.'
 ]
};
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const interpretations={
 '01':'Il quadro è meno univoco del solo vantaggio interno: il Bodø/Glimt ha concesso zero gol nelle due europee in casa, mentre la produzione del LASK sposta verso gli ospiti il confronto sulle quattro gare. Ci aspettiamo un confronto contendibile, nel quale il campo sostiene i norvegesi ma non elimina la minaccia offensiva austriaca.',
 '02':'La forma domestica sostiene il Galatasaray, mentre produzione europea e prova sui rating danno argomenti all’Aston Villa. Ci aspettiamo occasioni per entrambe: il vantaggio interno dello scenario richiede cautela, perché il confronto numerico non restituisce una superiorità turca stabile.',
 '03':'I confronti mantengono l’Arsenal avanti, ma cambiano il numero di gol e il margine del successo. La continuità difensiva recente sostiene i padroni di casa; il Dortmund resta in grado di segnare. Ci aspettiamo un vantaggio inglese da costruire con il controllo, senza considerare obbligato né un successo largo né lo zero nella casella ospite.',
 '04':'Qui la discrepanza riguarda soprattutto l’attacco del Como: il recente 9–1 al Lens alza sensibilmente le medie, ma anche i due 4–1 interni sono segnali rilevanti. Ci aspettiamo pressione e occasioni per i padroni di casa; una vittoria larga merita considerazione, pur senza trasformare quattro partite e un risultato estremo in una nuova certezza.',
 '05':'La prova sui rating e il confronto europeo spostano entrambi qualcosa verso il Porto. Ci aspettiamo una gara contendibile: il campo sostiene il Feyenoord, ma forma e segnali europei del Porto impediscono di assegnare automaticamente il controllo agli olandesi.',
 '06':'Entrambi i confronti alternativi sostengono il potenziale offensivo del City. La produzione europea sostiene questa possibilità, mentre le tre sconfitte recenti in campionato impongono cautela sulla continuità. Ci aspettiamo più iniziativa inglese, con il Napoli chiamato a migliorare la tenuta delle precedenti trasferte.',
 '07':'La vulnerabilità europea del Lens rende credibile un Leipzig capace di segnare più volte. La sensibilità sulle quattro gare aumenta però anche i gol ospiti, perché il Leipzig ha concesso molto: una vittoria interna può quindi accompagnarsi a una gara aperta, senza implicare necessariamente una porta inviolata.',
 '08':'Qui i tre confronti sono relativamente vicini nel vantaggio attribuito al Real Madrid. La produzione recente del PSV in campionato non trova la stessa conferma in Champions. Ci aspettiamo superiorità interna e occasioni anche per gli ospiti, senza un’indicazione numerica solida per alzare molto la stima dei gol madrileni.',
 '09':'Il percorso europeo e i due confronti alternativi favoriscono il Betis. Ci aspettiamo un vantaggio ospite più riconoscibile nella lettura della partita; anche una vittoria larga è uno sviluppo plausibile, non una probabilità già validata.',
 '11':'La fragilità difensiva delle due squadre sostiene la possibilità di più gol nel confronto europeo. Parte del segnale deriva però da avversari forti e dal recente 0–6 del Villarreal. Ci aspettiamo occasioni da entrambe le parti, con maggiore incertezza sul vincitore e senza usare il solo totale dei gol subiti come prova di una gara necessariamente ricca di reti.',
 '12':'Il favore dell’Atlético emerge dai rating, mentre la semplice media europea riporta il confronto alla parità. Il Viking ha però perso entrambe le trasferte 1–3 e i piccoli campioni non consentono una conclusione automatica. Ci aspettiamo più controllo dell’Atlético, mantenendo concreto il rischio di un gol ospite e senza presumere una goleada.',
 '13':'I rating quasi in equilibrio e le medie europee elevate descrivono una gara potenzialmente aperta. Ci aspettiamo occasioni per entrambe e un risultato contendibile; la capacità offensiva del Liverpool non cancella i dieci gol già concessi in Champions.',
 '14':'Questa verifica invita alla cautela sul margine dell’Inter: la prova sui rating e il confronto europeo restituiscono indicazioni differenti. La sensibilità descrittiva arriva persino vicino alla parità. Ci aspettiamo una gara più combattuta di un semplice dominio interno, pur riconoscendo i due recenti successi europei nerazzurri senza gol subiti.',
 '15':'I segnali restano discordanti: la prova sui rating è quasi in equilibrio, mentre le medie europee sostengono maggiormente lo Shakhtar. Lo 0–6 del Fenerbahçe nell’unica trasferta pesa molto sul confronto. Ci aspettiamo una gara incerta, nella quale il primo gol può cambiare lo sviluppo; nessuno dei confronti dimostra da solo un vantaggio stabile.',
 '16':'Le due verifiche alternative sostengono la possibilità di più gol del Bayern. Il Lille può provare a rallentare la gara con la tenuta recente in campionato, ma il rendimento europeo resta più fragile. Ci aspettiamo superiorità offensiva tedesca, con possibilità di più gol senza dare per scontato un successo largo.',
 '17':'Il PSG resta favorito in tutti i confronti e la sua produzione europea sostiene un potenziale offensivo elevato. La Roma conserva capacità di segnare: ci aspettiamo pressione francese e una concreta possibilità di più gol interni, senza trattare la media di cinque reti europee come un rendimento garantito.',
 '18':'Qui le stime sono relativamente vicine e mantengono un vantaggio dello Sporting, più o meno ampio. Le difficoltà esterne e la forma recente dello United sostengono questa lettura, mentre il suo potenziale offensivo conserva incertezza sul punteggio. Ci aspettiamo iniziativa portoghese e occasioni per mettere sotto pressione la difesa inglese.'
};
const emphasizeSentence=value=>escape(value).replace(/^(.+?\.)(?= |$)/,'<strong>$1</strong>');
const emphasizeRates=value=>escape(value).replace(/\d+,\d+–\d+,\d+(?= gol| nel confronto)/g,'<strong>$&</strong>');
export function matchExpectationMarkup(fixture){
 const key=/^ucl-2026-27-md05-(\d{2})$/.exec(fixture.id)?.[1];
 const paragraphs=expectations[key];
 const date=Number(key)<=9?'2026-11-24':'2026-11-25';
 if(paragraphs&&fixture.date===date&&fixture.status==='scheduled'){
  const evidence=expectationComparisons[fixture.id];
  return `<section class="rd-section rd-match-expectation" aria-labelledby="aspettativa-gara-title" data-match-expectation><header class="rd-section-heading"><h2 id="aspettativa-gara-title">Aspettativa Gara</h2></header><div class="rd-section-content"><p>${emphasizeSentence(paragraphs[0])}</p><p>${escape(paragraphs[1])}</p><p>${emphasizeRates(evidence)}</p><p>${emphasizeSentence(interpretations[key])}</p><p class="rd-footnote">Dati disponibili fino all’8 novembre. Campioni limitati; lettura da aggiornare con le formazioni.</p></div></section>`;
 }
 if(fixture.id!=='ucl-2026-27-md05-10'||fixture.date!=='2026-11-25'||fixture.status!=='scheduled')return '';
 return `<section class="rd-section rd-match-expectation" aria-labelledby="aspettativa-gara-title" data-match-expectation>
  <header class="rd-section-heading"><h2 id="aspettativa-gara-title">Aspettativa Gara</h2></header>
  <div class="rd-section-content">
   <p><strong>Il Barcellona arriva con un potenziale offensivo superiore.</strong> Nelle prime 12 partite di Liga ha segnato 48 gol, quattro a gara anche in trasferta; nelle prime quattro di Champions ne ha realizzati 14, con una media di 3,5. Il Sabah ha concesso appena sei gol nei dieci incontri di campionato disputati fino all’8 novembre, ma la tenuta contro gli avversari della lega azera non è direttamente trasferibile al confronto con l’attacco catalano.</p>
   <p><strong>Il fattore casa invita comunque alla cautela.</strong> In Champions il Sabah ha subito quattro gol sia a Manchester sia contro il Viking, ma in casa ha battuto lo Slavia 2–0 e perso 1–2 con il Dortmund. Sono soltanto due gare interne; inoltre, contro il Viking gli ultimi due gol sono arrivati dopo un’espulsione.</p>
   <p>Le verifiche alternative restituiscono indicazioni diverse: la prova sui rating resta a circa 2,4 gol del Barcellona, mentre il confronto europeo sale a 3. Prendendo come riferimento la sua produzione stagionale, abbiamo esplorato anche scenari da <strong>3,5–4 gol</strong>, nei quali acquistano peso risultati come <strong>0–3, 1–3 e 1–4</strong>. Questi ultimi sono ipotesi di sensibilità, non una nuova stima calibrata.</p>
  </div>
 </section>`;
}
