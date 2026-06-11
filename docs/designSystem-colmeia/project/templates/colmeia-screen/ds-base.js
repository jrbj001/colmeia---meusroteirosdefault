// templates/colmeia-screen/ds-base.js
// Loads the Colmeia Design System (global CSS + component bundle) for this template.
(() => {
  const base = '../..';
  for (const p of ['styles.css']) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = base + '/' + p;
    document.head.appendChild(l);
  }
  const s = document.createElement('script');
  s.src = base + '/_ds_bundle.js';
  s.onerror = () =>
    console.error(
      'ds-base.js: failed to load ' + s.src +
      ' — in a consuming project, point the base line at the bound _ds/<folder> tree relative to this page ' +
      '(e.g. _ds/<folder> at the project root, ../_ds/<folder> one level down); in a fresh design system this can just mean the bundle is not compiled yet'
    );
  document.head.appendChild(s);
})();
