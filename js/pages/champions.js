export function createPage(){
  function render(){
    document.querySelector("#app").innerHTML=`
      <section class="champions-hero" aria-labelledby="champions-title">
        <div class="champions-status"><span aria-hidden="true"></span>In preparazione</div>
        <p class="eyebrow">UEFA Champions League 2026/27</p>
        <h1 id="champions-title">La notte d’Europa<br>comincia qui.</h1>
        <p class="lead">Stiamo costruendo uno spazio completo dedicato alla Champions League: seguiremo tutte le partite, dall’inizio della competizione fino alla finale.</p>
        <div class="champions-orbit" aria-hidden="true"><span>★</span></div>
      </section>
      <section class="champions-preview" aria-labelledby="champions-preview-title">
        <header>
          <p class="eyebrow">Prima struttura</p>
          <h2 id="champions-preview-title">Cosa troverai in questa pagina</h2>
        </header>
        <div class="champions-preview-grid">
          <article><span>01</span><h3>Calendario completo</h3><p>Date, orari e risultati di tutte le partite della competizione.</p></article>
          <article><span>02</span><h3>Tutte le squadre</h3><p>Ogni club e ogni incrocio, senza limitare la copertura alle italiane.</p></article>
          <article><span>03</span><h3>Letture partita per partita</h3><p>Analisi prepartita dedicate a ogni gara e separate dai dati del campionato.</p></article>
        </div>
      </section>`;
  }
  return {render};
}
