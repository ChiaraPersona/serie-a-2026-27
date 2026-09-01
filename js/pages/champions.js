export function createPage(){
  function render(){
    document.querySelector("#app").innerHTML=`
      <section class="champions-hero" aria-labelledby="champions-title">
        <div class="champions-status"><span aria-hidden="true"></span>In preparazione</div>
        <p class="eyebrow">UEFA Champions League 2026/27</p>
        <h1 id="champions-title">La notte d’Europa<br>comincia qui.</h1>
        <p class="lead">Stiamo costruendo il nuovo spazio dedicato alla Champions League: calendario, squadre italiane e letture delle partite arriveranno progressivamente.</p>
        <div class="champions-orbit" aria-hidden="true"><span>★</span></div>
      </section>
      <section class="champions-preview" aria-labelledby="champions-preview-title">
        <header>
          <p class="eyebrow">Prima struttura</p>
          <h2 id="champions-preview-title">Cosa troverai in questa pagina</h2>
        </header>
        <div class="champions-preview-grid">
          <article><span>01</span><h3>Calendario</h3><p>Date, orari e risultati del percorso europeo.</p></article>
          <article><span>02</span><h3>Squadre italiane</h3><p>Un accesso diretto alle gare dei club di Serie A.</p></article>
          <article><span>03</span><h3>Letture</h3><p>Analisi prepartita separate dai dati del campionato.</p></article>
        </div>
      </section>`;
  }
  return {render};
}
