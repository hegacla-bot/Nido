// Nido · editor visual SOLO LOCAL para recolocar a mano los pollitos Y las burbujas de onboarding.
// Se activa con ?editar=pollitos en la URL — en cualquier otro caso este archivo no hace nada.
// Cada elemento móvil lleva en su HTML data-onb-css (el selector CSS exacto que lo posiciona) y
// data-onb-file (en qué archivo vive esa regla) — así el editor sabe qué guardar sin adivinar.
// Guardar escribe de verdad en el .css del proyecto, vía servidor-local.mjs (nunca se despliega).
(function () {
  if (!/(?:^|[?&])editar=pollitos(?:&|$)/.test(location.search)) return;

  const CANVAS_REF = 393; // ancho de referencia del lienzo (css/base.css)
  function escala() {
    const canvas = document.querySelector('.screen-canvas');
    return canvas ? canvas.getBoundingClientRect().width / CANVAS_REF : 1;
  }
  function remDe(el, prop) { return parseFloat(getComputedStyle(el)[prop]) / 16; }

  // Las pantallas inactivas se ocultan con opacity:0 (no display:none), así que offsetParent no
  // sirve para saber qué se ve de verdad — por eso el panel se quedaba siempre en "step 1" (el
  // primero del DOM), aunque se hubiera navegado a otra pantalla/paso. Se comprueba opacity/hidden/
  // display en toda la cadena de ancestros, que es lo que de verdad decide si algo se ve.
  function esVisibleDeVerdad(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      if (n.hidden) return false;
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
      n = n.parentElement;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function elementoVisible() {
    return Array.from(document.querySelectorAll('.onboarding-pollito[data-onb-css], .onboarding-tooltip[data-onb-css]'))
      .find(esVisibleDeVerdad);
  }

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;background:#1f2a44;color:#fff;' +
    'font:13px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;padding:12px 14px;border-radius:14px;' +
    'box-shadow:0 6px 20px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:8px;width:260px;white-space:pre-line;';
  panel.innerHTML =
    '<b>🐣 Editor de onboarding (solo local)</b>' +
    '<span id="ep-info">Arrastra el pollito o la burbuja de esta pantalla.</span>' +
    '<button id="ep-guardar" style="background:#516dff;color:#fff;border:0;border-radius:10px;padding:9px;font-weight:700;cursor:pointer" disabled>Guardar posición</button>';
  document.body.appendChild(panel);
  const info = panel.querySelector('#ep-info');
  const btn = panel.querySelector('#ep-guardar');

  let pendiente = null; // {el, leftRem, topRem}
  let arrastre = null;
  let ultimoDragTs = 0;

  function actualizarInfo() {
    const el = elementoVisible();
    if (!el) { info.textContent = 'Nada movible visible en esta pantalla ahora mismo.\nNavega hasta el paso que quieras ajustar.'; return; }
    const tipo = el.classList.contains('onboarding-pollito') ? 'Pollito' : 'Burbuja';
    info.textContent = tipo + ': ' + el.dataset.onbCss + '\nleft: ' + remDe(el, 'left').toFixed(4) + 'rem   top: ' + remDe(el, 'top').toFixed(4) + 'rem';
  }
  actualizarInfo();
  // Con un enlace directo (p.ej. #onboarding-3) este script corre ANTES que app.js aplique el
  // hash inicial, así que la primera lectura puede decir "nada visible" un instante — se repite
  // sola en cuanto la página termina de montarse.
  window.addEventListener('load', () => setTimeout(actualizarInfo, 300));
  // Tras cualquier toque (cambio de pantalla/paso) puede haber otro elemento visible.
  document.addEventListener('click', () => setTimeout(actualizarInfo, 250), true);

  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.onboarding-pollito[data-onb-css], .onboarding-tooltip[data-onb-css]');
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
