(() => {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  let installPrompt;
  let button;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  window.addEventListener('beforeinstallprompt', event => {
    if (!document.querySelector('[data-install-android]')) return;
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
    button = document.querySelector('[data-install-android]');
    if (!button) return;
    button.hidden = !installPrompt || standalone();
    const status = document.querySelector('[data-install-status]');
    if (status) status.hidden = !standalone();
    button.addEventListener('click', async () => {
      if (!installPrompt) return;
      const prompt = installPrompt;
      installPrompt = null;
      button.hidden = true;
      try { await prompt.prompt(); await prompt.userChoice; }
      catch (error) { console.warn('App: installazione non riuscita', error); }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
