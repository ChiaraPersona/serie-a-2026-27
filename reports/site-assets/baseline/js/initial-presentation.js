// Parser-blocking, immediately after <body>: establish the route's existing
// reading theme before the header or loading placeholder can be painted.
{
  const params = new URLSearchParams(location.search);
  const page = document.body.dataset.page;
  if(page==='betting'&&params.get('competizione')==='champions')document.body.dataset.competitionTheme='champions';
  if (params.get('match') && params.get('layout') !== 'legacy' && ['readings', 'champions'].includes(page)) {
    document.body.dataset.readingDetailTheme = page === 'champions' ? 'champions' : 'serie-a';
  }
}
