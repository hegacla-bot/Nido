/* ==========================================================================
   NIDO v2 · La v1 adaptada al lenguaje de Acceso Asistido
   Mismas pantallas y mismo flujo que los wireframes; cambia cómo se
   presentan y cómo se navega.
   ========================================================================== */

(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const svg  = id => `<svg viewBox="0 0 24 24"><use href="#${id}"/></svg>`;

  const SCREENS = [
    { g: 'Alta', id: 'bienvenida', n: '01 · Bienvenida' },
    { id: 'telefono',      n: '02 · Tu número' },
    { id: 'codigo',        n: '03 · Código' },
    { id: 'perfil-foto',   n: '04 · Tu foto y tu nombre' },
    { id: 'copia',         n: '05 · Copia de seguridad' },
    { g: 'Uso diario', id: 'home', n: '07 · Home (+ 06 permisos)' },
    { id: 'a-mano',        n: 'A mano' },
    { id: 'documento',     n: 'Ver una ficha' },
    { id: 'album',         n: '08 · Álbum' },
    { id: 'foto',          n: '09 · Foto' },
    { id: 'persona-nueva', n: '10 · Persona no identificada' },
    { id: 'persona',       n: '11 · Persona identificada' },
    { id: 'crear',         n: '12 · Crear con IA' },
    { g: 'Extras de la v1', id: 'buscar', n: 'Buscar por voz' },
    { id: 'visita',        n: '13/14 · Ver en grande' },
    { id: 'ajustes',       n: 'Tus cosas' }
  ];

  let stack = [], current = null;
  const announce = m => { $('#announcer').textContent = String(m).replace(/<[^>]+>/g, ' ').trim(); };

  function go(id, { replace = false } = {}) {
    if (id === current) return;
    if (current && !replace) stack.push(current);
    if (current === 'visita') stopVisita();

    $$('.screen').forEach(s => s.classList.toggle('is-active', s.dataset.screen === id));
    current = id;

    const view = $(`.screen[data-screen="${id}"]`);
    const body = view.querySelector('.screen__body');
    if (body) body.scrollTop = 0;
    const f = view.querySelector('.appbar__title') || view;
    f.setAttribute('tabindex', '-1');
    f.focus({ preventScroll: true });

    announce(SCREENS.find(s => s.id === id)?.n || id);
    $$('#demo-list button').forEach(b => b.setAttribute('aria-current', String(b.dataset.goto === id)));

    if (id === 'codigo') autofill();
    if (id === 'visita') startVisita();
  }
  const back = () => go(stack.pop() || 'home', { replace: true });

  /* --- Preferencias -------------------------------------------------------- */

  const DEFAULTS = { view: 'filas', text: 'normal', contrast: 'normal' };
  function setPref(k, v) {
    root.dataset[k] = v;
    try { localStorage.setItem('nido2.' + k, v); } catch (e) {}
    $$(`[data-set-${k}]`).forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-set-' + k) === v)));
  }
  ['view', 'text', 'contrast'].forEach(k => {
    let s = null;
    try { s = localStorage.getItem('nido2.' + k); } catch (e) {}
    setPref(k, s || root.dataset[k] || DEFAULTS[k]);
  });

  /* --- Piezas -------------------------------------------------------------- */

  const sect = t => { const h = document.createElement('h2'); h.className = 'sect'; h.textContent = t; return h; };

  function cardList(items, onPick) {
    const ul = document.createElement('ul');
    ul.className = 'cards';
    items.forEach(it => {
      const li = document.createElement('li');
      li.innerHTML =
        `<button class="card">
           <span class="card__thumb" style="background-image:${it.bg}"></span>
           <span class="card__text"><span class="card__label">${it.label}</span><span class="card__meta">${it.meta}</span></span>
         </button>`;
      li.querySelector('button').addEventListener('click', () => onPick(it));
      ul.appendChild(li);
    });
    return ul;
  }

  function faceList(ul, people, onPick, addUnknown) {
    ul.innerHTML = '';
    people.forEach(p => {
      const li = document.createElement('li');
      li.innerHTML = `<button class="faces__btn"><span class="avatar">${p.ini}</span><span class="faces__name">${p.nombre}</span></button>`;
      li.querySelector('button').addEventListener('click', () => onPick(p));
      ul.appendChild(li);
    });
    if (addUnknown) {
      const li = document.createElement('li');
      li.innerHTML = `<button class="faces__btn"><span class="avatar avatar--new">${svg('i-user')}</span><span class="faces__name">¿Quién es?</span></button>`;
      li.querySelector('button').addEventListener('click', () => go('persona-nueva'));
      ul.appendChild(li);
    }
  }

  function photoList(ul, items, onPick) {
    ul.innerHTML = '';
    items.forEach(it => {
      const li = document.createElement('li');
      li.innerHTML = `<button class="photo__btn"><span class="photo__img" style="background-image:${it.bg}"></span><span class="photo__cap">${it.meta}</span></button>`;
      li.querySelector('button').addEventListener('click', () => onPick(it));
      ul.appendChild(li);
    });
  }

  /* --- Home: pestañas y secciones de la v1 --------------------------------- */

  let tab = 'fotos';
  function renderHome() {
    const b = $('#home-body');
    b.innerHTML = '';
    if (tab === 'albumes') {
      b.appendChild(sect('Todos tus álbumes'));
      b.appendChild(cardList(NIDO.albumes, openAlbum));
      return;
    }
    b.appendChild(sect('Hoy hace 2 años'));
    b.appendChild(cardList(NIDO.hoyHace2, openAlbum));
    b.appendChild(sect('Por grupos de personas'));
    b.appendChild(cardList(NIDO.grupos, openAlbum));
    b.appendChild(sect('Por persona'));
    const ul = document.createElement('ul');
    ul.className = 'faces';
    faceList(ul, NIDO.personas, openPersona, true);
    b.appendChild(ul);
  }

  /* --- "A mano" -------------------------------------------------------------
     El hallazgo detrás de esta pantalla: la gente hace capturas de pantalla
     para que una foto vuelva arriba del carrete. La captura no es una copia,
     es un marcador improvisado. Aquí hay un sitio de verdad para eso, siempre
     en el mismo lugar, y no hace falta buscar nada.
     ------------------------------------------------------------------------ */

  function renderMano() {
    const ul = $('#mano-list');
    ul.innerHTML = '';
    NIDO.aMano.forEach(d => {
      const li = document.createElement('li');
      li.innerHTML =
        `<button class="doc">
           <span class="doc__icon">${svg(d.icon)}</span>
           <span><span class="doc__label">${d.label}</span><span class="doc__meta">${d.meta}</span></span>
         </button>`;
      li.querySelector('button').addEventListener('click', () => openDoc(d));
      ul.appendChild(li);
    });
  }

  function openDoc(d) {
    $('#doc-title').textContent = d.label;
    $('#doc-name').textContent  = d.label;
    $('#doc-sheet').querySelector('use').setAttribute('href', '#' + d.icon);
    go('documento');
  }

  /* Cazar la captura de pantalla en el momento en que ocurre. Es "confirmar,
     no crear": la app ya ha detectado qué es, la persona solo dice sí o no. */
  function capturaDetectada() {
    dialog({
      icon: 'i-screenshot',
      text: 'Acabas de hacer una captura.<br>¿La quieres tener <strong>a mano</strong>?',
      extra: '<span class="contact"><span class="doc__icon">' + svg('i-bus') + '</span>' +
             '<span><span class="card__label">Parece un horario</span>' +
             '<span class="contact__num">Lo guardamos en A mano</span></span></span>',
      ok: 'Sí, guárdala', quiet: 'No, déjala en las fotos',
      onOk: () => { announce('Guardado en A mano'); go('a-mano'); }
    });
  }

  /* --- Álbum, foto, persona ------------------------------------------------ */

  function openAlbum(a) {
    $('#album-title').textContent = a.label;
    $('#album-meta').textContent  = a.meta;
    photoList($('#album-grid'), NIDO.delAlbum, f => openFoto(f, a.label));
    go('album');
  }

  let personaActual = NIDO.personas[0];

  function openPersona(p) {
    personaActual = p;
    $('#persona-av').textContent = p.ini;
    $('#persona-nom').textContent = p.nombre;
    $('#persona-rel').textContent = `${p.rel} · ${p.fotos} fotos`;
    photoList($('#persona-grid'), NIDO.dePersona, f => openFoto(f, p.nombre));
    go('persona');
  }

  function openFoto(f, titulo) {
    $('#foto-hero').style.backgroundImage = f.bg;
    $('#foto-title').textContent = titulo || f.meta;
    const enLaFoto = NIDO.personas.slice(0, 2);
    personaActual = enLaFoto[0];
    faceList($('#foto-faces'), enLaFoto, openPersona, true);
    $('#foto-share').innerHTML = svg('i-share') + 'Mandársela a ' + personaActual.nombre;
    go('foto');
  }

  $('#foto-mano').addEventListener('click', () => dialog({
    icon: 'i-mano',
    text: '¿Guardamos esta foto <strong>a mano</strong>?',
    ok: 'Sí, guardarla', quiet: 'Ahora no',
    onOk: () => { announce('Guardado en A mano'); go('a-mano'); }
  }));

  /* --- Compartir por WhatsApp ----------------------------------------------
     Lo que enseña el prototipo es lo que de verdad se puede construir:
     el nombre que la persona puso a la cara se busca en la agenda, y el
     contacto encontrado sale ARRIBA del selector del sistema. La app no
     manda la foto sola: la manda a través del selector, porque el enlace
     wa.me solo admite texto, no imágenes. Detalle en el README.
     ------------------------------------------------------------------------ */

  $('#foto-share').addEventListener('click', () => {
    const p = personaActual;
    if (!p.contacto) {
      return dialog({
        icon: 'i-share',
        text: `No encuentro a <strong>${p.nombre}</strong> en tu agenda.`,
        ok: 'Elegir yo a quién', quiet: 'Dejarlo'
      });
    }
    dialog({
      icon: 'i-share',
      text: `Se la mandamos a <strong>${p.nombre}</strong> por WhatsApp`,
      extra: `<span class="contact"><span class="avatar" style="width:56px;height:56px">${p.ini}</span>
                <span><span class="card__label">${p.contacto}</span><span class="contact__num">${p.tel}</span></span>
              </span>`,
      ok: 'Sí, mandársela', quiet: 'Elegir otra persona',
      onOk: () => dialog({ icon: 'i-check', text: `Foto mandada a ${p.nombre}`, ok: 'Vale' })
    });
  });

  /* --- Diálogo --------------------------------------------------------------- */

  const sheet = $('#sheet');
  let lastFocus = null;

  function dialog({ icon = 'i-check', text, extra = '', ok = 'Vale', quiet, onOk, onQuiet }) {
    lastFocus = document.activeElement;
    sheet.querySelector('.sheet__card').innerHTML =
      `<span class="sheet__icon">${svg(icon)}</span>
       <p class="sheet__text">${text}</p>
       ${extra}
       <button class="slab slab--accent" data-ok>${ok}</button>
       ${quiet ? `<button class="slab slab--quiet" data-quiet>${quiet}</button>` : ''}`;
    sheet.classList.add('is-open');
    const okB = sheet.querySelector('[data-ok]');
    okB.focus();
    okB.onclick = () => { closeDialog(); onOk && onOk(); };
    const q = sheet.querySelector('[data-quiet]');
    if (q) q.onclick = () => { closeDialog(); onQuiet && onQuiet(); };
    announce(text);
  }
  function closeDialog() { sheet.classList.remove('is-open'); if (lastFocus) lastFocus.focus(); }

  sheet.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = $$('button', sheet);
    e.preventDefault();
    f[(f.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  });

  const permisos = () => dialog({
    icon: 'i-photos',
    text: 'Danos acceso a tu galería y organizaremos tus momentos.',
    ok: 'Permitir', quiet: 'Quiero saber más',
    onQuiet: () => dialog({
      icon: 'i-photos',
      text: 'Las miramos aquí dentro, en tu teléfono, para agruparlas por momentos y por personas. No salen a ningún sitio.',
      ok: 'Entendido', onOk: permisos
    })
  });

  /* --- Teclado y código ------------------------------------------------------ */

  let digits = '';
  const paint = () => { $('#field').textContent = digits ? (digits.match(/.{1,3}/g) || []).join(' · ') : '612 · 345 · 678'; };
  ['1','2','3','4','5','6','7','8','9','','0','←'].forEach(k => {
    const b = document.createElement('button');
    b.textContent = k;
    if (!k) { b.className = 'k-empty'; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
    if (k === '←') b.setAttribute('aria-label', 'Borrar');
    b.addEventListener('click', () => {
      if (k === '←') digits = digits.slice(0, -1);
      else if (k && digits.length < 9) digits += k;
      paint();
    });
    $('#keypad').appendChild(b);
  });

  let timers = [];
  function autofill() {
    timers.forEach(clearTimeout); timers = [];
    const boxes = $$('#code span');
    boxes.forEach(b => { b.textContent = ''; b.classList.remove('is-filled'); });
    '6294'.split('').forEach((n, i) => timers.push(setTimeout(() => {
      boxes[i].textContent = n; boxes[i].classList.add('is-filled');
    }, 450 + i * 280)));
    timers.push(setTimeout(() => { $('#code-status').textContent = 'Listo. Ya está confirmado.'; announce('Código correcto'); }, 1800));
    timers.push(setTimeout(() => { if (current === 'codigo') go('perfil-foto', { replace: true }); }, 3000));
  }

  /* --- Voz -------------------------------------------------------------------- */

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function listen(kind, done) {
    const g = NIDO.guiones[kind] || ['…'];
    const fake = g[Math.floor(Math.random() * g.length)];
    if (!SR) return setTimeout(() => done(fake), 2000);
    try {
      const r = new SR(); r.lang = 'es-ES'; r.interimResults = false;
      let fired = false;
      const end = t => { if (!fired) { fired = true; done(t); } };
      r.onresult = e => end(e.results[0][0].transcript);
      r.onerror = () => end(fake);
      r.onend = () => end(fake);
      r.start();
      setTimeout(() => { try { r.stop(); } catch (e) {} }, 6000);
    } catch (e) { setTimeout(() => done(fake), 2000); }
  }

  function resolver(kind, texto) {
    if (kind === 'buscar') {
      $('#buscar-said').textContent = '«' + texto + '»';
      dialog({ icon: 'i-photos', text: `He encontrado fotos de<br><strong>${texto}</strong>`, ok: 'Verlas', quiet: 'Pedir otra cosa',
        onOk: () => openAlbum(NIDO.albumes[0]) });
    }
    if (kind === 'crear') {
      $('#crear-said').textContent = '«' + texto + '»';
      dialog({ icon: 'i-spark', text: `¿Preparo esto?<br><strong>${texto}</strong>`, ok: 'Sí, prepáralo', quiet: 'No, otra cosa',
        onOk: () => dialog({ icon: 'i-play', text: 'Listo. Te aviso cuando esté.', ok: 'Vale', onOk: () => go('home', { replace: true }) }) });
    }
    if (kind === 'persona-nueva') {
      dialog({ icon: 'i-family', text: `¿Guardo esta cara como<br><strong>${texto}</strong>?`, ok: 'Sí', quiet: 'No',
        onOk: () => openPersona(NIDO.personas[0]) });
    }
    if (kind === 'perfil-foto') $('#perfil-foto-said').textContent = '«' + texto + '»';
    if (kind === 'nombrar-album') { $('#album-title').textContent = texto; announce('Álbum renombrado: ' + texto); }
    if (kind === 'guardar-mano') {
      dialog({ icon: 'i-mano', text: `¿Guardo <strong>${texto}</strong> a mano?`, ok: 'Sí', quiet: 'No',
        onOk: () => announce('Guardado en A mano') });
    }
  }

  $$('[data-mic]').forEach(b => {
    const kind = b.dataset.mic, box = $('#mic-' + kind), said = $('#' + kind + '-said');
    b.addEventListener('click', () => {
      if (box.classList.contains('is-listening')) return;
      box.classList.add('is-listening');
      if (said) said.innerHTML = '<em>Escuchando…</em>';
      announce('Te escucho');
      listen(kind, t => { box.classList.remove('is-listening'); resolver(kind, t); });
    });
  });

  $$('[data-voz]').forEach(b => {
    const kind = b.dataset.voz, original = b.innerHTML;
    b.addEventListener('click', () => {
      b.innerHTML = svg('i-mic') + 'Te escucho…';
      announce('Te escucho');
      listen(kind, t => { b.innerHTML = original; resolver(kind, t); });
    });
  });

  /* --- Ver en grande ----------------------------------------------------------- */

  const visit = $('#visit');
  let vi = 0, idle = null, raf = null;
  const paintVisita = () => {
    const f = NIDO.delAlbum[vi];
    $('#visit-photo').style.backgroundImage = f.bg;
    $('#visit-title').textContent = `${f.label} · ${f.meta}`;
  };
  function wake() { visit.classList.remove('is-idle'); clearTimeout(idle); idle = setTimeout(() => visit.classList.add('is-idle'), 4500); }
  function startVisita() { vi = 0; paintVisita(); wake(); visit.focus(); announce('Ver en grande. Mantén pulsado el botón de abajo para salir.'); }
  function stopVisita() { clearTimeout(idle); cancelHold(); }

  visit.addEventListener('pointerdown', wake);
  visit.addEventListener('mousemove', wake);
  $('#visit-prev').addEventListener('click', () => { vi = (vi - 1 + NIDO.delAlbum.length) % NIDO.delAlbum.length; paintVisita(); wake(); });
  $('#visit-next').addEventListener('click', () => { vi = (vi + 1) % NIDO.delAlbum.length; paintVisita(); wake(); });

  const HOLD = 1200, exit = $('#visit-exit');
  function startHold() {
    cancelHold();
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(100, ((now - t0) / HOLD) * 100);
      exit.style.setProperty('--p', p);
      if (p >= 100) { cancelHold(); back(); } else raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function cancelHold() { if (raf) cancelAnimationFrame(raf); raf = null; exit.style.setProperty('--p', 0); }
  exit.addEventListener('pointerdown', e => { e.preventDefault(); startHold(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => exit.addEventListener(e, cancelHold));
  exit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); back(); } });

  /* --- Cableado ------------------------------------------------------------------ */

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-go],[data-back],[data-tab],[data-crear-video],[data-set-view],[data-set-text],[data-set-contrast],.chip');
    if (!el) return;

    if (el.dataset.setView)     return setPref('view', el.dataset.setView);
    if (el.dataset.setText)     return setPref('text', el.dataset.setText);
    if (el.dataset.setContrast) return setPref('contrast', el.dataset.setContrast);

    if (el.classList.contains('chip')) {
      const on = el.getAttribute('aria-pressed') === 'true';
      $$('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      el.setAttribute('aria-pressed', String(!on));
      if (!on) dialog({ icon: 'i-family', text: `¿Guardo esta cara como <strong>${el.textContent.trim().toLowerCase()}</strong>?`,
        ok: 'Sí, guardar', quiet: 'No', onOk: () => openPersona(NIDO.personas[0]) });
      return;
    }

    if (el.dataset.tab) {
      tab = el.dataset.tab;
      $$('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
      return renderHome();
    }

    if (el.dataset.crearVideo) {
      const qué = el.dataset.crearVideo === 'album' ? 'con las 9 fotos de este álbum' : 'con esta foto';
      return dialog({ icon: 'i-spark', text: `¿Hago un vídeo ${qué}?`, ok: 'Sí, hazlo', quiet: 'Ahora no',
        onOk: () => dialog({ icon: 'i-play', text: 'Listo. Te aviso cuando esté.', ok: 'Vale' }) });
    }

    if (el.dataset.back !== undefined) return back();

    if (el.dataset.go) {
      go(el.dataset.go);
      if (el.dataset.permisos !== undefined) setTimeout(permisos, 500);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (sheet.classList.contains('is-open')) closeDialog();
    else if (current !== 'home' && current !== 'bienvenida') back();
  });

  /* --- Índice de la demo ---------------------------------------------------------- */

  const list = $('#demo-list');
  SCREENS.forEach(s => {
    if (s.g) { const g = document.createElement('li'); g.className = 'demo__group'; g.textContent = s.g; list.appendChild(g); }
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.textContent = s.n; b.dataset.goto = s.id;
    b.addEventListener('click', () => {
      if (s.id === 'album')   return openAlbum(NIDO.albumes[0]);
      if (s.id === 'persona') return openPersona(NIDO.personas[0]);
      if (s.id === 'foto')    return openFoto(NIDO.delAlbum[0], 'Viaje a la playa 2023');
      go(s.id);
    });
    li.appendChild(b); list.appendChild(li);
  });

  /* --- Arranque -------------------------------------------------------------------- */

  renderHome();
  renderMano();
  $('#demo-captura').addEventListener('click', capturaDetectada);
  photoList($('#crear-grid'), NIDO.creaciones, () => {});
  faceList($('#buscar-faces'), NIDO.personas, openPersona);
  $('#nueva-hero').style.backgroundImage = NIDO.bg('cara sin nombre');
  paint();
  current = 'bienvenida';
})();
