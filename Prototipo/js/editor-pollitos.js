// Nido · editor visual SOLO LOCAL para recolocar los pollitos de onboarding a mano.
// Se activa con ?editar=pollitos en la URL — en cualquier otro caso este archivo no hace nada.
// Cada capa de onboarding lleva en su HTML data-onb-css (el selector CSS exacto que la posiciona)
// y data-onb-file (en qué archivo vive esa regla) — así el editor sabe qué guardar sin adivinar.
// Guardar escribe de verdad en el .css del proyecto, vía servidor-local.mjs (nunca se despliega).
(function () {
  if (!/(?:^|[?&])editar=pollitos(?:&|$)/.test(location.search)) return;

  const CANVAS_REF = 393; // ancho de referencia del lienzo (css/base.css)
  function escala() {
    const canvas = document.querySelector('.screen-canvas');
    return canvas ? canvas.getBoundingClientRect().width / CANVAS_REF : 1;
  }
  // getComputedStyle ya da el valor en el espacio SIN escalar del propio elemento (los transforms
  // del ancestro no afectan a left/top calculados) — para leer basta con pasar a rem a 16px/rem.
  function remDe(el, prop) { return parseFloat(getComputedStyle(el)[prop]) / 16; }

  function pollitoVisible() {
    return Array.from(document.querySelectorAll('.onboarding-pollito[data-onb-css]'))
      .find((el) => el.offsetParent !== null);
  }

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;background:#1f2a44;color:#fff;' +
    'font:13px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;padding:12px 14px;border-radius:14px;' +
    'box-shadow:0 6px 20px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:8px;width:260px;white-space:pre-line;';
  panel.innerHTML =
    '<b>🐣 Editor de pollitos (solo local)</b>' +
    '<span id="ep-info">Arrastra el pollito de esta pantalla.</span>' +
    '<button id="ep-guardar" style="background:#516dff;color:#fff;border:0;border-radius:10px;padding:9px;font-weight:700;cursor:pointer" disabled>Guardar posición</button>';
  document.body.appendChild(panel);
  const info = panel.querySelector('#ep-info');
  const btn = panel.querySelector('#ep-guardar');

  let pendiente = null; // {el, leftRem, topRem}
  let arrastre = null;
  let ultimoDragTs = 0;

  function actualizarInfo() {
    const el = pollitoVisible();
    if (!el) { info.textContent = 'Ningún pollito de onboarding visible en esta pantalla.\nNavega hasta el paso que quieras ajustar.'; return; }
    info.textContent = el.dataset.onbCss + '\nleft: ' + remDe(el, 'left').toFixed(4) + 'rem   top: ' + remDe(el, 'top').toFixed(4) + 'rem';
  }
  actualizarInfo();
  // Tras cualquier toque (cambio de pantalla/paso) puede haber un pollito distinto visible.
  document.addEventListener('click', () => setTimeout(actualizarInfo, 250), true);

  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.onboarding-pollito[data-onb-css]');
    if (!el) return;
    e.preventDefault();
    arrastre = {
      el, startX: e.clientX, startY: e.clientY,
      startLeft: parseFloat(getComputedStyle(el).left) || 0,
      startTop: parseFloat(getComputedStyle(el).top) || 0,
      movido: false,
    };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
  }, true);

  document.addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.startX, dy = e.clientY - arrastre.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) arrastre.movido = true;
    const s = escala();
    arrastre.el.style.left = (arrastre.startLeft + dx / s) + 'px';
    arrastre.el.style.top = (arrastre.startTop + dy / s) + 'px';
    actualizarInfo();
  });

  document.addEventListener('pointerup', () => {
    if (!arrastre) return;
    if (arrastre.movido) {
      pendiente = { el: arrastre.el, leftRem: remDe(arrastre.el, 'left'), topRem: remDe(arrastre.el, 'top') };
      btn.disabled = false;
      btn.textContent = 'Guardar posición';
      ultimoDragTs = Date.now();
    }
    arrastre = null;
  });

  // El "toca para avanzar" del propio onboarding (js/app.js) no debe dispararse justo tras soltar un arrastre.
  document.addEventListener('click', (e) => {
    if (Date.now() - ultimoDragTs < 300) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);

  btn.addEventListener('click', async () => {
    if (!pendiente) return;
    const { el, leftRem, topRem } = pendiente;
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
      const res = await fetch('/__guardar-posicion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          file: el.dataset.onbFile,
          selector: el.dataset.onbCss,
          left: leftRem.toFixed(4) + 'rem',
          top: topRem.toFixed(4) + 'rem',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'fallo al guardar');
      btn.textContent = '✓ Guardado en el CSS';
      pendiente = null;
      setTimeout(() => { btn.textContent = 'Guardar posición'; btn.disabled = true; }, 1400);
    } catch (err) {
      btn.textContent = '⚠️ ' + err.message;
      btn.disabled = false;
      setTimeout(() => { btn.textContent = 'Guardar posición'; }, 2500);
    }
  });
})();
