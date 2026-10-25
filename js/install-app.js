(() => {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  let installPrompt;
  let button;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (button && !standalone()) button.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    if (button) button.hidden = true;
  });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register(new URL('sw.js', base), {scope: base.pathname, updateViaCache: 'none'})
      .catch(error => console.warn('App: registrazione non riuscita', error));
  }
  const init = () => {
    if (standalone()) return;
    const footer = document.querySelector('.site-footer');
    if (!footer) return;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'install-app-button';
    button.textContent = 'Installa app';
    button.hidden = !ios && !installPrompt;
    const dialog = document.createElement('dialog');
    dialog.className = 'install-app-dialog';
    dialog.setAttribute('aria-labelledby', 'install-app-title');
    dialog.innerHTML = '<h2 id="install-app-title">Serie A sul tuo telefono</h2><p>Apri il menu Condividi del browser, scegli <strong>Aggiungi alla schermata Home</strong> e conferma. Se la voce non compare, apri il sito in Safari.</p><form method="dialog"><button class="install-app-button">Ho capito</button></form>';
    document.body.append(dialog);
    button.addEventListener('click', async () => {
      if (!installPrompt) { dialog.showModal(); return; }
      const prompt = installPrompt;
      installPrompt = null;
      button.hidden = true;
      try { await prompt.prompt(); await prompt.userChoice; }
      catch (error) { console.warn('App: installazione non riuscita', error); }
    });
    const installArea = document.createElement('div');
    installArea.className = 'install-app-area';
    installArea.append(button);
    footer.before(installArea);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
