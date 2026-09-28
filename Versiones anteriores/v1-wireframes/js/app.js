/* ==========================================================================
   NIDO · Prototipo — router, preferencias de accesibilidad y microflujos
   Vanilla JS a propósito: el equipo es de diseño, no de programación, y
   cualquiera tiene que poder abrir el archivo y leerlo.
   ========================================================================== */

(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;

  /* ---------------------------------------------------------------------- */
  /* Mapa de pantallas. `extra: true` = no está en los wireframes.           */
  /* ---------------------------------------------------------------------- */

  const SCREENS = [
    { id: 'bienvenida',    nombre: '01 · Bienvenida' },
    { id: 'telefono',      nombre: '02 · Tu número' },
    { id: 'codigo',        nombre: '03 · Código de confirmación' },
    { id: 'perfil-foto',   nombre: '04 · Tu foto y tu nombre' },
    { id: 'copia',         nombre: '05 · Copia de seguridad' },
    { id: 'home',          nombre: '07 · Home (+ 06 permisos)' },
    { id: 'album',         nombre: '08 · Álbum' },
    { id: 'foto',          nombre: '09 · Foto' },
    { id: 'persona-nueva', nombre: '10 · Persona no identificada' },
    { id: 'persona',       nombre: '11 · Persona identificada' },
    { id: 'crear',         nombre: '12 · Crear con IA' },
    { id: 'visita',        nombre: '13/14 · Modo visita' },
    { id: 'buscar',        nombre: 'Buscar por voz',  extra: true },
    { id: 'ajustes',       nombre: 'Tu perfil / ajustes', extra: true }
  ];

  let stack = [];
  let current = null;

  function announce(msg) {
    $('#announcer').textContent = String(msg).replace(/<[^>]+>/g, ' ').trim();
  }

  function go(id, { replace = false } = {}) {
    if (id === current) return;
    if (current && !replace) stack.push(current);
    if (current === 'visita') stopVisita();

    $$('.screen').forEach(s => s.classList.toggle('is-active', s.dataset.screen === id));
    current = id;

    const view = $(`.screen[data-screen="${id}"]`);
    const body = view.querySelector('.screen__body');
    if (body) body.scrollTop = 0;
    // El foco va al principio de la pantalla: quien navega con lector de
    // pantalla o con teclado no se queda en el botón que acaba de pulsar.
    const target = view.querySelector('.title, .brand, [tabindex="0"]') || view;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });

    announce(SCREENS.find(s => s.id === id)?.nombre || id);
    $$('#demo-screens button').forEach(b =>
      b.setAttribute('aria-current', String(b.dataset.goto === id)));

    if (id === 'codigo') runAutofill();
    if (id === 'visita') startVisita();
  }

  function back() {
    const prev = stack.pop();
    go(prev || 'home', { replace: true });
  }

  /* ---------------------------------------------------------------------- */
  /* Preferencias de accesibilidad                                           */
  /* Se guardan en el propio navegador: quien prueba el prototipo no tiene   */
  /* que volver a ajustarlo en cada recarga.                                 */
  /* ---------------------------------------------------------------------- */

  const PREFS = ['view', 'text', 'contrast'];
  // Valores por defecto en el propio JS: así el prototipo funciona aunque el
  // <html> no traiga los data- puestos a mano (por ejemplo, publicado).
  const DEFAULTS = { view: 'cuadricula', text: 'normal', contrast: 'normal' };

  function setPref(key, value) {
    root.dataset[key] = value;
    try { localStorage.setItem('nido.' + key, value); } catch (e) { /* modo privado */ }
    const attr = 'data-set-' + key;
    $$(`[${attr}]`).forEach(b =>
      b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value)));
    if (key === 'view') announce(value === 'filas' ? 'Fotos en lista' : 'Fotos en cuadrícula');
  }

  PREFS.forEach(k => {
    let saved = null;
    try { saved = localStorage.getItem('nido.' + k); } catch (e) { /* noop */ }
    setPref(k, saved || root.dataset[k] || DEFAULTS[k]);
  });

  /* ---------------------------------------------------------------------- */
  /* Colecciones                                                             */
  /* ---------------------------------------------------------------------- */

  function renderColl(ul, items, onPick) {
    ul.innerHTML = '';
    items.forEach(it => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'coll__btn';
      btn.innerHTML =
        `<span class="thumb coll__thumb" style="background-image:${it.bg}"></span>` +
        `<span><span class="coll__label">${it.label}</span>` +
        `<span class="coll__meta">${it.meta || ''}</span></span>`;
      btn.addEventListener('click', () => onPick(it));
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function renderPeople(ul, people, onPick, { addUnknown = false } = {}) {
    ul.innerHTML = '';
    people.forEach(p => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'people__btn';
      btn.innerHTML = `<span class="avatar">${p.inicial}</span><span class="people__name">${p.nombre}</span>`;
      btn.addEventListener('click', () => onPick(p));
      li.appendChild(btn); ul.appendChild(li);
    });
    if (addUnknown) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'people__btn';
      btn.innerHTML =
        `<span class="avatar avatar--unknown"><svg width="30" height="30" viewBox="0 0 24 24"><use href="#i-user"/></svg></span>` +
        `<span class="people__name">¿Quién es?</span>`;
      btn.addEventListener('click', () => go('persona-nueva'));
      li.appendChild(btn); ul.appendChild(li);
    }
  }

  /* --- Home -------------------------------------------------------------- */

  let tab = 'fotos';

  function renderHome() {
    const body = $('#home-body');
    body.innerHTML = '';

    if (tab === 'albumes') {
      body.appendChild(sectionEl('Todos tus álbumes'));
      const ul = collEl('coll coll--2');
      renderColl(ul, NIDO.albumes, a => openAlbum(a));
      body.appendChild(ul);
      return;
    }

    const bloques = [
      ['Hoy hace 2 años',       NIDO.momentos, a => openAlbum(a)],
      ['Por grupos de personas', NIDO.grupos,   a => openAlbum(a)]
    ];
    bloques.forEach(([titulo, items, onPick]) => {
      body.appendChild(sectionEl(titulo));
      const ul = collEl('coll');
      renderColl(ul, items, onPick);
      body.appendChild(ul);
    });

    body.appendChild(sectionEl('Por persona'));
    const ul = document.createElement('ul');
    ul.className = 'people';
    renderPeople(ul, NIDO.personas, p => openPersona(p), { addUnknown: true });
    body.appendChild(ul);
  }

  const sectionEl = t => {
    const h = document.createElement('h2'); h.className = 'section'; h.textContent = t; return h;
  };
  const collEl = cls => { const ul = document.createElement('ul'); ul.className = cls; return ul; };

  /* --- Álbum, foto, persona --------------------------------------------- */

  function openAlbum(a) {
    $('#album-title').textContent = a.label;
    renderColl($('#album-grid'), NIDO.fotosAlbum, f => openFoto(f));
    go('album');
  }

  function openFoto(f) {
    $('#foto-big').style.backgroundImage = f.bg;
    renderPeople($('#foto-people'), NIDO.personas.slice(0, 2), p => openPersona(p), { addUnknown: true });
    go('foto');
  }

  function openPersona(p) {
    $('#persona-avatar').textContent = p.inicial;
    $('#persona-nombre').textContent = p.nombre;
    $('#persona-rel').textContent = p.rel;
    $('#persona-seccion').textContent = 'Fotos de ' + p.nombre;
    renderColl($('#persona-grid'), NIDO.fotosPersona, f => openFoto(f));
    go('persona');
  }

  /* ---------------------------------------------------------------------- */
  /* Diálogo (permisos y confirmaciones)                                     */
  /* ---------------------------------------------------------------------- */

  const sheet = $('#sheet-permisos');
  let sheetPrevFocus = null;

  function openSheet({ icon = 'i-image', text, ok = 'Sí', ghost, onOk, onGhost }) {
    sheetPrevFocus = document.activeElement;
    sheet.querySelector('.sheet__card').innerHTML =
      `<span class="sheet__icon"><svg class="ico" viewBox="0 0 24 24" style="color:var(--c-blue-dark)"><use href="#${icon}"/></svg></span>
       <p class="sheet__text">${text}</p>
       <button class="btn btn--primary" data-ok>${ok}</button>
       ${ghost ? `<button class="btn btn--ghost" data-ghost>${ghost}</button>` : ''}`;
    sheet.classList.add('is-open');
    sheet.querySelector('[data-ok]').focus();
    sheet.querySelector('[data-ok]').onclick = () => { closeSheet(); onOk && onOk(); };
    const g = sheet.querySelector('[data-ghost]');
    if (g) g.onclick = () => { closeSheet(); onGhost && onGhost(); };
    announce(text);
  }

  function closeSheet() {
    sheet.classList.remove('is-open');
    if (sheetPrevFocus) sheetPrevFocus.focus();
  }

  // Atrapa el foco dentro del diálogo mientras está abierto.
  sheet.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = $$('button', sheet);
    const i = f.indexOf(document.activeElement);
    e.preventDefault();
    f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  });

  function pedirPermisos() {
    openSheet({
      text: 'Danos acceso a tu galería y organizaremos tus momentos',
      ok: 'Permitir',
      ghost: 'Quiero saber más información',
      onGhost: () => openSheet({
        icon: 'i-image',
        text: 'Solo miramos las fotos que ya tienes en el teléfono, para agruparlas por momentos y por personas. No se envían a ningún sitio.',
        ok: 'Entendido',
        onOk: pedirPermisos
      })
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Teclado numérico y autorrelleno del SMS                                 */
  /* ---------------------------------------------------------------------- */

  const phone = { digits: '' };

  function paintPhone() {
    const d = phone.digits;
    $('#phone-field').textContent = d.length
      ? (d.match(/.{1,3}/g) || []).join(' · ')
      : '6 12 · 345 · 678';
  }

  const keypad = $('#keypad');
  ['1','2','3','4','5','6','7','8','9','','0','⌫'].forEach(k => {
    const b = document.createElement('button');
    b.textContent = k;
    if (!k) { b.className = 'key--empty'; b.tabIndex = -1; b.setAttribute('aria-hidden','true'); }
    b.addEventListener('click', () => {
      if (k === '⌫') phone.digits = phone.digits.slice(0, -1);
      else if (k && phone.digits.length < 9) phone.digits += k;
      paintPhone();
    });
    if (k === '⌫') b.setAttribute('aria-label', 'Borrar');
    keypad.appendChild(b);
  });

  let autofillTimers = [];
  function runAutofill() {
    // Reproduce el autorrelleno nativo del código SMS de iOS/Android:
    // la persona mayor no teclea seis dígitos contrarreloj.
    autofillTimers.forEach(clearTimeout);
    autofillTimers = [];
    const boxes = $$('#code-boxes span');
    boxes.forEach(b => { b.textContent = ''; b.classList.remove('is-filled'); });
    const code = '6294';
    code.split('').forEach((n, i) => {
      autofillTimers.push(setTimeout(() => {
        boxes[i].textContent = n;
        boxes[i].classList.add('is-filled');
      }, 400 + i * 260));
    });
    autofillTimers.push(setTimeout(() => {
      $('#code-status').textContent = 'Código correcto';
      announce('Código correcto. Continuando a tu perfil.');
    }, 1700));
    autofillTimers.push(setTimeout(() => {
      if (current === 'codigo') go('perfil-foto', { replace: true });
    }, 2900));
  }

  /* ---------------------------------------------------------------------- */
  /* Voz                                                                     */
  /* El prototipo simula la escucha. Si el navegador trae reconocimiento de  */
  /* voz y la página se sirve por https/localhost, usa el real.              */
  /* ---------------------------------------------------------------------- */

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function listen(kind, onResult) {
    const guion = NIDO.guiones[kind] || [];
    const fake = guion[Math.floor(Math.random() * guion.length)] || '…';

    if (!SR) return setTimeout(() => onResult(fake), 2000);

    try {
      const r = new SR();
      r.lang = 'es-ES';
      r.interimResults = false;
      r.maxAlternatives = 1;
      let done = false;
      const finish = t => { if (!done) { done = true; onResult(t); } };
      r.onresult = e => finish(e.results[0][0].transcript);
      r.onerror = () => finish(fake);
      r.onend  = () => finish(fake);
      r.start();
      setTimeout(() => { try { r.stop(); } catch (e) { /* noop */ } }, 6000);
    } catch (e) {
      setTimeout(() => onResult(fake), 2000);
    }
  }

  function wireMic(btn) {
    const kind = btn.dataset.mic;
    const box  = $('#mic-' + kind) || btn.closest('.mic');
    const hint = box.querySelector('.mic__hint');
    const out  = $('#' + kind + '-transcript');
    const original = hint ? hint.textContent : '';

    btn.addEventListener('click', () => {
      if (box.classList.contains('is-listening')) return;
      box.classList.add('is-listening');
      if (hint) hint.textContent = 'Te escucho…';
      if (out) out.innerHTML = '<em>Escuchando…</em>';
      announce('Te escucho');

      listen(kind, texto => {
        box.classList.remove('is-listening');
        if (hint) hint.textContent = original;
        if (out) out.textContent = '“' + texto + '”';
        announce('Has dicho: ' + texto);
        resolverVoz(kind, texto);
      });
    });
  }

  function resolverVoz(kind, texto) {
    if (kind === 'crear') {
      openSheet({
        icon: 'i-spark',
        text: `¿Preparo esto?<br><strong>${texto}</strong>`,
        ok: 'Sí, prepáralo',
        ghost: 'No, prefiero otra cosa',
        onOk: () => openSheet({
          icon: 'i-play', text: 'Listo. Te avisamos cuando esté.', ok: 'Vale',
          onOk: () => go('home', { replace: true })
        })
      });
    }
    if (kind === 'buscar') {
      openSheet({
        icon: 'i-search',
        text: `He encontrado fotos de<br><strong>${texto}</strong>`,
        ok: 'Verlas',
        ghost: 'Buscar otra cosa',
        onOk: () => openAlbum(NIDO.momentos[0])
      });
    }
    if (kind === 'nombrar-persona') {
      $$('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      announce('Persona nombrada: ' + texto);
      go('persona');
    }
    if (kind === 'nombrar-album') {
      $('#album-title').textContent = texto;
    }
  }

  // Botones "por voz" que no son el micro grande.
  $$('[data-voz]').forEach(btn => {
    const kind = btn.dataset.voz;
    btn.addEventListener('click', () => {
      const label = btn.textContent.trim();
      btn.textContent = 'Te escucho…';
      announce('Te escucho');
      listen(kind, texto => {
        btn.textContent = label;
        announce('Has dicho: ' + texto);
        resolverVoz(kind, texto);
      });
    });
  });

  $$('[data-mic]').forEach(wireMic);

  /* ---------------------------------------------------------------------- */
  /* Modo visita (13 / 14)                                                   */
  /* Equivalente de diseño al Acceso Guiado (iOS) y al anclaje de pantalla   */
  /* (Android): una sola cosa a la vista, controles que se ocultan solos y   */
  /* una salida deliberada que no se activa por un roce.                     */
  /* ---------------------------------------------------------------------- */

  const visit = $('#visit');
  let vIndex = 0, vIdle = null, vHold = null, vRaf = null;

  function paintVisita() {
    const f = NIDO.fotosAlbum[vIndex];
    $('#visit-photo').style.backgroundImage = f.bg;
    $('#visit-title').textContent = `${f.label} · ${f.meta}`;
  }

  function wakeVisita() {
    visit.classList.remove('is-idle');
    clearTimeout(vIdle);
    vIdle = setTimeout(() => visit.classList.add('is-idle'), 4000);
  }

  function startVisita() {
    vIndex = 0;
    paintVisita();
    wakeVisita();
    visit.focus();
    announce('Modo visita. Mantén pulsada la equis para salir.');
  }

  function stopVisita() { clearTimeout(vIdle); cancelHold(); }

  visit.addEventListener('pointerdown', wakeVisita);
  visit.addEventListener('mousemove', wakeVisita);

  $('#visit-prev').addEventListener('click', () => {
    vIndex = (vIndex - 1 + NIDO.fotosAlbum.length) % NIDO.fotosAlbum.length; paintVisita(); wakeVisita();
  });
  $('#visit-next').addEventListener('click', () => {
    vIndex = (vIndex + 1) % NIDO.fotosAlbum.length; paintVisita(); wakeVisita();
  });

  const HOLD_MS = 1200;
  const ring = $('#visit-ring');

  function startHold() {
    cancelHold();
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(100, ((now - t0) / HOLD_MS) * 100);
      ring.style.setProperty('--p', p);
      if (p >= 100) { cancelHold(); back(); }
      else vRaf = requestAnimationFrame(step);
    };
    vRaf = requestAnimationFrame(step);
  }
  function cancelHold() {
    if (vRaf) cancelAnimationFrame(vRaf);
    vRaf = null;
    ring.style.setProperty('--p', 0);
  }

  const exitBtn = $('#visit-exit');
  ['pointerdown'].forEach(e => exitBtn.addEventListener(e, ev => { ev.preventDefault(); startHold(); }));
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => exitBtn.addEventListener(e, cancelHold));
  // Con teclado no se puede "mantener": Enter sale directamente.
  exitBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); back(); } });

  /* ---------------------------------------------------------------------- */
  /* Cableado general                                                        */
  /* ---------------------------------------------------------------------- */

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-go], [data-back], [data-confirm], [data-set-view], [data-set-text], [data-set-contrast], [data-tab], .chip');
    if (!el) return;

    if (el.dataset.setView)     return setPref('view', el.dataset.setView);
    if (el.dataset.setText)     return setPref('text', el.dataset.setText);
    if (el.dataset.setContrast) return setPref('contrast', el.dataset.setContrast);

    if (el.classList.contains('chip')) {
      const on = el.getAttribute('aria-pressed') === 'true';
      $$('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      el.setAttribute('aria-pressed', String(!on));
      return;
    }

    if (el.dataset.tab) {
      tab = el.dataset.tab;
      $$('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
      renderHome();
      return;
    }

    if (el.dataset.confirm !== undefined) {
      return openSheet({
        icon: 'i-spark',
        text: el.dataset.confirm + '.<br>¿Lo hago?',
        ok: 'Sí, hazlo',
        ghost: 'Ahora no',
        onOk: () => openSheet({ icon: 'i-play', text: 'Listo. Te avisamos cuando esté.', ok: 'Vale' })
      });
    }

    if (el.dataset.back !== undefined) return back();

    if (el.dataset.go) {
      go(el.dataset.go);
      if (el.dataset.permisos !== undefined) setTimeout(pedirPermisos, 450);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (sheet.classList.contains('is-open')) closeSheet();
      else if (current !== 'home' && current !== 'bienvenida') back();
    }
  });

  /* Índice de pantallas del panel de la demo */
  const list = $('#demo-screens');
  SCREENS.forEach(s => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.textContent = s.nombre;
    b.dataset.goto = s.id;
    if (s.extra) b.classList.add('is-extra');
    b.addEventListener('click', () => {
      if (s.id === 'album')   return openAlbum(NIDO.momentos[0]);
      if (s.id === 'foto')    return openFoto(NIDO.fotosAlbum[0]);
      if (s.id === 'persona') return openPersona(NIDO.personas[0]);
      go(s.id);
    });
    li.appendChild(b);
    list.appendChild(li);
  });

  /* Arranque */
  renderHome();
  renderColl($('#crear-grid'), NIDO.creaciones, c => openSheet({
    icon: 'i-play',
    text: `<strong>${c.label}</strong><br>${c.meta}`,
    ok: 'Verlo',
    ghost: 'Ahora no',
    onOk: () => go('visita')
  }));
  renderColl($('#buscar-grid'), NIDO.momentos.slice(0, 2), a => openAlbum(a));
  renderPeople($('#buscar-people'), NIDO.personas, p => openPersona(p));
  paintPhone();
  go('bienvenida');
})();
