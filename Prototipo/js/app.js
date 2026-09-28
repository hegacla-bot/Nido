// Nido · v3 — navegación del prototipo (sin framework, solo cambio de pantalla visible)
//
// Pensado para testar con personas mayores: cada toque da una confirmación
// visual (el botón se hunde un poco) y hay una pausa deliberada antes de que
// cambie la pantalla, para que a alguien le dé tiempo a entender qué ha
// tocado y hacia dónde le lleva la app — nunca un salto instantáneo.

(function () {
  const wrap = document.querySelector('.screen-canvas-wrap');
  const canvas = document.querySelector('.screen-canvas');

  function updateScale() {
    if (!wrap || !canvas) return;
    const scale = wrap.getBoundingClientRect().width / 393;
    canvas.style.setProperty('--canvas-scale', scale);
  }
  updateScale();
  window.addEventListener('resize', updateScale);

  const screens = document.querySelectorAll('.screen');
  document.querySelectorAll('.screen--onboarding video').forEach((v) => { v.autoplay = false; v.removeAttribute('autoplay'); v.pause(); });
  const PRESS_DELAY_MS = 280; // tiempo que se ve el botón "hundido" antes de reaccionar
  let isTransitioning = false;
  let cameFrom = 'home'; // pantalla a la que vuelve "detalle-foto"
  let detalleOnboardingSeen = false; // idem para la pantalla de detalle de foto/vídeo
  let yoOnboardingSeen = false; // el tour de Yo solo sale la primera vez (se reinicia al recargar)
  let personasOnboardingSeen = false; // idem para Personas (806:7232)
  const IDLE_MS = 20000; // sin tocar nada durante este rato, Nidi se asoma (ver ayudaInactividad)
  let idleTimer = null;
  let idlePantalla = null; // pantalla en la que ya se ofreció «Llevas un rato aquí»: no se repite hasta que se cambie de pantalla
  var galeriaPropia = false;   // la persona ha elegido sus propias fotos: la biblioteca de ejemplo ya no se carga
  var bibliotecaCargada = false;
  let albumesOnboardingSeen = false; // el tour de Álbumes solo sale la primera vez (se reinicia al recargar)
  let personaReturn = 'home'; // pantalla a la que vuelve "persona-fotos" (la que había antes de abrir el detalle)

  function currentScreen() {
    const active = document.querySelector('.screen.is-active');
    return active ? active.dataset.screen : 'home';
  }
  // Mientras Nidi (el asistente de voz) está en marcha no salen los tours de primera vez (Yo, Personas, detalle de foto; el de álbum
  // nuevo, en persona.js): Nidi acaba de abrir esa pantalla y de contarlo, y el tour la taparía pidiendo un toque que Nidi no conoce.
  // No se dan por vistos: salen la primera vez que la persona llegue ahí sola.
  const nidiHablando = () => !!(window.NidoAgente && window.NidoAgente.activa);

  // Dos pasos dentro de la misma capa: 1 Felicitación (765:5320), 2 Eliminar (765:5385).
  function showDetalleOnboardingStep(layer, step) {
    layer.dataset.step = String(step);
    layer.querySelectorAll('[data-detalle-step]').forEach((el) => {
      el.hidden = el.dataset.detalleStep !== String(step);
    });
    const visual = layer.querySelector('[data-detalle-step="' + step + '"] .onboarding-pollito__visual');
    if (visual) window.Mascota.enterOnboardingPollito(visual.closest('[data-detalle-step]'));
  }

  // Para que otros módulos (persona.js) puedan cambiar de pantalla sin pasar por un botón.
  window.NidoNav = { show: (name) => showScreen(name), current: () => currentScreen(), returnTo: (name) => { personaReturn = name; } };

  function closeDetalleOnboarding() {
    const layer = document.querySelector('[data-detalle-onboarding]');
    if (!layer) return;
    layer.classList.remove('is-visible');
    window.Mascota.exitOnboardingPollito(layer);
  }

  function showScreen(name) {
    requestAnimationFrame(() => document.querySelectorAll('.persona-fila__next').forEach(flechaFila)); // ya visible: se puede medir
    requestAnimationFrame(() => { if (window.NidoAbrazarBurbujas) window.NidoAbrazarBurbujas(); }); // burbujas «hug»
    if (name !== currentScreen()) idlePantalla = null; // pantalla nueva: puede volver a ofrecerse ayuda si se queda quieta
    idleArmar(); // cambiar de pantalla (también por voz) cuenta como actividad
    if (window.NidoAgente && window.NidoAgente.activa && window.NidoAgenteContexto) setTimeout(() => { window.NidoAgente.contexto(window.NidoAgenteContexto('Ahora')); agenteAvisoFicha(); agentePista(); }, 400);
    screens.forEach((screen) => {
      const willBeActive = screen.dataset.screen === name;
      const wasActive = screen.classList.contains('is-active');
      screen.classList.toggle('is-active', willBeActive);

      if (screen.classList.contains('screen--onboarding')) {
        // El tour enseña la Home y los Álbumes DE VERDAD (28-sep: salía la Home antigua con fotos de ejemplo): al entrar, se copian los
        // recuerdos y álbumes reales (sincronizarCopiasTour) y, si la biblioteca aún no está en pantalla, se carga ya.
        if (willBeActive && !wasActive) {
          if (window.NidoBiblioteca) window.NidoBiblioteca.cargar();
          sincronizarCopiasTour();
        }
        // Solo se reproduce el primer vídeo de la pantalla que se ve (un iPhone no aguanta varios a la vez).
        screen.querySelectorAll('video').forEach((v, i) => { if (willBeActive && i === 0) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); });
        if (willBeActive && !wasActive) window.Mascota.enterOnboardingPollito(screen);
        if (!willBeActive && wasActive) window.Mascota.exitOnboardingPollito(screen);
      }

      if (willBeActive && !wasActive && name === 'yo' && !yoOnboardingSeen && !nidiHablando()) {
        yoOnboardingSeen = true;
        const layer = screen.querySelector('[data-onboarding-layer]');
        layer.classList.add('is-visible');
        window.Mascota.enterOnboardingPollito(layer);
      }
      if (willBeActive && !wasActive && name === 'home' && window.NidoBiblioteca) window.NidoBiblioteca.cargar();
      if (!willBeActive && wasActive && screen.dataset.screen === 'album-seleccionar') setTimeout(dejarDeElegirDeRecuerdo, 0); // vuelve a enseñar todas
      if (willBeActive && !wasActive && screen.dataset.screen === 'detalle-foto') setTimeout(detalleVideoVisible, 0); // al volver: el recuerdo sigue
      if (!willBeActive && wasActive && screen.dataset.screen === 'detalle-foto') detalleMedia.querySelectorAll('.detail-media__item--recopilacion').forEach((it) => recopilacionMarcha(it, false)); // se para al salir
      if (willBeActive !== wasActive && screen.dataset.screen === 'home' && window.NidoRecuerdosVideo) setTimeout(window.NidoRecuerdosVideo, 0); // al entrar o salir de Home: vídeos de recuerdos en marcha o en pausa
      if (willBeActive && !wasActive && name === 'personas' && !personasOnboardingSeen && !nidiHablando()) {
        personasOnboardingSeen = true;
        const layer = screen.querySelector('[data-onboarding-layer]');
        layer.classList.add('is-visible');
        window.Mascota.enterOnboardingPollito(layer);
      }
      if (willBeActive && !wasActive) {
        if (screen.classList.contains('registro-2')) enterRegistroPhone(screen);
        if (screen.classList.contains('registro-3')) enterRegistroCode(screen);
        if (screen.classList.contains('registro-4')) enterRegistroSplash(screen);
        if (screen.classList.contains('registro-nidi')) enterRegistroNidi();
        if (name === 'bienvenida') enterEclosion();
        if (name === 'inicio') enterInicio();
      }
      if (!willBeActive && wasActive && screen.dataset.screen === 'bienvenida' && bienvenidaVideo) bienvenidaVideo.pause(); // al salir del huevo, no sigue sonando
      if (!willBeActive && wasActive && screen.classList.contains('registro-nidi')) {
        clearTimeout(registroNidiTimer);
      }
      if (!willBeActive && wasActive && screen.classList.contains('registro-4')) {
        clearTimeout(registroSplashTimer);
      }
      if (!willBeActive && wasActive && (screen.classList.contains('registro-2') || screen.classList.contains('registro-3'))) {
        clearRegistroAutofillTimers();
      }

      if (!willBeActive && wasActive && screen.dataset.screen === 'detalle-foto') {
        window.PersonaSelect.closeSelection();
        window.EliminarFoto.close();
        closeDetalleOnboarding();
      }
    });
  }

  // ---------------------------------------------------------------
  // Galería de la pantalla de detalle: todas las fotos de la pantalla
  // de origen, deslizable, arrancando en la que se ha tocado.
  // ---------------------------------------------------------------
  const detalleMedia = document.getElementById('detalle-foto-media');

  let detalleCards = []; // tarjetas de la pantalla de origen, en el mismo orden que la galería del detalle

  // Grupo de personas → pantalla «grupo-fotos» con todas las fotos en las que salen juntos (título con los nombres de pila).
  function abrirGrupo(tarjeta) {
    const scr = document.querySelector('[data-screen="grupo-fotos"]');
    const nombre = (tarjeta.querySelector('.persona-group__name') || {}).textContent || 'Juntos';
    // «Clara nieta y Ainhoa» → «Clara y Ainhoa»: el título cabe en una línea (el parentesco ya se ve en Personas).
    scr.querySelector('[data-grupo-nombre]').textContent = nombre.split(' y ').map((n) => (n === 'otra persona' ? n : n.split(' ')[0])).join(' y ');
    const grid = scr.querySelector('[data-grupo-grid]');
    grid.innerHTML = '';
    JSON.parse(tarjeta.dataset.grupoFotos).forEach((src) => {
      const c = document.createElement('div'); c.className = 'photo-card';
      const im = document.createElement('img'); im.src = src; im.alt = ''; c.appendChild(im);
      grid.appendChild(c);
    });
    grid.parentElement.scrollTop = 0;
    showScreen('grupo-fotos');
  }

  // lista (opcional): las tarjetas a enseñar, si no son las de la pantalla.
  function openDetalle(clickedCard, lista) {
    const originScreen = document.querySelector('.screen.is-active');
    const cards = lista || Array.from(originScreen.querySelectorAll('.photo-card'));
    detalleCards = cards.filter((c) => c.querySelector('img, video'));
    const startIndex = Math.max(0, cards.indexOf(clickedCard));

    detalleMedia.innerHTML = '';
    window.PersonaSelect.closeSelection();
    if (window.Reconocimiento) window.Reconocimiento.load().catch(() => {}); // baja los modelos mientras se ve la foto

    cards.forEach((card) => {
      const source = card.querySelector('img, video');
      if (!source) return;

      const item = document.createElement('div');
      item.className = 'detail-media__item';
      item.dataset.titulo = tituloDeDetalle(card, source); // lo que sale arriba en vez de «Detalle foto» (detalleTituloAlDia)
      // Recopilación de Mis recuerdos (28-sep): en grande también se mueve, como un vídeo (detalleVideoVisible la pone en marcha).
      const recop = card.querySelector('.recopilacion');
      if (recop) {
        const x = recop.cloneNode(true);
        x.classList.remove('en-marcha');
        x.querySelectorAll('img').forEach((im, n) => im.classList.toggle('is-activa', n === 0));
        item.classList.add('detail-media__item--recopilacion');
        item.appendChild(x);
        detalleMedia.appendChild(item);
        return;
      }
      const clone = source.cloneNode(true);
      clone.removeAttribute('id');
      if (clone.tagName === 'VIDEO') {
        // Aquí un vídeo se ve como una foto que se mueve sola, en bucle, sin botón de play — como un
        // GIF (pedido el 24-sep). Solo se reproduce el que se está viendo (ver detalleVideoVisible),
        // nunca todos a la vez: un iPhone no aguanta una docena de vídeos activos al mismo tiempo
        // (ya visto antes, "ha generado problemas repetidamente" — mismo motivo por el que la
        // rejilla tampoco los reproduce todos solos).
        clone.loop = true; clone.muted = true; clone.playsInline = true; clone.setAttribute('playsinline', '');
        clone.removeAttribute('autoplay');
      }
      item.appendChild(clone);
      detalleMedia.appendChild(item);

      // Papeles de Mis documentos (28-sep): enteros, sin recortar (un horario o un DNI cortado no sirve). Sin buscar caras en ellos.
      if (card.closest('[data-screen="mis-documentos"]')) { item.classList.add('detail-media__item--documento'); return; }
      if (clone.tagName === 'IMG') window.PersonaSelect.buildHotspots(item, clone);
    });

    // Arranca ya en la foto tocada, sin animación de scroll de por medio.
    detalleMedia.scrollLeft = startIndex * detalleMedia.clientWidth;
    detalleVideoVisible();

    // Primera vez que se abre una foto: onboarding de la pantalla (765:5320).
    if (!detalleOnboardingSeen && !nidiHablando()) {
      detalleOnboardingSeen = true;
      const layer = document.querySelector('[data-detalle-onboarding]');
      showDetalleOnboardingStep(layer, 1);
      layer.classList.add('is-visible');
    }
  }

  // Reproduce en bucle SOLO el vídeo que se está viendo ahora mismo (como un GIF: sin botón de
  // play, siempre en movimiento) y pausa+rebobina los demás — al deslizar entre fotos se actualiza solo.
  let detalleVideoTimer = null;
  function detalleVideoVisible() {
    const i = Math.round(detalleMedia.scrollLeft / detalleMedia.clientWidth);
    if (window.PersonaCompartir) setTimeout(window.PersonaCompartir.preparar, 0); // «Compartir» listo para abrir el menú al tocar
    detalleMedia.querySelectorAll('.detail-media__item').forEach((item, idx) => {
      const v = item.querySelector('video');
      if (v) { if (idx === i) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else { v.pause(); v.currentTime = 0; } }
      if (item.querySelector('.recopilacion')) recopilacionMarcha(item, idx === i);
    });
  }
  // Título de Detalle foto (28-sep): «Detalle foto» no le dice nada a quien la ve. Ahora, lo que es: la fecha corta de la foto
  // («21 sept. 2026»), el nombre del recuerdo («Venecia, enero de 2026»), el del papel de Mis documentos («DNI»)… Siempre en
  // UNA línea en el hueco del título (hasta el pollito): si no cabe se prueba una versión corta y, si tampoco, «Tu foto».
  const MESES_CORTOS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'];
  const fechaCorta = (d) => d.getDate() + ' ' + MESES_CORTOS[d.getMonth()] + ' ' + d.getFullYear();
  // «Venecia, enero de 2026» → «Venecia, ene. 2026»; «Navidad de 2025» → «Navidad 2025».
  const acortarTitulo = (t) => t.replace(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gi, (m) => MESES_CORTOS[MESES.indexOf(m.toLowerCase())])
    .replace(/ de (\d{4})\b/g, ' $1').replace(/(\d) de ([a-z]{3,4}\.)/g, '$1 $2');
  function tituloDeDetalle(card, source) {
    const video = source.tagName === 'VIDEO' || !!card.querySelector('.recopilacion');
    const reserva = card.querySelector('.recopilacion') ? 'Tu recuerdo' : video ? 'Tu vídeo' : 'Tu foto';
    const rotulo = card.querySelector('.photo-card__caption span');
    if (rotulo && rotulo.textContent.trim()) return rotulo.textContent.trim() + '|' + reserva; // recuerdos de Inicio
    if (card.closest('[data-screen="mis-documentos"]') && source.alt) return source.alt + '|' + reserva;
    const src = (source.currentSrc || source.src || '').split('#')[0];
    const it = window.NidoGaleria && window.NidoGaleria.items.find((x) => (x.src || '').split('#')[0] === src);
    const d = it && it.date instanceof Date && !isNaN(it.date) ? it.date : null;
    return (d ? fechaCorta(d) : reserva) + '|' + reserva;
  }
  const detalleTitulo = document.querySelector('[data-screen="detalle-foto"] .page-title');
  function detalleTituloAlDia(item) {
    if (!item || !item.dataset.titulo) return;
    const [largo, reserva] = item.dataset.titulo.split('|');
    const avatar = document.querySelector('[data-screen="detalle-foto"] .avatar');
    const hueco = avatar.offsetLeft - detalleTitulo.offsetLeft - 12; // 12px de aire hasta el pollito
    for (const t of [largo, acortarTitulo(largo), reserva]) {
      detalleTitulo.textContent = t;
      if (detalleTitulo.scrollWidth <= hueco) return;
    }
  }

  // Flechas anterior / siguiente y «3 de 9» (28-sep). Se ponen al día al abrir, al deslizar y si cambia la galería (eliminar).
  const detalleNav = document.querySelector('[data-detalle-nav]');
  function detalleNavAlDia() {
    const n = detalleMedia.querySelectorAll('.detail-media__item').length;
    const i = Math.min(n - 1, Math.max(0, Math.round(detalleMedia.scrollLeft / (detalleMedia.clientWidth || 1))));
    detalleNav.hidden = n < 2;
    detalleNav.querySelector('[data-detalle-prev]').hidden = i <= 0;
    detalleNav.querySelector('[data-detalle-next]').hidden = i >= n - 1;
    detalleNav.querySelector('[data-detalle-cuenta]').textContent = (i + 1) + ' de ' + n;
    detalleTituloAlDia(detalleMedia.querySelectorAll('.detail-media__item')[i]);
  }
  function detallePasar(paso) {
    const n = detalleMedia.querySelectorAll('.detail-media__item').length;
    const w = detalleMedia.clientWidth;
    const i = Math.min(n - 1, Math.max(0, Math.round(detalleMedia.scrollLeft / w) + paso));
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    detalleMedia.scrollTo({ left: i * w, behavior: suave ? 'smooth' : 'auto' });
  }
  detalleNav.addEventListener('click', (event) => {
    if (event.target.closest('[data-detalle-prev]')) detallePasar(-1);
    else if (event.target.closest('[data-detalle-next]')) detallePasar(1);
  });
  new MutationObserver(detalleNavAlDia).observe(detalleMedia, { childList: true });
  detalleMedia.addEventListener('scroll', () => {
    detalleNavAlDia();
    clearTimeout(detalleVideoTimer);
    detalleVideoTimer = setTimeout(detalleVideoVisible, 120);
  }, { passive: true });

  // ---------------------------------------------------------------
  // Pinch-to-zoom sobre la foto de la pantalla de detalle: separar dos
  // dedos amplía la imagen tocada; al soltar, vuelve a su tamaño normal.
  // Un solo dedo se deja para el navegador (desliza entre fotos).
  // ---------------------------------------------------------------
  const activePointers = new Map();
  let pinchStartDist = null;
  let pinchImg = null;

  function pointerDist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  detalleMedia.addEventListener('pointerdown', (event) => {
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size === 2) {
      const [p1, p2] = Array.from(activePointers.values());
      pinchStartDist = pointerDist(p1, p2);
      const item = event.target.closest('.detail-media__item');
      pinchImg = item ? item.querySelector('img, video') : null;
    }
  });

  detalleMedia.addEventListener('pointermove', (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size === 2 && pinchStartDist && pinchImg) {
      const [p1, p2] = Array.from(activePointers.values());
      const scale = Math.min(2.5, Math.max(1, pointerDist(p1, p2) / pinchStartDist));
      pinchImg.style.transition = 'none';
      pinchImg.style.transform = `scale(${scale})`;
    }
  });

  function releasePinch(event) {
    activePointers.delete(event.pointerId);
    if (activePointers.size < 2 && pinchImg) {
      pinchImg.style.transition = 'transform 0.25s ease';
      pinchImg.style.transform = 'scale(1)';
      pinchImg = null;
      pinchStartDist = null;
    }
  }
  detalleMedia.addEventListener('pointerup', releasePinch);
  detalleMedia.addEventListener('pointercancel', releasePinch);
  detalleMedia.addEventListener('pointerleave', releasePinch);

  // ---------------------------------------------------------------
  // Vídeo con respaldo: si el navegador no deja reproducirlo solo (modo de bajo consumo del iPhone, ahorro de datos...), se enseña la
  // misma animación como imagen animada, que sí se mueve, y se avanza igual al terminar. Nunca se queda parado en la primera imagen.
  // ---------------------------------------------------------------
  // Devuelve «empezar()»: se llama al ENTRAR en la pantalla del vídeo (28-sep: el huevo ya no es lo primero, va tras el registro).
  function videoConRespaldo(video, opts) {
    let sonando = false, respaldo = false, img = null, vez = 0;
    video.muted = true; video.setAttribute('muted', ''); video.playsInline = true;
    video.addEventListener('playing', () => { sonando = true; });
    const pon = () => {
      if (sonando || respaldo || !opts.activa()) return;
      const p = video.play();
      if (p && p.then) p.then(() => { sonando = true; }).catch(() => {});
    };
    ['loadeddata', 'canplay'].forEach((ev) => video.addEventListener(ev, pon));
    window.addEventListener('pageshow', pon);
    ['touchstart', 'pointerdown', 'click'].forEach((ev) => document.addEventListener(ev, pon, { passive: true }));
    return function empezar() {
      const esta = ++vez; // si se vuelve a entrar, los temporizadores de la vez anterior ya no cuentan
      sonando = false; respaldo = false;
      if (img) { img.remove(); img = null; video.style.display = ''; }
      try { video.currentTime = 0; } catch (e) { /* aún sin datos */ }
      pon();
      setTimeout(pon, 300);
      setTimeout(() => {
        if (esta !== vez || sonando || !opts.activa()) return;
        respaldo = true;
        img = document.createElement('img');
        img.className = video.className;
        img.alt = '';
        img.src = opts.animacion + '?t=' + Date.now(); // el parámetro hace que empiece de cero
        video.style.display = 'none';
        video.after(img);
        setTimeout(() => { if (esta === vez && opts.activa()) opts.fin(img); }, opts.ms);
      }, 1200);
    };
  }

  // ---------------------------------------------------------------
  // Bienvenida: el vídeo del pollito naciendo se ve una sola vez, sin botón
  // — al terminar, pasa sola al registro.
  // ---------------------------------------------------------------
  const bienvenidaVideo = document.querySelector('[data-bienvenida-video]');
  let empezarBienvenida = null;
  if (bienvenidaVideo) {
    // Solo si sigue en bienvenida: con un deep-link (#pantalla) el vídeo se reproduce
    // igualmente por debajo y, al acabar, arrastraba a otra pantalla (bug de la sesión 3).
    const enBienvenida = () => document.querySelector('.screen.is-active')?.dataset.screen === 'bienvenida';
    // Antes pasaba por "pre-registro" (otro pollito, tirando fotos, de puro trámite) — quitado
    // el 24-sep: de la bienvenida se pasa directo al registro.
    // registro-1 ("Revive tus momentos...", valor+Entrar) se quitó del todo el 24-sep: de la
    // bienvenida se pasa ahora directo a registro-2 (antes ya se había quitado pre-registro igual).
    // Al terminar, el pollito del huevo se desvanece sobre el blanco y LUEGO aparece el saludo (28-sep): fundir los dos a la vez
    // dejaba dos pollitos superpuestos (el del huevo, más pequeño, asomando detrás del que saluda).
    const bienvenidaScreen = bienvenidaVideo.closest('.screen');
    const salirDelHuevo = () => {
      if (!enBienvenida() || bienvenidaScreen.classList.contains('is-saliendo')) return;
      bienvenidaScreen.classList.add('is-saliendo');
      setTimeout(() => { if (enBienvenida()) showScreen('registro-nidi'); }, 450);
    };
    bienvenidaVideo.addEventListener('ended', salirDelHuevo);
    empezarBienvenida = videoConRespaldo(bienvenidaVideo, { activa: enBienvenida, animacion: 'assets/video/pollito-huevo.webp', ms: 5300, fin: salirDelHuevo });
    if (enBienvenida()) empezarBienvenida(); // enlace directo (#bienvenida)
  }

  // Inicio (28-sep): el logo 1,8 s (o un toque, data-nav) y a la presentación.
  const INICIO_MS = 1800;
  let inicioTimer = null;
  function enterInicio() {
    clearTimeout(inicioTimer);
    inicioTimer = setTimeout(() => { if (currentScreen() === 'inicio') showScreen('intro-1'); }, INICIO_MS);
  }
  if (currentScreen() === 'inicio') enterInicio();

  // ---------------------------------------------------------------
  // Flujo de registro: teléfono (registro-2) y código (registro-3) usan
  // el mismo teclado numérico en pantalla por si alguien quiere tocar o
  // corregir, pero para testear el prototipo se autorrellenan solos,
  // dígito a dígito con temporizadores escalonados — el mismo patrón que
  // ya usaban prototipo/js/app.js y prototipo-v2/js/app.js (función
  // "autofill") para imitar el autocompletado nativo de SMS de iOS/
  // Android: nunca aparecen ya escritos de golpe. Al completar el código
  // aparece el modal "Ayúdanos"; al aceptarlo pasa al splash del logo,
  // que avanza solo a Home tras una pausa.
  // ---------------------------------------------------------------
  const REGISTRO_PHONE_MAX = 9; // longitud típica de un móvil español
  const REGISTRO_CODE_LEN = 4;
  const REGISTRO_DEMO_PHONE = '612345678';
  const REGISTRO_DEMO_CODE = '6294'; // mismo código de ejemplo que las versiones anteriores
  let registroPhone = '';
  let registroCode = '';
  let registroSplashTimer = null;
  let registroNidiTimer = null;
  const REGISTRO_NIDI_MS = 4500; // el saludo de Nidi no tiene botón: pasa solo a los 4,5 s (28-sep: antes 3,5) o al tocar la pantalla
  let registroAutofillTimers = [];

  function clearRegistroAutofillTimers() {
    registroAutofillTimers.forEach(clearTimeout);
    registroAutofillTimers = [];
  }

  function enterRegistroPhone(screen) {
    registroPhone = '';
    renderRegistroPhone(screen);
    clearRegistroAutofillTimers();
    REGISTRO_DEMO_PHONE.split('').forEach((digit, i) => {
      registroAutofillTimers.push(setTimeout(() => {
        registroPhone += digit;
        renderRegistroPhone(screen);
      }, 300 + i * 90));
    });
  }

  function renderRegistroPhone(screen) {
    const display = screen.querySelector('[data-registro-phone-display]');
    if (display) display.textContent = registroPhone;
  }

  function enterRegistroCode(screen) {
    registroCode = '';
    renderRegistroCode(screen);
    const modal = screen.querySelector('[data-registro-modal]');
    if (modal) modal.classList.remove('is-visible');
    registroModalPaso(screen, false); // siempre empieza por «Ayúdanos»

    clearRegistroAutofillTimers();
    REGISTRO_DEMO_CODE.split('').forEach((digit, i) => {
      registroAutofillTimers.push(setTimeout(() => {
        registroCode += digit;
        renderRegistroCode(screen);
        if (registroCode.length === REGISTRO_CODE_LEN) scheduleModalReveal(screen);
      }, 450 + i * 280)); // mismo ritmo que prototipo-v2 (450ms + 280ms/dígito)
    });
  }

  function renderRegistroCode(screen) {
    const boxes = screen.querySelectorAll('[data-code-box]');
    boxes.forEach((box, i) => {
      box.textContent = registroCode[i] || '';
    });
  }

  function showAjustesToast(msg) {
    const host = document.querySelector('[data-screen="ajustes"]');
    let t = host.querySelector('.share-toast');
    if (!t) { t = document.createElement('div'); t.className = 'share-toast'; host.appendChild(t); }
    t.textContent = msg;
    t.classList.add('is-visible');
    setTimeout(() => t.classList.remove('is-visible'), 3500);
  }

  function scheduleModalReveal(screen) {
    if (screen.dataset.screen === 'ajustes-codigo') {
      // Cambiar teléfono (746:3365): al completar el código no hay modal; se da por confirmado, vuelve a Ajustes y avisa.
      setTimeout(() => { if (registroCode.length === REGISTRO_CODE_LEN && currentScreen() === 'ajustes-codigo') { showScreen('ajustes'); showAjustesToast('Teléfono guardado'); } }, 900);
      return;
    }
    const modal = screen.querySelector('[data-registro-modal]');
    setTimeout(() => {
      // Si en este tiempo se ha borrado algún dígito, no salta el modal.
      if (modal && registroCode.length === REGISTRO_CODE_LEN) modal.classList.add('is-visible');
    }, 450);
  }

  function enterRegistroNidi() {
    clearTimeout(registroNidiTimer);
    registroNidiTimer = setTimeout(() => { if (currentScreen() === 'registro-nidi') showScreen('onboarding-1'); }, REGISTRO_NIDI_MS); // y empieza el tour de Inicio (28-sep: el saludo va ahora tras el registro)
  }

  // Pantalla de carga (registro-4). «Permitir» abre el selector de fotos del sistema y a la vez entra aquí: la carga espera a que
  // se cierre (change o cancel) para que el aviso «Sin problema…» salga en esta pantalla y no encima del tour. Tope por si el
  // navegador no avisa del cierre (Safari antiguo) o la persona tarda mucho eligiendo.
  const REGISTRO_SPLASH_MS = 1800;       // sin selector, como siempre
  const REGISTRO_SPLASH_AVISO_MS = 4000; // con aviso: el tiempo de leerlo
  const REGISTRO_SPLASH_TOPE_MS = 12000;
  let galeriaAbierta = false; // el selector de fotos del sistema está abierto
  let splashDesde = 0;
  function splashSiguiente() { if (currentScreen() === 'registro-4') showScreen('bienvenida'); } // 28-sep: nace el pollito, saluda y luego el tour
  function enterRegistroSplash(screen) {
    clearTimeout(registroSplashTimer);
    splashDesde = Date.now();
    // Tras el loader arranca el tour de onboarding (rediseño de la sesión 5).
    registroSplashTimer = setTimeout(splashSiguiente, galeriaAbierta ? REGISTRO_SPLASH_TOPE_MS : REGISTRO_SPLASH_MS);
  }
  // La eclosión (bienvenida) hace ahora de pantalla de carga (28-sep). Si «Permitir» ha abierto la galería, el huevo espera quieto
  // (se ve su primera imagen) a que se cierre, y entonces nace; tope por si el navegador no avisa del cierre.
  let eclosionTimer = null;
  function enterEclosion() {
    clearTimeout(eclosionTimer);
    bienvenidaVideo.closest('.screen').classList.remove('is-saliendo');
    if (!empezarBienvenida) return;
    if (!galeriaAbierta) { empezarBienvenida(); return; }
    bienvenidaVideo.pause();
    try { bienvenidaVideo.currentTime = 0; } catch (e) { /* aún sin datos */ }
    eclosionTimer = setTimeout(() => { if (currentScreen() === 'bienvenida') empezarBienvenida(); }, REGISTRO_SPLASH_TOPE_MS);
  }
  // El selector se ha cerrado. Devuelve true si estábamos en la pantalla de carga o en la eclosión (ya se ha ocupado de todo).
  function splashSelectorCerrado(cancelado) {
    galeriaAbierta = false;
    if (currentScreen() === 'bienvenida') {
      clearTimeout(eclosionTimer);
      if (cancelado) nidoToast('bienvenida', AVISO_GALERIA, null, null, REGISTRO_SPLASH_AVISO_MS - 300);
      if (empezarBienvenida && bienvenidaVideo.paused) empezarBienvenida();
      return true;
    }
    if (currentScreen() !== 'registro-4') return false;
    clearTimeout(registroSplashTimer);
    if (cancelado) {
      nidoToast('registro-4', AVISO_GALERIA, null, null, REGISTRO_SPLASH_AVISO_MS - 300);
      registroSplashTimer = setTimeout(splashSiguiente, REGISTRO_SPLASH_AVISO_MS);
    } else {
      registroSplashTimer = setTimeout(splashSiguiente, Math.max(0, REGISTRO_SPLASH_MS - (Date.now() - splashDesde)));
    }
    return true;
  }

  document.addEventListener('click', (event) => {
    const key = event.target.closest('.registro-key');
    if (!key) return;
    const screen = key.closest('.screen');
    const digit = key.dataset.key;

    if (screen.classList.contains('registro-2')) {
      if (digit === 'backspace') {
        registroPhone = registroPhone.slice(0, -1);
      } else if (registroPhone.length < REGISTRO_PHONE_MAX) {
        registroPhone += digit;
      }
      renderRegistroPhone(screen);
      return;
    }

    if (screen.classList.contains('registro-3')) {
      if (digit === 'backspace') {
        registroCode = registroCode.slice(0, -1);
        renderRegistroCode(screen);
        return;
      }
      if (registroCode.length < REGISTRO_CODE_LEN) {
        registroCode += digit;
        renderRegistroCode(screen);
        if (registroCode.length === REGISTRO_CODE_LEN) {
          scheduleModalReveal(screen); // pausa para ver el 4º dígito antes de que salte el modal
        }
      }
    }
  });

  // «Quiero saber más» cambia «Ayúdanos» por la explicación de para qué es el acceso (919:2723), dentro del mismo velo.
  function registroModalPaso(screen, mas) {
    const ayuda = screen.querySelector('[data-registro-modal-ayuda]');
    const info = screen.querySelector('[data-registro-modal-mas]');
    if (ayuda) ayuda.hidden = mas;
    if (info) info.hidden = !mas;
  }
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-registro-saber-mas]')) return;
    registroModalPaso(event.target.closest('.screen'), true);
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-registro-resend]')) return;
    const screen = event.target.closest('.screen');
    registroCode = '';
    renderRegistroCode(screen);
    const modal = screen.querySelector('[data-registro-modal]');
    if (modal) modal.classList.remove('is-visible');
    registroModalPaso(screen, false);
  });

  // Botones flotantes del carrusel de "Mis recuerdos" (Home, rediseño
  // 594:7786 / 594:7813): avanzan/retroceden una tarjeta (300px + 18px de
  // gap), con scroll-snap haciendo el resto. El de "atrás" solo se ve
  // cuando el carrusel ya no está al principio (594:7813 lo muestra
  // porque ahí la 2ª tarjeta está centrada; 594:7786, al principio, no lo
  // tiene).
  document.addEventListener('click', (event) => {
    const next = event.target.closest('[data-carousel-next]');
    const prev = event.target.closest('[data-carousel-prev]');
    if (!next && !prev) return;
    const screen = event.target.closest('.screen');
    // En Persona hay dos carruseles (Imágenes / Vídeos): cada flecha avanza el suyo.
    const target = (next || prev).dataset.carouselTarget;
    const carousel = screen.querySelector(target ? '[data-carousel="' + target + '"]' : '[data-carousel]');
    if (!carousel) return;
    const cardWidth = carousel.querySelector('.photo-card')?.offsetWidth || 0;
    const gap = parseFloat(getComputedStyle(carousel).columnGap) || 18; // 18px en Home, 9,6px en Personas
    const step = cardWidth + gap;

    if (next) {
      const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 4;
      carousel.scrollTo({ left: atEnd ? 0 : carousel.scrollLeft + step, behavior: 'smooth' });
    } else {
      carousel.scrollTo({ left: Math.max(0, carousel.scrollLeft - step), behavior: 'smooth' });
    }
  });

  // Flechas dentro de su fila (ficha de persona, 25-sep): se ocultan si no hay nada más que ver (sin vídeos, o todo cabe) y, al llegar
  // al final, giran hacia atrás, porque tocarlas entonces vuelve al principio.
  function flechaFila(btn) {
    const screen = btn.closest('.screen');
    const carousel = screen && screen.querySelector('[data-carousel="' + btn.dataset.carouselTarget + '"]');
    if (!carousel) return;
    btn.hidden = !carousel.querySelector('.photo-card') || carousel.scrollWidth <= carousel.clientWidth + 4;
    btn.classList.toggle('is-al-final', carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 4);
  }
  document.querySelectorAll('.persona-fila__next').forEach((btn) => {
    const carousel = btn.closest('.screen').querySelector('[data-carousel="' + btn.dataset.carouselTarget + '"]');
    if (!carousel) return;
    const pintar = () => flechaFila(btn);
    carousel.addEventListener('scroll', pintar, { passive: true });
    new MutationObserver(() => requestAnimationFrame(pintar)).observe(carousel, { childList: true, subtree: true }); // se rellena al abrir cada ficha
    window.addEventListener('resize', pintar);
    carousel.addEventListener('load', pintar, true); // las fotos llegan después y cambian el ancho
  });

  // Mostrar/ocultar el botón "atrás" según la posición de scroll del carrusel.
  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const screen = carousel.closest('.screen');
    const prevBtn = screen.querySelector('[data-carousel-prev]');
    if (!prevBtn) return;
    carousel.addEventListener('scroll', () => {
      prevBtn.hidden = carousel.scrollLeft < 4;
    });
  });

  // Botón flotante "bajar / volver arriba" de listas verticales largas
  // (675:2293, "Álbum (scroll)"): un solo botón que alterna icono y acción
  // según haya scroll o no, en vez de dos botones fijos como en el
  // carrusel horizontal de Home.
  document.querySelectorAll('[data-scroll-toggle]').forEach((toggleBtn) => {
    const screen = toggleBtn.closest('.screen');
    const content = screen.querySelector('.screen-content');
    if (!content) return;
    const icon = toggleBtn.querySelector('img');

    function updateState() {
      // Sin nada que desplazar (p. ej. «¿Con qué foto?» con las 6 de un recuerdo) la flecha sobra (28-sep).
      // (el contenido lleva 220px de aire abajo para que la flecha no tape fotos: si solo sobra eso, no hay nada más que ver)
      toggleBtn.hidden = content.scrollHeight - content.clientHeight < 140;
      const scrolled = content.scrollTop > 4;
      icon.src = scrolled
        ? 'assets/icons/icon-arrow-narrow-up-blue.svg'
        : 'assets/icons/icon-arrow-narrow-down-blue.svg';
      toggleBtn.setAttribute('aria-label', scrolled ? 'Volver arriba' : 'Bajar');
    }
    content.addEventListener('scroll', updateState);
    if ('ResizeObserver' in window) new ResizeObserver(() => updateState()).observe(content);
    new MutationObserver(() => requestAnimationFrame(updateState)).observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    toggleBtn.addEventListener('click', () => {
      const scrolled = content.scrollTop > 4;
      content.scrollTo({ top: scrolled ? 0 : content.scrollTop + content.clientHeight * 0.8, behavior: 'smooth' });
    });
  });

  // .top-fade (blur del header) solo debe verse una vez que el usuario ha
  // hecho scroll — confirmado con el frame de Figma "02.1.1b_Álbum" (estado
  // de reposo, sin "(scroll)"): ahí la fila 0 sale totalmente nítida, sin
  // blur. El frame "... (scroll)" con blur fuerte es un estado aparte, no
  // la misma capa vista de otra forma. Mismo umbral de 4px que el botón
  // flotante de arriba, para que ambos cambien en el mismo instante.
  document.querySelectorAll('.screen').forEach((screen) => {
    const fade = screen.querySelector('.top-fade');
    const content = screen.querySelector('.screen-content');
    if (!fade || !content) return;
    content.addEventListener('scroll', () => {
      fade.classList.toggle('is-visible', content.scrollTop > 4);
    });
  });

  // Seleccionar fotos para añadir a un álbum (685:8075, "Elige las fotos a añadir"): un toque marca/desmarca
  // (antes era mantener pulsado y un toque abría el detalle; en una pantalla cuyo único fin es elegir, tocar
  // tiene que elegir). Captura, para llegar antes que el manejador genérico que abre el detalle.
  // El botón dice cuántas hay marcadas («Añadir 3», 25-sep): así se sabe lo que va a pasar antes de pulsarlo.
  function contarSeleccion() {
    const n = document.querySelectorAll('[data-select-grid] .is-selected').length;
    const felic = selectTarget === 'felicitacion';
    // Eligiendo la foto de una felicitación: «Continuar», y solo cuando ya hay una elegida (como en la pantalla de estilos).
    document.querySelectorAll('[data-select-add]').forEach((b) => { b.hidden = felic && !n; });
    document.querySelectorAll('[data-select-add-label]').forEach((el) => {
      const texto = felic ? 'Continuar' : n ? 'Añadir ' + n : 'Añadir';
      if (el.textContent === texto) return;
      el.textContent = texto;
      el.classList.remove('is-salto');
      void el.offsetWidth; // reinicia la animación aunque el número cambie muy seguido
      if (n && !felic) el.classList.add('is-salto');
    });
  }
  document.querySelectorAll('[data-select-grid]').forEach((grid) => {
    grid.addEventListener('click', (event) => {
      const cell = event.target.closest('.photo-card');
      if (!cell) return;
      event.stopImmediatePropagation();
      event.preventDefault();
      if (selectTarget === 'felicitacion') grid.querySelectorAll('.is-selected').forEach((c) => { if (c !== cell) c.classList.remove('is-selected'); }); // una sola
      cell.classList.toggle('is-selected');
      contarSeleccion();
    }, true);
  });

  // ---------------------------------------------------------------
  // Álbumes creados por la persona: cada uno tiene su nombre, sus fotos y su tarjeta en "Mis álbumes";
  // una sola pantalla (`album-nuevo`, 746:3458) se rellena con el que se abra. Crear otro álbum añade uno
  // más, nunca sustituye a los anteriores.
  // ---------------------------------------------------------------
  const NidoAlbums = { list: [], current: null, seq: 0 };
  window.NidoAlbums = NidoAlbums;
  // Portada de cada vídeo de la galería por su dirección: los álbumes guardan solo {src, tag} y, sin portada, Safari dejaba la
  // tarjeta del vídeo gris hasta abrirlo (28-sep). La rellena galleryMedia.
  const posterDeVideo = new Map();

  const albumesLists = () => document.querySelectorAll('[data-screen="albumes"] .albumes-list');

  function albumSync(album) {
    const n = album.photos.length;
    albumesLists().forEach((list) => {
      const stack = list.querySelector('[data-album-id="' + album.id + '"]');
      if (!stack) return;
      stack.querySelector('.album-stack__meta').textContent = n + (n === 1 ? ' foto' : ' fotos');
      const fotos = album.photos.filter((p) => p.tag === 'IMG'); // nunca un vídeo: no se puede pintar como imagen
      if (fotos[0]) stack.querySelector('.album-stack__front > img').src = fotos[0].src; // portada = 1ª foto
      albumStackTrasera(stack, fotos[1]);
    });
  }

  // La carta girada de detrás enseña la 2.ª foto del álbum. Con una sola foto (o ninguna) no hay carta
  // de detrás: una pila con la misma foto repetida, o con una foto de relleno, diría algo que no es verdad.
  function albumStackTrasera(stack, foto) {
    stack.classList.toggle('album-stack--single', !foto);
    if (foto) stack.querySelector('.album-stack__back img').src = foto.src;
  }

  function albumRender() {
    const album = NidoAlbums.current;
    if (!album) return;
    const screen = document.querySelector('[data-screen="album-nuevo"]');
    screen.querySelector('[data-album-title]').textContent = album.name;
    screen.querySelector('[data-album-vacio]').hidden = album.photos.length > 0; // estado vacío (979:2967)
    const grid = screen.querySelector('.album-grid');
    // "Añadir" está en todos los álbumes menos en "Todas tus fotos" (esa es la galería del teléfono y se llena sola).
    const add = grid.querySelector(':scope > .album-grid__add-wrap');
    if (add) add.style.display = '';
    grid.querySelectorAll(':scope > .photo-card').forEach((c) => c.remove());
    album.photos.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      const el = document.createElement(p.tag);
      el.src = p.src;
      if (p.tag === 'VIDEO') {
        el.muted = true; el.playsInline = true; el.setAttribute('playsinline', '');
        // Con la portada de la galería (o, si no tiene, pidiendo el primer fotograma con #t) se ve desde el principio, como en
        // «Todas tus fotos»; sin esto Safari pinta el vídeo gris hasta reproducirlo.
        const poster = posterDeVideo.get(p.src.split('#')[0]);
        if (poster) { el.poster = poster; el.preload = 'none'; }
        else { if (!p.src.includes('#')) el.src = p.src + '#t=0.001'; el.preload = 'metadata'; }
      } else el.alt = '';
      card.appendChild(el);
      grid.appendChild(card);
    });
  }

  // opts.auto: álbum generado por Nido (por año, época o persona): va justo detrás de "Todas tus fotos", no delante.
  NidoAlbums.create = (name, opts) => {
    const o = opts || {};
    const album = { id: 'a' + (++NidoAlbums.seq), name, photos: o.photos || [], key: o.key || null, auto: !!o.auto };
    if (album.auto) album.base = album.photos.slice(); // lo que puso Nido la última vez (upsert respeta lo que la persona cambie encima)
    NidoAlbums.list.push(album);
    albumesLists().forEach((list) => {
      const base = list.querySelector('.album-stack:not([data-album-id])') || list.querySelector('.album-stack');
      const stack = base.cloneNode(true);
      stack.dataset.albumId = album.id;
      const front = stack.querySelector('.album-stack__front');
      front.removeAttribute('data-nav');
      front.dataset.albumOpen = album.id;
      front.querySelector('.album-stack__caption').firstChild.textContent = '\n                ' + name + '\n                ';
      // «Todas tus fotos» siempre arriba (27-sep: bajaba un puesto con cada álbum nuevo). Debajo, los que crea la persona (el más
      // nuevo primero) y después los que hace Nido solo (años, Navidad, verano).
      stack.toggleAttribute('data-album-auto', album.auto);
      const todas = list.querySelector('.album-stack:not([data-album-id])');
      const propios = list.querySelectorAll('.album-stack[data-album-id]:not([data-album-auto])');
      if (!todas) list.prepend(stack);
      else if (!album.auto) todas.after(stack);
      else (propios.length ? propios[propios.length - 1] : todas).after(stack);
    });
    albumSync(album);
    return album;
  };

  // Crea o actualiza un álbum automático por clave (p. ej. "anio:2025", "navidad:2025", "persona:r1abc").
  // Los automáticos también se pueden cambiar a mano (28-sep: Nidi decía «no se puede» al meter una foto en «2025» y era
  // fricción). Para que el cambio no se pierda cuando Nido los rehace: se compara con lo que puso Nido la vez anterior
  // (album.base) y se conservan las fotos que la persona añadió y se dejan fuera las que quitó; el nombre que ella le puso, igual.
  const srcIgual = (a, b) => new URL(a, location.href).href === new URL(b, location.href).href;
  NidoAlbums.upsert = (key, name, photos) => {
    let album = NidoAlbums.list.find((x) => x.key === key);
    if (!album) return NidoAlbums.create(name, { key, auto: true, photos });
    const base = album.base || album.photos;
    const tiene = (lista, p) => lista.some((x) => srcIgual(x.src, p.src));
    const anadidas = album.photos.filter((p) => !tiene(base, p) && !tiene(photos, p));
    const quitadas = base.filter((p) => !tiene(album.photos, p));
    album.base = photos.slice();
    album.photos = photos.filter((p) => !tiene(quitadas, p)).concat(anadidas);
    if (album.renombrado) name = album.name;
    if (album.name !== name) {
      album.name = name;
      albumesLists().forEach((list) => {
        const st = list.querySelector('[data-album-id="' + album.id + '"] .album-stack__caption');
        if (st) st.firstChild.textContent = '\n                ' + name + '\n                ';
      });
    }
    albumSync(album);
    if (NidoAlbums.current === album) albumRender();
    return album;
  };

  // Quita un álbum automático por clave (p. ej. «persona:r1abc» cuando se deshace el nombre de esa persona).
  NidoAlbums.removeKey = (key) => {
    const album = NidoAlbums.list.find((x) => x.key === key);
    if (!album) return;
    NidoAlbums.list = NidoAlbums.list.filter((x) => x !== album);
    document.querySelectorAll('[data-album-id="' + album.id + '"]').forEach((el) => el.remove());
    if (NidoAlbums.current === album) { NidoAlbums.current = null; if (currentScreen() === 'album-nuevo') showScreen('albumes'); }
  };

  NidoAlbums.open = (id) => {
    NidoAlbums.current = NidoAlbums.list.find((a) => a.id === id) || null;
    albumRender();
    showScreen('album-nuevo');
  };

  // Tocar la tarjeta de un álbum creado abre sus fotos.
  document.addEventListener('click', (event) => {
    const t = event.target.closest('[data-album-open]');
    if (t) NidoAlbums.open(t.dataset.albumOpen);
  });

  // Destino de "Elegir fotos": un álbum creado ("nuevo") o "Todas tus fotos". Se fija al pulsar "Añadir" en
  // cada uno; "Volver" y "Añadir" de la selección vuelven al que corresponda y, en un álbum creado, copian
  // las elegidas a ese álbum (sin duplicar las que ya tiene).
  let selectTarget = 'todas';
  // «Elige las fotos a añadir» sirve también para elegir LA foto de una felicitación desde Yo (selectTarget «felicitacion»).
  function modoSeleccion() {
    const t = document.querySelector('[data-screen="album-seleccionar"] .page-title');
    if (t) t.textContent = selectTarget === 'felicitacion' ? 'Elige una foto' : 'Elige las fotos a añadir';
    contarSeleccion();
  }
  // Felicitación desde un recuerdo que es una recopilación (28-sep): como las fotos van pasando solas, en vez de coger «la que esté
  // delante» se para y se pregunta «¿Con qué foto?» en la misma pantalla de elegir, mostrando SOLO las fotos de ese recuerdo y con la
  // que se estaba viendo ya marcada (si era esa, basta con «Continuar»). «Volver» regresa al recuerdo.
  let eligiendoDeRecuerdo = false;
  function elegirFotoDeRecuerdo(item) {
    const recop = item.querySelector('.recopilacion');
    recopilacionMarcha(item, false);
    const srcs = Array.from(recop.querySelectorAll('img')).map((i) => i.src);
    const activa = (recop.querySelector('img.is-activa') || recop.querySelector('img')).src;
    selectTarget = 'felicitacion';
    eligiendoDeRecuerdo = true;
    const grid = document.querySelector('[data-select-grid]');
    grid.querySelectorAll('.photo-card').forEach((c) => {
      const m = c.querySelector('img, video');
      c.classList.toggle('fuera-recuerdo', !m || !srcs.includes(m.src));
      c.classList.toggle('is-selected', !!m && m.src === activa);
    });
    modoSeleccion();
    const t = document.querySelector('[data-screen="album-seleccionar"] .page-title');
    if (t) t.textContent = '¿Con qué foto?';
    showScreen('album-seleccionar');
  }
  function dejarDeElegirDeRecuerdo() {
    if (!eligiendoDeRecuerdo) return;
    eligiendoDeRecuerdo = false;
    document.querySelectorAll('[data-select-grid] .fuera-recuerdo').forEach((c) => c.classList.remove('fuera-recuerdo'));
  }
  document.addEventListener('click', (event) => {
    const b = event.target.closest('[data-screen="detalle-foto"] [data-persona-action="felicitacion"]');
    if (!b) return;
    const i = Math.max(0, Math.round(detalleMedia.scrollLeft / detalleMedia.clientWidth));
    const item = detalleMedia.querySelectorAll('.detail-media__item')[i];
    if (!item) return;
    if (item.querySelector('.recopilacion')) { event.stopImmediatePropagation(); event.preventDefault(); elegirFotoDeRecuerdo(item); return; }
    const v = item.querySelector('video'); if (v) v.pause(); // vídeo: la felicitación sale del fotograma que se ve, sin que avance
  }, true);

  function abrirElegirFotoFelicitacion() {
    selectTarget = 'felicitacion';
    document.querySelectorAll('[data-select-grid] .is-selected').forEach((c) => c.classList.remove('is-selected'));
    modoSeleccion();
    showScreen('album-seleccionar');
  }
  document.addEventListener('click', (event) => {
    const src = event.target.closest('[data-select-target]');
    if (src) {
      selectTarget = src.dataset.selectTarget;
      document.querySelectorAll('[data-select-grid] .is-selected').forEach((c) => c.classList.remove('is-selected'));
      modoSeleccion();
    }
    if (event.target.closest('[data-select-add]') && selectTarget === 'felicitacion') {
      const el = document.querySelector('[data-select-grid] .is-selected img, [data-select-grid] .is-selected video');
      if (el) window.PersonaSelect.felicitacionConFoto(el);
      if (eligiendoDeRecuerdo) window.felicitacionOrigin = 'detalle'; // «Volver» de los estilos y del resultado regresa al recuerdo
    }
    if (event.target.closest('[data-select-add]') && selectTarget === 'nuevo' && NidoAlbums.current) {
      const album = NidoAlbums.current;
      document.querySelectorAll('[data-select-grid] .is-selected').forEach((c) => {
        const m = c.querySelector('img, video');
        if (!album.photos.some((p) => p.src === m.src)) album.photos.push({ src: m.src, tag: m.tagName });
      });
      albumRender();
      albumSync(album);
    }
  }, true);

  // Deep-link de revisión: abrir index.html#albumes fuerza esa pantalla al cargar.
  const initial = location.hash.replace('#', '');
  if (initial && document.querySelector(`.screen[data-screen="${initial}"]`)) {
    showScreen(initial);
  }

  // Onboarding eliminado temporalmente — este bloque queda inerte (no hay
  // ningún .screen--onboarding en el DOM) pero se deja tal cual porque la
  // lógica se necesitará igual cuando se reconstruya con el nuevo diseño.
  // Motivo original: la pantalla activa al cargar no pasa por showScreen(),
  // así que su pollito no arrancaba la animación solo.
  const startActive = document.querySelector('.screen.is-active.screen--onboarding');
  if (startActive) window.Mascota.enterOnboardingPollito(startActive);

  // Onboarding: además de "Siguiente", avanzan el elemento destacado, la burbuja, el pollito y el
  // texto repetido sobre el velo — todo lo que se ve nítido encima del difuminado. Se reenvía el toque
  // al botón "Siguiente" de esa misma pantalla, así hay un único camino de avance por paso.
  document.addEventListener('click', (event) => {
    // .ob-personas__title (28-sep): el título «Grupos de personas» destacado del tour de Personas no hacía nada al tocarlo.
    const hit = event.target.closest('.onboarding-highlight, .onboarding-tooltip, .onboarding-pollito, .onboarding-caption, .onboarding-glow-title, .ob-personas__title');
    if (!hit || event.target.closest('[data-onboarding-next], [data-detalle-onboarding-next], [data-onboarding-layer-close], [data-onboarding-layer-next]')) return;
    const scope = hit.closest('.screen--onboarding, [data-detalle-onboarding], [data-onboarding-layer]');
    const cta = scope && scope.querySelector('.onboarding-cta');
    if (cta) cta.click();
  }, true);

  // ---------------------------------------------------------------
  // Galería real: "Permitir" (modal "Ayúdanos") abre el selector de fotos del dispositivo — en el móvil
  // es la fototeca; en ordenador, el explorador de archivos. Las fotos elegidas sustituyen a las de
  // ejemplo en "Mis recuerdos" (Home) y en "Todas tus fotos". Un navegador no puede leer la galería
  // sin que la persona elija, así que el permiso es esta selección. Si cancela, se quedan las de ejemplo.
  // ---------------------------------------------------------------
  const galleryInput = document.getElementById('gallery-input');
  const MAX_GALLERY = 60;

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-pick-gallery]')) { galeriaAbierta = true; galleryInput.click(); } // debe ir dentro del toque
  }, true);

  // Un archivo, una sola dirección: si cada pantalla creara la suya, el buscador de personas vería la misma foto varias veces
  // (rejilla, carrusel de Home, selector) y contaría de más en los álbumes y en los grupos.
  const urlDeArchivo = new WeakMap();
  function galleryMedia(files) {
    return files.slice(0, MAX_GALLERY).map((f) => {
      let url = urlDeArchivo.get(f);
      if (!url) { url = URL.createObjectURL(f); urlDeArchivo.set(f, url); }
      const el = document.createElement(f.type.startsWith('video') ? 'video' : 'img');
      if (el.tagName === 'VIDEO') {
        // Safari en iPhone no pinta un vídeo hasta reproducirlo (tarjeta gris): con portada (la de la biblioteca) o pidiendo el primer
        // fotograma (#t) se ve desde el principio.
        // Cada vídeo es un descodificador en marcha: con la portada de la biblioteca no se carga nada hasta reproducirlo (preload none).
        // Un iPhone no aguanta una docena a la vez (la página se cerraba sola: "ha generado problemas repetidamente").
        if (f.nidoPoster) { el.src = url; el.poster = f.nidoPoster; el.preload = 'none'; posterDeVideo.set(url, f.nidoPoster); }
        else { el.src = url + '#t=0.001'; el.preload = 'metadata'; }
        el.muted = true; el.loop = true; el.playsInline = true; el.setAttribute('playsinline', '');
      } else { el.src = url; el.alt = ''; el.decoding = 'async'; }
      return el;
    });
  }

  // Si cierra el selector sin elegir nada: no es un error, se queda con las fotos de ejemplo y se le dice.
  // El aviso sale solo en la pantalla de carga del alta (ver splashSelectorCerrado). En el resto del alta y en el tour no se interrumpe
  // con nada encima de «Siguiente»; fuera de ahí, si cierra el selector sin elegir, se le dice enseguida.
  const AVISO_GALERIA = 'Sin problema: de momento verás fotos de ejemplo.';
  galleryInput.addEventListener('cancel', () => {
    if (splashSelectorCerrado(true)) return;
    if (/^(registro|onboarding)/.test(currentScreen())) return;
    // Si ya tiene sus fotos, el aviso sería falso (sigue viendo las suyas). Y si lo abrió desde el «Elegir fotos» de Nidi (subir_fotos,
    // agente-acciones.js), es Nidi quien le habla de ello: dos mensajes a la vez sobran.
    if (galeriaPropia || document.querySelector('.nido-subir-fotos')) return;
    setTimeout(() => nidoToast(currentScreen(), AVISO_GALERIA, null, null, 3500), 600);
  });

  // Sin conexión: se avisa en la pantalla actual (la IA de felicitaciones la necesita); al volver, se quita.
  window.addEventListener('offline', () => nidoToast(currentScreen(), 'Sin conexión. Las felicitaciones necesitan internet.', null, null, 8000));
  window.addEventListener('online', () => nidoToast(currentScreen(), 'Ya tienes conexión otra vez.', null, null, 3000));

  // Fecha de una foto: la de la cámara (EXIF) si la trae; si no, la de modificación del archivo. Las capturas y las
  // fotos reenviadas por WhatsApp no traen EXIF, por eso conviene subir las originales.
  async function fotoFecha(file) {
    try {
      if (window.exifr && file.type.startsWith('image/')) {
        const d = await window.exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
        const v = d && (d.DateTimeOriginal || d.CreateDate);
        if (v instanceof Date && !isNaN(v)) return v;
      }
    } catch (e) { /* sin EXIF: se usa la del archivo */ }
    return new Date(file.lastModified || Date.now());
  }

  // Álbumes que Nido crea solo con lo que se añade: uno por año y uno por época (Navidad, verano). Los de personas
  // se crean cuando se reconoce a alguien (persona.js). Mínimo 3 fotos para que un álbum merezca existir.
  function albumesAutomaticos(items) {
    const MIN = 3;
    const porAnio = {}, navidad = {}, verano = {};
    items.forEach((it) => {
      const y = it.date.getFullYear(), m = it.date.getMonth() + 1, d = it.date.getDate();
      (porAnio[y] = porAnio[y] || []).push(it);
      if ((m === 12 && d >= 15) || (m === 1 && d <= 6)) { const yy = m === 1 ? y - 1 : y; (navidad[yy] = navidad[yy] || []).push(it); }
      if ((m === 6 && d >= 21) || m === 7 || m === 8 || (m === 9 && d <= 22)) (verano[y] = verano[y] || []).push(it);
    });
    const ph = (arr) => arr.map((it) => ({ src: it.src, tag: it.tag }));
    Object.keys(navidad).forEach((y) => navidad[y].length >= MIN && NidoAlbums.upsert('navidad:' + y, 'Navidad ' + y, ph(navidad[y])));
    Object.keys(verano).forEach((y) => verano[y].length >= MIN && NidoAlbums.upsert('verano:' + y, 'Verano ' + y, ph(verano[y])));
    Object.keys(porAnio).forEach((y) => porAnio[y].length >= MIN && NidoAlbums.upsert('anio:' + y, String(y), ph(porAnio[y])));
  }

  // Título de un recuerdo de Home a partir de su fecha: «Hoy», «Ayer», «Navidad de 2024», «Año Nuevo 2025» o «12 de marzo de 2025».
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function tituloRecuerdo(d) {
    if (!(d instanceof Date) || isNaN(d)) return 'Un día especial';
    const dia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const hoy = dia(new Date());
    if (dia(d) === hoy) return 'Hoy';
    if (dia(d) === hoy - 864e5) return 'Ayer';
    const m = d.getMonth() + 1, n = d.getDate(), y = d.getFullYear();
    if (m === 12 && (n === 24 || n === 25)) return 'Navidad de ' + y;
    if (m === 12 && n === 31) return 'Año Nuevo ' + (y + 1);
    if (m === 1 && n === 1) return 'Año Nuevo ' + y;
    return n + ' de ' + MESES[m - 1] + ' de ' + y;
  }

  // Vídeos de «Mis recuerdos» en bucle, como un GIF (28-sep): se reproduce el que se ve (al menos un 60 % de la tarjeta) mientras Home
  // está delante, y se pausa al salir de la vista o de la pantalla. Así nunca hay más de uno o dos en marcha (un iPhone no aguanta
  // varios a la vez: ver la nota de galleryMedia).
  let recuerdosObs = null;
  const visiblesRecuerdos = new Set();
  function videosRecuerdosAlDia() {
    const enHome = currentScreen() === 'home';
    document.querySelectorAll('[data-screen="home"] .carousel .photo-card--recopilacion').forEach((c) => recopilacionMarcha(c, enHome && visiblesRecuerdos.has(c)));
    document.querySelectorAll('[data-screen="home"] .carousel video').forEach((v) => {
      v.loop = true; v.muted = true; v.playsInline = true;
      v.autoplay = false; v.removeAttribute('autoplay'); // el de ejemplo lo traía del HTML y arrancaba solo aunque no se viera
      if (enHome && visiblesRecuerdos.has(v)) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
    });
  }
  function vigilarVideosRecuerdos(carousel) {
    if (recuerdosObs) recuerdosObs.disconnect();
    visiblesRecuerdos.clear();
    if (!('IntersectionObserver' in window)) return;
    recuerdosObs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => { const v = e.target.querySelector('video') || e.target; if (e.intersectionRatio >= 0.6) visiblesRecuerdos.add(v); else visiblesRecuerdos.delete(v); });
      videosRecuerdosAlDia();
    }, { root: carousel, threshold: [0, 0.6, 1] });
    carousel.querySelectorAll('.photo-card').forEach((c) => { if (c.querySelector('video') || c.classList.contains('photo-card--recopilacion')) recuerdosObs.observe(c); });
  }
  window.NidoRecuerdosVideo = videosRecuerdosAlDia;

  // Burbujas «hug» (28-sep): cada burbuja se ajusta a su línea de texto más larga, con 16px a cada lado, sin hueco sobrante. El ancho
  // del CSS (el de Figma) solo decide dónde se parten las líneas. Si la cola está abajo a la derecha (esquina recta), se mantiene su
  // borde derecho para que siga apuntando al pollito (solo en el tour; en la ayuda las dos burbujas van alineadas a la izquierda). Las de la conversación con Nidi las coloca colocarPanel (que ya las abraza).
  const BURBUJAS = '.onboarding-tooltip, .ayuda-layer__bubble, .persona-ask__bubble, .persona-ask__reply, .eliminar-foto-bubble';
  function abrazarBurbuja(b) {
    if (!b || b.hidden || b.closest('.ayuda-layer--nidi')) return;
    b.style.width = ''; b.style.left = '';
    const cs = getComputedStyle(b);
    if (cs.display === 'none' || !b.offsetWidth) return;
    const texto = b.querySelector('.ayuda-texto__in') || b;
    const rg = document.createRange(); rg.selectNodeContents(texto);
    const lineas = Array.from(rg.getClientRects()).filter((r) => r.width > 0);
    if (!lineas.length) return;
    const k = b.getBoundingClientRect().width / b.offsetWidth || 1; // la pantalla puede verse escalada
    const ancho = (Math.max(...lineas.map((r) => r.right)) - Math.min(...lineas.map((r) => r.left))) / k;
    const nuevo = Math.round((ancho + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) + 0.3) * 10) / 10;
    const antes = b.offsetWidth, izq = b.offsetLeft;
    if (nuevo >= antes) return;
    b.style.width = nuevo + 'px';
    if (cs.position === 'absolute' && b.matches('.onboarding-tooltip') && parseFloat(cs.borderBottomRightRadius) === 0) b.style.left = (izq + antes - nuevo) + 'px';
  }
  function abrazarBurbujas() { document.querySelectorAll(BURBUJAS).forEach(abrazarBurbuja); }
  window.NidoAbrazarBurbujas = abrazarBurbujas;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(abrazarBurbujas));
  // Tras cualquier toque (abre capas, cambia textos) y al cambiar de pantalla, se vuelven a ajustar (son pocas: es barato).
  document.addEventListener('click', () => requestAnimationFrame(() => requestAnimationFrame(abrazarBurbujas)));

  // Copias del tour (onboarding-1…5 son una foto fija de Home; onboarding-albumes, de Álbumes): se rellenan con lo que hay de verdad.
  // Los vídeos, en silencio y en bucle; las recopilaciones, quietas en su primera foto (van debajo del velo del tour).
  function sincronizarCopiasTour() {
    const homeReal = document.querySelector('[data-screen="home"] [data-carousel]');
    if (homeReal && homeReal.querySelector('.photo-card')) {
      document.querySelectorAll('.screen--onboarding .carousel').forEach((copia) => {
        if (copia === homeReal) return;
        copia.innerHTML = '';
        homeReal.querySelectorAll(':scope > .photo-card').forEach((c) => {
          const x = c.cloneNode(true);
          x.querySelectorAll('.recopilacion').forEach((r) => r.classList.remove('en-marcha'));
          x.querySelectorAll('video').forEach((v) => { v.muted = true; v.loop = true; v.playsInline = true; v.removeAttribute('autoplay'); v.preload = 'metadata'; });
          copia.appendChild(x);
        });
        copia.scrollLeft = 0;
      });
    }
    const albumesReal = document.querySelector('[data-screen="albumes"] .albumes-list');
    if (albumesReal) {
      document.querySelectorAll('[data-screen^="onboarding-albumes"] .albumes-list').forEach((copia) => {
        copia.innerHTML = '';
        albumesReal.querySelectorAll(':scope > .album-stack').forEach((a) => copia.appendChild(a.cloneNode(true)));
      });
    }
  }

  // Título de un momento (varias fotos): fiesta si la hay, un día o un tramo de días («27–30 de enero de 2026»).
  function tituloMomento(fotos) {
    const ds = fotos.map((o) => o.d);
    const nueva = ds[0], vieja = ds[ds.length - 1];
    if (ds.some((d) => d.getMonth() === 11 && (d.getDate() === 24 || d.getDate() === 25))) return 'Navidad de ' + ds.find((d) => d.getMonth() === 11).getFullYear();
    if (ds.some((d) => (d.getMonth() === 0 && d.getDate() === 1) || (d.getMonth() === 11 && d.getDate() === 31))) {
      const d = ds.find((x) => x.getMonth() === 0 && x.getDate() === 1); return 'Año Nuevo ' + (d ? d.getFullYear() : nueva.getFullYear() + 1);
    }
    // Lugar (28-sep): el sitio reconocible que más se repite, si sale en 2 fotos o más (o en la mitad) → «Venecia, enero de 2026».
    // No hace falta que salga en todas: en un viaje muchas fotos son interiores o caras de cerca, sin nada que diga dónde.
    const cuenta = {};
    fotos.forEach((o) => { if (o.f && o.f.nidoLugar) cuenta[o.f.nidoLugar] = (cuenta[o.f.nidoLugar] || 0) + 1; });
    const [lugar, veces] = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0] || [];
    if (lugar && (veces >= 2 || veces * 2 >= fotos.length)) return lugar + ', ' + MESES[nueva.getMonth()] + ' de ' + nueva.getFullYear();
    const mismoDia = nueva.toDateString() === vieja.toDateString();
    if (mismoDia) return tituloRecuerdo(nueva);
    if (nueva.getMonth() === vieja.getMonth() && nueva.getFullYear() === vieja.getFullYear()) return vieja.getDate() + '–' + nueva.getDate() + ' de ' + MESES[nueva.getMonth()] + ' de ' + nueva.getFullYear();
    return MESES[vieja.getMonth()] + '–' + MESES[nueva.getMonth()] + ' de ' + nueva.getFullYear();
  }
  // Tarjeta de recopilación: las fotos apiladas; se van mostrando con fundido y zoom lento (ver .recopilacion en components.css y
  // videosRecuerdosAlDia, que la pone en marcha solo mientras se ve). Con una sola foto, solo el zoom.
  function recopilacionCard(fotos, titulo) {
    const card = document.createElement('div');
    card.className = 'photo-card photo-card--tall photo-card--recopilacion';
    const pila = document.createElement('div');
    pila.className = 'recopilacion' + (fotos.length === 1 ? ' recopilacion--una' : '');
    fotos.forEach((o, i) => {
      let url = urlDeArchivo.get(o.f);
      if (!url) { url = URL.createObjectURL(o.f); urlDeArchivo.set(o.f, url); }
      const img = document.createElement('img');
      img.src = url; img.alt = ''; img.decoding = 'async';
      if (i === 0) img.classList.add('is-activa');
      pila.appendChild(img);
    });
    card.appendChild(pila);
    card.insertAdjacentHTML('beforeend', '<div class="photo-card__gradient"></div><div class="photo-card__caption"><span></span><img src="assets/icons/icon-chevron-right.svg" alt="" /></div>');
    card.querySelector('.photo-card__caption span').textContent = titulo;
    if (fotos.length > 1) card.setAttribute('aria-label', titulo + ': ' + fotos.length + ' fotos');
    return card;
  }
  const RECOP_MS = 2800; // cada foto de una recopilación
  function recopilacionMarcha(card, enMarcha) {
    const pila = card.querySelector('.recopilacion');
    if (!pila) return;
    pila.classList.toggle('en-marcha', enMarcha);
    if (!enMarcha || pila.children.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) { clearInterval(card._recop); card._recop = null; return; }
    if (card._recop) return;
    card._recop = setInterval(() => {
      const imgs = pila.children, i = Array.from(imgs).findIndex((x) => x.classList.contains('is-activa'));
      imgs[i].classList.remove('is-activa');
      imgs[(i + 1) % imgs.length].classList.add('is-activa');
    }, RECOP_MS);
  }

  async function cargarGaleria(files) {
    files = files.filter((f) => /^(image|video)\//.test(f.type)).slice(0, MAX_GALLERY);
    if (!files.length) return;
    // Más recientes primero.
    const fechas = await Promise.all(files.map(fotoFecha));
    const orden = files.map((f, i) => ({ f, d: fechas[i] })).sort((x, y) => y.d - x.d);
    files = orden.map((o) => o.f);

    // Home: cada recuerdo lleva por título su fecha de verdad (27-sep: antes se repetían «Personas especiales» y «Un día especial»).
    const homeCards = document.querySelectorAll('[data-screen="home"] .carousel .photo-card');
    const fechaDe = new Map();
    const carousel = document.querySelector('[data-screen="home"] [data-carousel]');
    const template = homeCards[0];
    // El recuerdo de ejemplo en vídeo ("Un día especial") que ya traía Home se conserva: es de los que se ven moverse.
    const vEj = carousel.querySelector('video');
    const ejemplo = vEj ? vEj.closest('.photo-card').cloneNode(true) : null;
    carousel.innerHTML = '';
    // «Mis recuerdos» (28-sep): solo cosas en movimiento, 5 en total. El vídeo más reciente (en bucle), el de ejemplo (la boda
    // animada, 2.º) y RECOPILACIONES: la app agrupa las fotos de un mismo momento (hasta 3 días entre una y otra, 3 fotos o más) y las
    // pasa una tras otra con fundido y zoom lento (recopilacionCard). Se hace en el móvil, sin nube, y vale igual para las fotos que
    // suba la persona. Si no hay momentos suficientes, los huecos se llenan con fotos sueltas con zoom lento. Pocos a propósito:
    // deslizar en horizontal cuesta más a las personas mayores (NN/g, Rogers et al.) y una fila corta se ve entera y se termina.
    const todos = galleryMedia(files);
    todos.forEach((m, i) => fechaDe.set(m, orden[i].d));
    const vids = todos.filter((m) => m.tagName === 'VIDEO');
    const MAX_RECUERDOS = 5;
    const entradas = [];
    const video = vids[0] || null;
    const diaDe = (d) => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    const diaVideo = video ? diaDe(fechaDe.get(video)) : null;
    const fotosOrd = orden.filter((o) => o.f.type.startsWith('image/')); // ya van de la más reciente a la más antigua
    const momentos = [];
    fotosOrd.forEach((o) => {
      const cur = momentos[momentos.length - 1];
      if (cur && cur.antigua - o.d <= 3 * 864e5) { cur.fotos.push(o); cur.antigua = o.d; } else momentos.push({ fotos: [o], antigua: o.d });
    });
    const plazas = MAX_RECUERDOS - (video ? 1 : 0) - (ejemplo ? 1 : 0);
    const elegidos = momentos.filter((m) => m.fotos.length >= 3 && !m.fotos.some((o) => diaDe(o.d) === diaVideo)).slice(0, plazas);
    // Huecos: fotos sueltas (las más recientes que no estén ya en un momento elegido), cada una con su zoom lento.
    const usadas = new Set(elegidos.flatMap((m) => m.fotos.map((o) => o.f)));
    fotosOrd.filter((o) => !usadas.has(o.f)).slice(0, Math.max(0, plazas - elegidos.length)).forEach((o) => elegidos.push({ fotos: [o], antigua: o.d }));
    elegidos.sort((a, b) => b.fotos[0].d - a.fotos[0].d);
    if (video) entradas.push({ video });
    elegidos.forEach((m) => entradas.push({ momento: m }));
    entradas.forEach((e) => {
      let card;
      if (e.video) {
        card = template.cloneNode(false);
        card.className = 'photo-card photo-card--tall';
        card.appendChild(e.video);
        card.insertAdjacentHTML('beforeend', '<div class="photo-card__gradient"></div><div class="photo-card__caption"><span>' +
          tituloRecuerdo(fechaDe.get(e.video)) + '</span><img src="assets/icons/icon-chevron-right.svg" alt="" /></div>');
      } else card = recopilacionCard(e.momento.fotos.slice(0, 6), tituloMomento(e.momento.fotos));
      carousel.appendChild(card);
    });
    if (ejemplo) carousel.insertBefore(ejemplo, carousel.children[1] || null); // vuelve en 2.ª posición
    carousel.scrollLeft = 0;
    vigilarVideosRecuerdos(carousel);
    setTimeout(sincronizarCopiasTour, 0); // el tour enseña estos mismos recuerdos (y los álbumes, que se crean más abajo)

    // "Todas tus fotos": la cuadrícula completa (el botón "Añadir" se queda).
    const grid = document.querySelector('[data-screen="album-detalle"] .album-grid');
    grid.querySelectorAll('.photo-card').forEach((c) => c.remove());
    galleryMedia(files).forEach((media) => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.appendChild(media);
      grid.appendChild(card);
    });
    const selGrid = document.querySelector('[data-select-grid]');
    selGrid.innerHTML = '';
    contarSeleccion(); // cuadrícula nueva, sin nada marcado
    galleryMedia(files).forEach((media) => {
      const cell = document.createElement('button');
      cell.className = 'photo-card is-selectable';
      cell.appendChild(media);
      cell.insertAdjacentHTML('beforeend', '<span class="select-overlay"><img class="select-overlay__vacio" src="assets/icons/icon-circle-empty.svg" alt="" /><img class="select-overlay__check" src="assets/icons/icon-check-circle-44.svg" alt="" /></span>');
      selGrid.appendChild(cell);
    });

    // Portada y contador de "Todas tus fotos" = lo que se ha añadido (portada: la más reciente). El álbum de
    // ejemplo "Mis nietas · 55 fotos" era inventado: se quita. Los álbumes se generan solos más abajo.
    const items = orden.map((o, i) => ({ src: o.f.type.startsWith('video') ? null : null, date: o.d, file: o.f }));
    const covers = galleryMedia(files);
    items.forEach((it, i) => { it.src = covers[i].src; it.tag = covers[i].tagName; });
    const portada = items.find((it) => it.tag === 'IMG');
    albumesLists().forEach((list) => {
      const stacks = Array.from(list.querySelectorAll('.album-stack:not([data-album-id])'));
      const todas = stacks[0];
      if (todas) {
        todas.querySelector('.album-stack__meta').textContent = files.length + (files.length === 1 ? ' foto' : ' fotos');
        if (portada) todas.querySelector('.album-stack__front > img').src = portada.src;
        albumStackTrasera(todas, items.find((it) => it.tag === 'IMG' && it !== portada));
      }
      stacks.slice(1).forEach((s) => s.remove());
    });
    window.NidoGaleria = { items }; // foto/vídeo, dirección y fecha: el asistente arma álbumes por año, época o persona con esto
    albumesAutomaticos(items);
    window.dispatchEvent(new CustomEvent('nido:gallery')); // persona.js busca de nuevo a las personas conocidas
  }

  galleryInput.addEventListener('change', async () => {
    splashSelectorCerrado(false);
    const files = Array.from(galleryInput.files || []);
    // Subir fotos SUMA a las que ya hay (antes las sustituía: con la biblioteca cargada, «Todas tus fotos» pasaba de 42 a 2 mientras
    // los álbumes y las personas seguían contando las 42). En el alta todavía no hay nada, así que ahí es lo mismo que antes.
    // Las nuevas van delante para que el tope MAX_GALLERY (que cargarGaleria aplica antes de ordenar por fecha) no las deje fuera.
    const yaHay = (galeriaPropia || bibliotecaCargada) && window.NidoGaleria ? window.NidoGaleria.items.map((it) => it.file).filter((f) => f && !files.includes(f)) : [];
    if (files.length) galeriaPropia = true;
    await cargarGaleria(files.length ? files.concat(yaHay) : files);
    galleryInput.value = '';
    if (files.length) buscarDocumentos(files); // en segundo plano: la persona sigue viendo sus fotos mientras tanto
  });

  // ---- Papeles a «Mis documentos» solos (27-sep, pedido: «que la app detecte documentos y horarios sin que tengan que hacer nada») ----
  // Solo con las fotos que la persona SUBE (nunca la biblioteca entera): cada una va reducida a 512 px y recomprimida (sin EXIF ni GPS)
  // a ver-foto.js en modo «clasificar», que contesta solo el tipo (identificativo, horario, documento o foto) y un nombre corto.
  // Los papeles salen de los recuerdos y de «Todas tus fotos» y pasan a su apartado de Mis documentos; un aviso dice dónde han ido.
  // Si no hay conexión o el servidor no contesta, se quedan como fotos normales (nada se pierde).
  const DOC_SECCION = { identificativo: 'Documentos identificativos', horario: 'Horarios', documento: 'Otros documentos' };
  const archivosDocumento = new WeakSet();
  async function reducirArchivo(file, lado) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', 0.8);
    c.width = c.height = 0; // suelta la memoria ya (iPhone)
    if (bmp.close) bmp.close();
    return url.split(',')[1];
  }
  async function clasificarArchivo(file) {
    try {
      const imageBase64 = await reducirArchivo(file, 512);
      const res = await fetch('/.netlify/functions/ver-foto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, modo: 'clasificar' }),
        signal: window.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined,
      });
      if (!res.ok) return null;
      const j = await res.json();
      return j && (DOC_SECCION[j.tipo] || j.lugar) ? j : null;
    } catch (e) { return null; }
  }
  function ponerEnDocumentos(file, clase) {
    const scr = document.querySelector('[data-screen="mis-documentos"]');
    const titulo = Array.from(scr.querySelectorAll('.section-title')).find((h) => h.textContent.trim() === DOC_SECCION[clase.tipo]);
    const grid = titulo && titulo.parentElement.querySelector('.grid-2');
    if (!grid) return;
    let url = urlDeArchivo.get(file);
    if (!url) { url = URL.createObjectURL(file); urlDeArchivo.set(file, url); }
    const card = document.createElement('div');
    card.className = 'photo-card photo-card--square-2col photo-card--bordered';
    const img = document.createElement('img');
    img.src = url;
    img.alt = clase.nombre || 'Documento';
    card.appendChild(img);
    grid.prepend(card); // el más nuevo primero: «mi DNI» encuentra antes el que acaba de subir que el de ejemplo
  }
  async function buscarDocumentos(nuevos) {
    const imgs = nuevos.filter((f) => f.type.startsWith('image/')).slice(0, 12);
    const docs = [];
    let conLugar = 0;
    for (let i = 0; i < imgs.length; i += 3) { // de 3 en 3: rápido sin pasarse del límite por minuto del modelo gratuito
      const r = await Promise.all(imgs.slice(i, i + 3).map(clasificarArchivo));
      r.forEach((clase, j) => {
        if (!clase) return;
        if (clase.lugar) { imgs[i + j].nidoLugar = clase.lugar; conLugar++; } // «Venecia»: titula sus recuerdos (tituloMomento)
        if (DOC_SECCION[clase.tipo]) docs.push({ file: imgs[i + j], clase });
      });
    }
    if (!docs.length) {
      if (conLugar && window.NidoGaleria) await cargarGaleria(window.NidoGaleria.items.map((it) => it.file).filter(Boolean)); // títulos con lugar
      return;
    }
    docs.forEach((d) => { archivosDocumento.add(d.file); ponerEnDocumentos(d.file, d.clase); });
    const resto = (window.NidoGaleria ? window.NidoGaleria.items.map((it) => it.file) : []).filter((f) => f && !archivosDocumento.has(f));
    if (resto.length) await cargarGaleria(resto); // se rehace la galería sin los papeles (las caras ya analizadas no se repiten)
    const msg = docs.length === 1 ? (docs[0].clase.nombre ? 'He guardado «' + docs[0].clase.nombre + '» en Mis documentos.' : 'He guardado un papel en Mis documentos.') : 'He guardado ' + docs.length + ' papeles en Mis documentos.';
    nidoToast(currentScreen(), msg, 'Ver', () => showScreen('mis-documentos'), 7000);
  }

  // Biblioteca de ejemplo (assets/biblioteca.json): fotos y vídeos reales con su fecha, para que la app enseñe algo de verdad
  // sin pedir nada. Entra por el mismo camino que la galería del teléfono (fechas, álbumes automáticos, reconocimiento).
  // Se carga al llegar a Home y solo si la persona no ha elegido las suyas.
  // Descarga de la biblioteca: empieza al abrir la app, no al llegar a Home (27-sep). Con datos móviles tardaba unos segundos y Home
  // enseñaba mientras tanto las 3 fotos de ejemplo del HTML; si la persona se iba enseguida (p. ej. a hacer una felicitación), al
  // volver los recuerdos «habían cambiado». Solo se DESCARGA: se enseña al llegar a Home y solo si no ha elegido sus propias fotos.
  let bibliotecaDescarga = null;
  function descargarBiblioteca() {
    if (!bibliotecaDescarga) {
      bibliotecaDescarga = (async () => {
        const lista = await (await fetch('assets/biblioteca.json')).json();
        return Promise.all(lista.map(async (m) => {
          const b = await (await fetch(m.src)).blob();
          const f = new File([b], m.src.split('/').pop(), { type: b.type || (m.tipo === 'video' ? 'video/mp4' : 'image/jpeg'), lastModified: new Date(m.fecha).getTime() });
          if (m.poster) f.nidoPoster = m.poster;
          if (m.lugar) f.nidoLugar = m.lugar; // calculado una vez con el mismo modo «clasificar» (tools/lugares-biblioteca)
          return f;
        }));
      })();
      bibliotecaDescarga.catch(() => { bibliotecaDescarga = null; }); // sin conexión: se reintenta al llegar a Home
    }
    return bibliotecaDescarga;
  }
  setTimeout(() => { if (!galeriaPropia) descargarBiblioteca().catch(() => {}); }, 800); // después de pintar la bienvenida

  async function cargarBiblioteca() {
    if (bibliotecaCargada || galeriaPropia) return;
    bibliotecaCargada = true;
    try {
      const files = await descargarBiblioteca();
      // Personas de la biblioteca (nombre + huellas de cara): así "Clara nieta", "Carlos hijo"... salen con nombre desde el principio.
      try { if (window.Reconocimiento) window.Reconocimiento.sembrar(await (await fetch('assets/biblioteca-personas.json')).json()); } catch (e) { /* sin nombres: salen "Sin nombre" */ }
      // Y sus caras ya calculadas: así el móvil no pone en marcha el reconocimiento solo para la biblioteca (ver Reconocimiento.precargar).
      try {
        const caras = await (await fetch('assets/biblioteca-caras.json')).json();
        files.forEach((f) => {
          if (!caras[f.name] || !window.Reconocimiento) return;
          let url = urlDeArchivo.get(f);
          if (!url) { url = URL.createObjectURL(f); urlDeArchivo.set(f, url); }
          window.Reconocimiento.precargar(url, caras[f.name]);
        });
      } catch (e) { /* sin el archivo: se analizan en el móvil, como antes */ }
      if (!galeriaPropia) await cargarGaleria(files);
    } catch (e) { bibliotecaCargada = false; /* sin biblioteca (o sin conexión): se quedan las fotos de ejemplo del HTML */ }
  }
  window.NidoBiblioteca = { cargar: cargarBiblioteca };
  if (currentScreen() === 'home') cargarBiblioteca(); // enlace directo a Home (#home)

  // "Eliminar foto" de verdad (687:8416 / 692:2470): la foto visible desaparece de la pantalla de la que se
  // vino (álbum, "Mis documentos", Home...) y el contador del álbum nuevo se actualiza. Las demás pantallas
  // que enseñen esa misma foto conservan la suya (es "eliminar del álbum", no del dispositivo).
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-eliminar-hecho]')) return;
    const i = Math.min(detalleCards.length - 1, Math.max(0, Math.round(detalleMedia.scrollLeft / detalleMedia.clientWidth)));
    const card = detalleCards[i];
    if (!card) return;
    const screen = card.closest('.screen');
    const origen = screen ? screen.dataset.screen : null;
    // 28-sep: una foto de la galería se quita de TODA la app (Inicio, recopilaciones, Todas tus fotos, álbumes, personas), no solo de la
    // pantalla de la que se vino; del teléfono nunca (Nido solo las lee). La foto que se ve: en una recopilación, la que está delante.
    const item = detalleMedia.querySelectorAll('.detail-media__item')[i];
    const visto = item && (item.querySelector('.recopilacion img.is-activa') || item.querySelector('img, video'));
    const enGaleria = visto && window.NidoGaleria && window.NidoGaleria.items.find((it) => it.src === visto.src);
    if (enGaleria && enGaleria.file) {
      quitarDeNido(enGaleria.file).then((deshacerNido) => {
        setTimeout(() => nidoToast(currentScreen(), 'Foto eliminada de Nido', 'Deshacer', deshacerNido, 7000), 500);
      });
      return;
    }
    let deshacer;
    if (screen && origen === 'album-nuevo' && NidoAlbums.current) {
      // Álbum creado: se quita de su lista (la posición manda, no la ruta) y se repinta.
      const album = NidoAlbums.current;
      const idx = Array.from(screen.querySelectorAll('.album-grid > .photo-card')).indexOf(card);
      const foto = idx >= 0 ? album.photos.splice(idx, 1)[0] : null;
      albumRender();
      albumSync(album);
      deshacer = () => { if (foto) { album.photos.splice(idx, 0, foto); NidoAlbums.current = album; albumRender(); albumSync(album); } };
    } else {
      const parent = card.parentNode, next = card.nextSibling;
      card.remove();
      deshacer = () => parent.insertBefore(card, next);
    }
    // "Foto eliminada · Deshacer": más amable que preguntar dos veces; la foto vuelve a su sitio.
    setTimeout(() => nidoToast(origen, 'Foto eliminada', 'Deshacer', deshacer, 7000), 700);
  }, true);

  // Quita una foto de la galería de Nido (todas las pantallas se rehacen sin ella) y devuelve cómo deshacerlo. Del teléfono no se borra.
  async function quitarDeNido(file) {
    const url = urlDeArchivo.get(file);
    const quitadas = []; // [álbum, posición, foto] para deshacer
    NidoAlbums.list.forEach((a) => {
      for (let k = a.photos.length - 1; k >= 0; k--) if (a.photos[k].src === url) quitadas.push([a, k, a.photos.splice(k, 1)[0]]);
      if (quitadas.some((q) => q[0] === a)) albumSync(a);
    });
    const todas = window.NidoGaleria ? window.NidoGaleria.items.map((it) => it.file).filter(Boolean) : [];
    const resto = todas.filter((f) => f !== file);
    if (resto.length) await cargarGaleria(resto);
    if (NidoAlbums.current) albumRender();
    return async () => {
      quitadas.reverse().forEach(([a, k, foto]) => { a.photos.splice(k, 0, foto); albumSync(a); });
      await cargarGaleria(resto.concat(file)); // se vuelve a ordenar por fecha: la foto vuelve a su sitio
      if (NidoAlbums.current) albumRender();
    };
  }

  // Aviso corto sobre una pantalla, con acción opcional ("Deshacer"). Un solo aviso por pantalla; se va solo.
  function nidoToast(screenName, msg, action, onAction, ms) {
    const host = document.querySelector('[data-screen="' + screenName + '"]');
    if (!host) return;
    let t = host.querySelector('.nido-toast');
    if (!t) { t = document.createElement('div'); t.className = 'nido-toast'; host.appendChild(t); }
    t.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = msg;
    t.appendChild(span);
    if (action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = action;
      b.addEventListener('click', () => { t.classList.remove('is-visible'); onAction(); });
      t.appendChild(b);
    }
    t.classList.add('is-visible');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('is-visible'), ms || 6000);
  }
  window.nidoToast = nidoToast;

  // Modales sencillos (Ajustes → cerrar sesión, 746:3139): [data-modal-open="x"] abre [data-modal="x"];
  // cualquier [data-modal-close] lo cierra (y, si además lleva data-nav, navega).
  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-modal-open]');
    if (open) document.querySelector('[data-modal="' + open.dataset.modalOpen + '"]').classList.add('is-visible');
    if (event.target.closest('[data-modal-close]')) event.target.closest('[data-modal]').classList.remove('is-visible');
  }, true);

  // ---------------------------------------------------------------
  // Ayuda del pollito: el avatar de arriba a la derecha abre un bocadillo con 3 opciones (máximo, como pide
  // la guía): "Explícame esta pantalla", "Hablar" (voz del navegador; sin voz disponible lo dice) e "Ir al
  // inicio" (salida segura), más "Cerrar". No repite el onboarding entero: explica solo la pantalla actual.
  // ---------------------------------------------------------------
  const AYUDA_TEXTOS = {
    home: 'Aquí ves tus recuerdos. Arriba tienes Álbumes, Personas y Yo.',
    albumes: 'Aquí están tus álbumes. Toca uno para verlo o crea uno nuevo.',
    'album-detalle': 'Estas son las fotos del álbum. Toca una para verla más grande.',
    'album-nuevo': 'Este álbum está vacío. Pulsa Añadir para elegir fotos.',
    'album-seleccionar': 'Toca las fotos que quieras. Luego pulsa Añadir.',
    'detalle-foto': 'Mantén pulsada a una persona para ver más fotos suyas. Con Felicitación creas una imagen.',
    personas: 'Aquí están las personas que salen en tus fotos. Toca una para ver las suyas.',
    'persona-fotos': 'Estas son las fotos y vídeos de esta persona.',
    'persona-imagenes': 'Todas las imágenes de esta persona.',
    'grupo-fotos': 'Las fotos en las que salen juntos. Toca una para verla más grande.',
    'persona-videos': 'Todos los vídeos de esta persona.',
    yo: 'Aquí tienes tus documentos, tus felicitaciones y los ajustes.',
    'mis-documentos': 'Aquí están las fotos con documentos o información útil.',
    ajustes: 'Aquí puedes cambiar tu teléfono, ver los términos o cerrar la sesión.',
    'felicitacion-estilo': 'Elige el tipo de felicitación y pulsa Continuar.',
    'felicitacion-generada': 'Esta es tu felicitación. Puedes compartirla.',
  };
  // Ayuda 1 (Figma 814:13870): dos bocadillos. El de arriba saluda y no cambia; el de abajo es el que
  // dice qué hacer (y luego «Te escucho…», «Conectando…» o los avisos).
  const AYUDA_HOLA = '¡Hola! ¿En qué te puedo ayudar?';
  const AYUDA_SALUDO = 'Pulsa en el micrófono y dime qué necesitas.';
  let ayudaLayer = null;
  let ayudaRec = null;

  function ayudaBuild() {
    if (ayudaLayer) return ayudaLayer;
    ayudaLayer = document.createElement('div');
    ayudaLayer.className = 'ayuda-layer';
    ayudaLayer.innerHTML =
      '<div class="onboarding-overlay"></div>' +
      '<p class="ayuda-layer__bubble ayuda-layer__bubble--hola">' + AYUDA_HOLA + '</p>' +
      '<p class="ayuda-layer__bubble ayuda-layer__bubble--tu" data-ayuda-tu hidden></p>' +
      '<p class="ayuda-layer__bubble ayuda-layer__bubble--nidi" data-ayuda-texto></p>' +
      '<img class="ayuda-layer__pollito" src="assets/img/pollito-ayuda-v3.webp" alt="" />' +
      '<div class="ayuda-layer__sugerencias" data-sugerencias></div>' +
      '<button class="btn btn--soft btn--horizontal btn--lg ayuda-layer__ver" data-ayuda="ver">Ver pantalla</button>' +
      '<button class="ayuda-layer__mic" data-ayuda="hablar" aria-label="Hablar"><img src="assets/icons/mic-escuchar.svg" alt="" /></button>' +
      '<button class="btn btn--type2 btn--horizontal btn--lg ayuda-layer__close" data-ayuda="cerrar"><span data-ayuda-cerrar-texto>Cancelar</span></button>';
    screens[0].parentElement.appendChild(ayudaLayer);
    return ayudaLayer;
  }

  // El micrófono avisa a quién le toca: late cuando escucha (habla tú) y se atenúa mientras habla Nidi.
  let ayudaLento = null;
  function ayudaEstadoBoton(estado) {
    agenteEstado = estado;
    pastillaEstado(); // la pastilla de arriba cambia a la vez que el botón del micrófono
    const layer = ayudaBuild();
    const mic = layer.querySelector('[data-ayuda="hablar"]');
    mic.classList.toggle('is-listening', estado === 'escuchando');
    mic.classList.toggle('is-nidi', estado === 'hablando' || estado === 'conectando');
    ayudaModoNidi();
    // «Te escucho» solo si Nidi aún no ha dicho nada: antes, al terminar de hablar, su frase se borraba y quedaba «Te escucho».
    if (estado === 'escuchando' && !nidiHaDicho && !layer.classList.contains('ayuda-layer--respuesta')) ayudaTexto('Te escucho. Dime qué necesitas.');
    clearTimeout(ayudaLento);
    if (estado === 'conectando') {
      ayudaTexto('Conectando con Nidi…');
      ayudaLento = setTimeout(() => { if (mic.classList.contains('is-nidi')) ayudaTexto('Tarda más de lo normal. Si no responde, comprueba que has permitido el micrófono.'); }, 7000);
    }
  }

  // Lo que ha dicho la persona (bocadillo lila, arriba) y la respuesta de Nidi debajo — pantalla "Ayuda 2" (594:7395).
  function ayudaUsuario(texto) {
    const layer = ayudaBuild();
    const tu = layer.querySelector('[data-ayuda-tu]');
    tu.textContent = texto;
    tu.hidden = false;
    layer.classList.add('ayuda-layer--respuesta');
    layer.querySelector('[data-ayuda-cerrar-texto]').textContent = 'Gracias';
    ayudaModoNidi(); // con Nidi, el botón sigue siendo «Terminar»
  }
  function ayudaReset() {
    const layer = ayudaBuild();
    layer.classList.remove('ayuda-layer--respuesta', 'ayuda-layer--inactividad');
    layer.querySelector('.ayuda-layer__pollito').src = 'assets/img/pollito-ayuda-v3.webp';
    layer.querySelector('[data-ayuda-tu]').hidden = true;
    layer.querySelector('[data-ayuda-cerrar-texto]').textContent = 'Cancelar';
    ayudaEstadoBoton('cerrado');
    ayudaTexto(AYUDA_SALUDO);
  }

  function ayudaTexto(t) {
    const el = ayudaBuild().querySelector('[data-ayuda-texto]');
    // El texto va en un interior propio: es el que se desplaza y se difumina arriba, sin tocar el fondo ni las esquinas del bocadillo.
    let inn = el.querySelector('.ayuda-texto__in');
    if (!inn) { el.textContent = ''; inn = document.createElement('span'); inn.className = 'ayuda-texto__in'; el.appendChild(inn); }
    inn.textContent = t;
    requestAnimationFrame(colocarPanel);
  }

  // ---- «Llevas un rato aquí» (Figma 847:2539): si la persona no toca nada durante IDLE_MS, Nidi se asoma con la misma capa que el
  // avatar pero con un solo bocadillo y otra pose. Una vez por visita a cada pantalla; nunca durante el alta, el tour, una foto abierta
  // o cuando ya hay otra capa, aviso o conversación en marcha. Tocar el micrófono sigue como cualquier ayuda; Cancelar la cierra.
  const AYUDA_INACTIVIDAD = 'Llevas un rato aquí. Toca el micrófono si quieres que te ayude.';
  const IDLE_SIN_AYUDA = /^(inicio|bienvenida|intro|registro|onboarding|ajustes-codigo|ajustes-telefono|detalle-foto)/;
  const IDLE_CAPAS = '.ayuda-layer.is-visible, .persona-ask.is-visible, .persona-confirm.is-visible, .eliminar-foto-layer.is-visible, [data-modal].is-visible, [data-onboarding-layer].is-visible, .detalle-onboarding.is-visible, .ob-album-nuevo.is-visible, .nido-toast.is-visible';
  function ayudaInactividad() {
    const layer = ayudaBuild();
    ayudaReset();
    layer.classList.add('ayuda-layer--inactividad');
    layer.querySelector('.ayuda-layer__pollito').src = 'assets/img/pollito-inactividad-v3.webp';
    ayudaTexto(AYUDA_INACTIVIDAD);
    layer.classList.add('is-visible');
  }
  function idleArmar() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(idleDisparar, IDLE_MS);
  }
  function idleDisparar() {
    const pantalla = currentScreen();
    const puede = !document.hidden && pantalla !== idlePantalla && !IDLE_SIN_AYUDA.test(pantalla)
      && !(window.NidoAgente && window.NidoAgente.activa) && !document.querySelector(IDLE_CAPAS);
    if (!puede) { idleArmar(); return; } // ahora no toca: se vuelve a mirar dentro de otro rato
    idlePantalla = pantalla;
    ayudaInactividad();
  }
  ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'].forEach((ev) => document.addEventListener(ev, idleArmar, { capture: true, passive: true }));
  idleArmar();

  function ayudaCerrar() {
    if (ayudaRec) { try { ayudaRec.abort(); } catch (e) {} ayudaRec = null; }
    ayudaBuild().classList.remove('is-visible');
    agentePastilla(); // si la conversación sigue, queda una pastilla para poder terminarla
  }

  // ---- Conversación de voz con el asistente (ElevenLabs, js/agente.js) ----
  // La pastilla dice de quién es el turno (25-sep). Mientras Nidi habla, el micrófono está CERRADO (agente.js, para que el eco no la
  // interrumpa): si la persona contesta antes de que termine, no se la oye. Antes ponía siempre «Nidi te escucha», también mientras
  // hablaba Nidi. Ahora: hablando → barritas de sonido y «Nidi está hablando»; escuchando → punto verde que late y «Habla ahora».
  let agentePill = null;
  let agenteEstado = 'conectando';
  const PILL_TEXTO = { conectando: 'Conectando con Nidi…', hablando: 'Nidi está hablando', escuchando: 'Habla ahora' };
  function agentePastilla() {
    const on = window.NidoAgente && window.NidoAgente.activa;
    if (!agentePill) {
      if (!on) return;
      agentePill = document.createElement('button');
      agentePill.className = 'agente-pill';
      agentePill.dataset.agente = 'terminar';
      agentePill.innerHTML = '<span class="agente-pill__senal" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="agente-pill__texto" aria-live="polite"></span><span class="agente-pill__fin">· Toca para terminar</span>';
      screens[0].parentElement.appendChild(agentePill);
    }
    pastillaEstado();
    agentePill.classList.toggle('is-visible', !!on && !ayudaBuild().classList.contains('is-visible'));
  }
  function pastillaEstado() {
    if (!agentePill || !PILL_TEXTO[agenteEstado]) return;
    agentePill.dataset.estado = agenteEstado;
    agentePill.querySelector('.agente-pill__texto').textContent = PILL_TEXTO[agenteEstado];
  }
  function agenteTerminar() {
    if (window.NidoAgente) window.NidoAgente.stop();
    if (agentePill) agentePill.classList.remove('is-visible');
    ayudaEstadoBoton('cerrado');
  }

  // ---- Panel de Nidi durante la conversación (25-sep) ----
  // En vez del pollito grande, tres botones cortos con cosas que se le pueden pedir a Nidi en ESTA pantalla: quien no sabe cómo
  // pedir algo («los abuelos no saben decir cosas técnicas») toca uno y es como si se lo dijera. Abajo, «Ver pantalla» (cierra el
  // panel y seguís hablando) y «Terminar».
  let nidiHaDicho = false;
  let ultimaAccionNidi = 0, ultimoHablaPersona = 0;
  const pistasDadas = new Set();
  const SUGERENCIAS = {
    home: ['¿Qué puedo hacer aquí?', 'Enséñame fotos de mi familia', 'Hazme una felicitación'],
    albumes: ['Abre un álbum', 'Crea un álbum nuevo', '¿Qué puedo hacer aquí?'],
    'album-detalle': ['Quiero subir fotos', 'Enséñame las de Navidad', 'Haz un álbum con estas fotos'],
    'album-nuevo': ['Añade fotos a este álbum', 'Cámbiale el nombre', 'Vuelve a mis álbumes'],
    'album-seleccionar': ['¿Cómo elijo las fotos?', 'Elige tú las de este año', 'Vuelve atrás'],
    'detalle-foto': ['Pasa a la siguiente', '¿Qué ves en esta foto?', 'Haz una felicitación con esta foto'],
    'persona-imagenes': ['Abre la primera foto', 'Hazle una felicitación', 'Vuelve atrás'],
    personas: ['¿Quiénes son?', 'Enséñame fotos de alguien', '¿Qué puedo hacer aquí?'],
    'persona-fotos': ['Hazle una felicitación', 'Haz un álbum con sus fotos', 'Vuelve a Personas'],
    yo: ['Enséñame la última felicitación', 'Hazme una felicitación', 'Ve al inicio'],
    'felicitacion-estilo': ['Hazla tú por mí', '¿Cuál me recomiendas?', 'Vuelve atrás'],
    'felicitacion-generada': ['Quiero enviarla', 'Hazme otra distinta', 'Ve al inicio'],
    'mis-documentos': ['¿A qué hora pasa el autobús?', 'Enséñame mi tarjeta sanitaria', '¿Qué papeles tengo aquí?'],
  };
  const SUGERENCIAS_OTRAS = ['¿Qué puedo hacer aquí?', 'Vuelve atrás', 'Ve al inicio'];
  // «Elige las fotos» sirve también para elegir LA foto de una felicitación (selectTarget «felicitacion»): ahí se marca una sola.
  // Nidi leía la ayuda de añadir a un álbum y decía «selecciona las que quieras» (28-sep).
  const eligiendoFotoFelicitacion = (pantalla) => pantalla === 'album-seleccionar' && selectTarget === 'felicitacion';
  function explicacionDe(pantalla) {
    if (eligiendoFotoFelicitacion(pantalla)) return 'Está eligiendo UNA foto para la felicitación: solo se puede marcar una. Toca la que quieras y luego pulsa Continuar.';
    return AYUDA_TEXTOS[pantalla] || '';
  }
  function sugerenciasDe(pantalla) {
    if (eligiendoFotoFelicitacion(pantalla)) return ['¿Cómo elijo la foto?', 'Vuelve atrás', 'Ve al inicio'];
    const api = window.PersonaSelect && window.PersonaSelect.agente;
    const ficha = api ? api.estado().ficha : null;
    if (/^persona-/.test(pantalla) && ficha && ficha.real && !ficha.nombre) return ['Te digo quién es', '¿Qué fotos tiene?', 'Vuelve a Personas'];
    return SUGERENCIAS[pantalla] || SUGERENCIAS_OTRAS;
  }
  // Coloca los bocadillos del panel de Nidi según lo que ocupan: el de Nidi, 12px bajo el tuyo (o arriba, donde el saludo, si aún no
  // has dicho nada), y con alto libre hasta 12px antes de las sugerencias. Si no cabe, se ve el final del mensaje (difuminado arriba).
  function colocarPanel() {
    const layer = ayudaBuild();
    const ni = layer.querySelector('[data-ayuda-texto]');
    const inn = ni.querySelector('.ayuda-texto__in');
    if (!layer.classList.contains('ayuda-layer--nidi')) { ni.style.top = ''; ni.style.width = ''; layer.querySelector('[data-ayuda-tu]').style.width = ''; if (inn) { inn.style.maxHeight = ''; inn.classList.remove('es-largo'); } layer.querySelectorAll('.ayuda-layer__bubble').forEach(abrazarBurbuja); return; }
    const tu = layer.querySelector('[data-ayuda-tu]');
    const sug = layer.querySelector('[data-sugerencias]');
    // Ancho ajustado a la línea más larga (25-sep): con varias líneas, «fit-content» se queda en el ancho máximo y dejaba un hueco
    // a la derecha. Se mide cada línea y el bocadillo abraza la más larga, con el mismo aire a los dos lados.
    const abrazar = (burbuja, texto) => {
      if (!burbuja || !texto || burbuja.hidden) return;
      burbuja.style.width = '';
      const rg = document.createRange(); rg.selectNodeContents(texto);
      const lineas = Array.from(rg.getClientRects()).filter((r) => r.width > 0);
      if (!lineas.length) return;
      const k = burbuja.getBoundingClientRect().width / burbuja.offsetWidth || 1; // la pantalla puede verse escalada
      const ancho = (Math.max(...lineas.map((r) => r.right)) - Math.min(...lineas.map((r) => r.left))) / k;
      const cs = getComputedStyle(burbuja);
      const extra = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      burbuja.style.width = Math.ceil(ancho + extra + 1) + 'px';
    };
    abrazar(tu, tu);
    abrazar(ni, inn || ni);
    const pad = parseFloat(getComputedStyle(ni).paddingTop) + parseFloat(getComputedStyle(ni).paddingBottom);
    const top = !tu.hidden && layer.classList.contains('ayuda-layer--respuesta') ? tu.offsetTop + tu.offsetHeight + 12 : 100; // 100: bajo el logo (28-sep)
    ni.style.top = top + 'px';
    if (!inn) return;
    const limite = (sug && sug.offsetHeight ? sug.offsetTop : 536) - 12; // donde empiezan las sugerencias
    inn.style.maxHeight = Math.max(3 * 22.5, limite - top - pad) + 'px';
    const largo = inn.scrollHeight > inn.clientHeight + 1;
    inn.classList.toggle('es-largo', largo);
    if (largo) inn.scrollTop = inn.scrollHeight;
  }
  function ayudaModoNidi() {
    const layer = ayudaBuild();
    const nidi = !!(window.NidoAgente && window.NidoAgente.activa);
    layer.classList.toggle('ayuda-layer--nidi', nidi);
    layer.querySelector('[data-ayuda-cerrar-texto]').textContent = nidi ? 'Terminar' : (layer.classList.contains('ayuda-layer--respuesta') ? 'Gracias' : 'Cancelar');
    if (!nidi) return;
    const cont = layer.querySelector('[data-sugerencias]');
    const lista = sugerenciasDe(currentScreen());
    requestAnimationFrame(colocarPanel);
    if (cont.dataset.pantalla === currentScreen() + '|' + lista.join('|')) return;
    cont.dataset.pantalla = currentScreen() + '|' + lista.join('|');
    cont.innerHTML = '';
    lista.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ayuda-layer__sugerencia';
      b.dataset.sugerencia = '';
      b.textContent = t;
      cont.appendChild(b);
    });
  }
  // Tocar una sugerencia = decírsela a Nidi (le llega como un turno de la persona) y verla en su bocadillo, como si la hubiera dicho.
  function agenteSugerencia(texto) {
    if (!(window.NidoAgente && window.NidoAgente.activa)) return;
    ultimoHablaPersona = Date.now();
    ayudaUsuario(texto);
    ayudaTexto('…');
    window.NidoAgente.decir(texto);
  }
  // Marca la hora de cada herramienta que usa Nidi: si una pantalla nueva la ha abierto ella, ya está hablando de ella y no hace falta pista.
  function conMarca(herr) {
    if (!herr) return herr;
    const out = {};
    Object.keys(herr).forEach((k) => { out[k] = (...a) => { ultimaAccionNidi = Date.now(); return herr[k](...a); }; });
    return out;
  }
  // Nidi proactiva: al llegar a una pantalla nueva (una vez por pantalla y conversación), si nadie habla en unos segundos, le cuenta en
  // una frase qué puede hacer ahí. No si la ha abierto Nidi (ya lo está contando), ni si la persona está hablando o Nidi está hablando.
  const PISTAS = {
    home: 'ver sus recuerdos o entrar en Álbumes, Personas o Yo',
    albumes: 'abrir un álbum o crear uno nuevo',
    'album-detalle': 'ver todas sus fotos, subir más o hacer un álbum con ellas',
    'album-nuevo': 'ver las fotos de este álbum y añadir más',
    'detalle-foto': 'charlar sobre la foto, hacer una felicitación con ella o pasarla a un álbum',
    personas: 'ver las fotos de cada persona y decirte quién es quién',
    'persona-fotos': 'ver sus fotos y vídeos, hacerle una felicitación o hacer un álbum con sus fotos',
    yo: 'ver sus felicitaciones, sus documentos y los ajustes',
    'felicitacion-estilo': 'elegir de qué es la felicitación, o pedirte que la hagas tú',
    'felicitacion-generada': 'enviarla con el botón Compartir o hacer otra',
    'mis-documentos': 'ver sus papeles guardados (horarios, tarjetas, entradas…) y pedirte que le leas algo de ellos',
  };
  // 12 s (25-sep; antes 5): la persona lee y decide despacio; con 5 s Nidi interrumpía a quien solo estaba mirando. Así solo habla si
  // de verdad parece perdida («la mascota aparece cuando alguien se queda bloqueado», CLAUDE.md §13) y gasta menos minutos.
  const PISTA_ESPERA_MS = 12000;
  // Qué le toca decir a Nidi en esta pantalla y con qué clave se recuerda que ya lo dijo. En una foto la clave es la propia foto: cada
  // foto nueva es un recuerdo nuevo del que charlar (25-sep: «falta la parte de preguntar por las personas y los momentos»).
  function pistaDe(p) {
    const avisoNidi = '[Aviso de la app, no lo ha dicho la persona] ';
    if (p === 'detalle-foto') {
      const f = fotoAbierta();
      if (!f) return null;
      if (f.origen === 'mis-documentos') {
        return { clave: 'doc|' + f.src, texto: avisoNidi + 'Lleva un rato mirando un papel de Mis documentos sin decir nada. Si no estabais con otra cosa, pregúntale si quiere que se lo leas o que busques algo en él (con ver_foto y su pregunta).' };
      }
      // Sin mirar la foto (25-sep, privacidad): la iniciativa de Nidi arranca con lo que sabe el móvil; la foto solo sale a la nube
      // (ver_foto) si la persona quiere que la mire. El texto se completa justo antes de enviarlo (agentePista), con quién sale y la fecha.
      return { clave: 'foto|' + f.src, foto: true };
    }
    if (/^persona-/.test(p)) {
      const api = window.PersonaSelect && window.PersonaSelect.agente;
      const ficha = api ? api.estado().ficha : null;
      if (ficha && ficha.real && !ficha.nombre) return null; // ahí ya le pregunta quién es (agenteAvisoFicha)
      if (ficha && ficha.nombre) return { clave: 'ficha|' + ficha.id, texto: avisoNidi + 'Lleva un rato en la ficha de «' + ficha.nombre + '» sin decir nada. Si no estabais con otra cosa, interésate por esa persona con cariño ' +
        '(qué tal está, qué recuerda con ella, cuándo la vio por última vez) con UNA pregunta, u ofrécele ver alguna foto suya o hacerle una felicitación.' };
    }
    if (!PISTAS[p]) return null;
    return { clave: p, texto: avisoNidi + 'Acaba de llegar a otra pantalla y lleva un rato sin decir nada. Si no estabais en mitad de otra cosa, cuéntale en una frase qué puede hacer aquí (' +
      PISTAS[p] + ') y ofrécele dos opciones concretas. Si ya se lo has contado antes, no lo repitas: pregúntale solo si necesita algo.' };
  }
  // Una foto que mira en silencio: Nidi empieza a charlar con lo que sabe el móvil (fecha y quién sale), sin mandar la foto a ningún sitio.
  async function avisoFoto(clave) {
    const api = window.PersonaSelect && window.PersonaSelect.agente;
    const info = api && api.infoFotoAbierta ? await api.infoFotoAbierta() : null;
    const f = fotoAbierta();
    if (!info || !f || 'foto|' + f.src !== clave || !(window.NidoAgente && window.NidoAgente.activa)) return; // ya ha pasado a otra
    const conNombre = info.personas.filter((x) => x.nombre).map((x) => x.nombre + ' (' + x.posicion + ')');
    const sin = info.personas.length - conNombre.length;
    const sabe = [info.fecha ? 'es ' + (info.tipo === 'vídeo' ? 'un vídeo' : 'una foto') + ' del ' + info.fecha : '',
      conNombre.length ? 'salen ' + conNombre.join(', ') : '', sin ? (sin === 1 ? 'hay 1 persona' : 'hay ' + sin + ' personas') + ' que Nido aún no sabe quién es' : ''].filter(Boolean).join('; ');
    window.NidoAgente.decir('[Aviso de la app, no lo ha dicho la persona] Lleva un rato mirando una foto en grande sin decir nada. Lo que sabe el móvil, sin mirarla: ' +
      (sabe || 'nada (no tiene fecha y no se reconoce a nadie)') + '. Si no estabais hablando de otra cosa, empieza a charlar con eso, como alguien de visita: una frase cálida y UNA pregunta sobre quién sale, dónde fue o qué recuerda de ese día. ' +
      'NO uses ver_foto por tu cuenta: la foto saldría del móvil. Úsala solo si ella te pide que la mires o pregunta algo que solo se sabe viéndola. Si ya habéis hablado de esta foto, no la repitas.');
  }
  function agentePista() {
    const p = currentScreen();
    const pista = pistaDe(p);
    if (!pista || pistasDadas.has(pista.clave) || Date.now() - ultimaAccionNidi < 4000) return;
    setTimeout(() => {
      if (!(window.NidoAgente && window.NidoAgente.activa) || currentScreen() !== p || agenteEstado !== 'escuchando') return;
      if (Date.now() - ultimoHablaPersona < PISTA_ESPERA_MS || Date.now() - ultimaAccionNidi < PISTA_ESPERA_MS) return;
      const ahora = pistaDe(p); // puede haber cambiado (otra foto, la ficha ya tiene nombre)
      if (!ahora || ahora.clave !== pista.clave || pistasDadas.has(ahora.clave)) return;
      pistasDadas.add(ahora.clave);
      if (ahora.foto) { avisoFoto(ahora.clave); return; }
      window.NidoAgente.decir(ahora.texto);
    }, PISTA_ESPERA_MS);
  }

  // Lo que el asistente sabe de la app en cada momento: solo esto, nunca las fotos.
  window.NidoAgenteContexto = (cuando) => {
    const pantalla = currentScreen();
    const api = window.PersonaSelect && window.PersonaSelect.agente;
    const est = api ? api.estado() : { ficha: null, personas: [], foto: null };
    // Los de la persona y los que pone Nido solo (por año o época) por separado; los dos se pueden cambiar (28-sep).
    const albumes = NidoAlbums.list.filter((a) => !a.auto).map((a) => a.name + ' (' + a.photos.length + ')');
    const automaticos = NidoAlbums.list.filter((a) => a.auto).map((a) => a.name + ' (' + a.photos.length + ')');
    const conNombre = est.personas.filter((p) => p.nombre).map((p) => p.nombre + ' (' + p.nFotos + ')');
    const sinNombre = est.personas.filter((p) => p.real && !p.nombre);
    let ficha = '';
    if (est.ficha) ficha = est.ficha.nombre ? ' Tiene abierta la ficha de «' + est.ficha.nombre + '» (' + est.ficha.nFotos + ' fotos).'
      : est.ficha.real ? ' Tiene abierta una ficha SIN NOMBRE (' + est.ficha.nFotos + ' fotos): si no lo has hecho ya, pregúntale quién es.' : '';
    // Sin «puedes mirarla con ver_foto» (25-sep): Nidi la miraba por su cuenta; solo se mira si la persona lo pide (privacidad).
    const foto = est.foto ? ' Tiene abierta en grande ' + (est.foto.tipo === 'vídeo' ? 'un vídeo' : 'una foto') + (est.foto.total > 1 ? ' (la ' + est.foto.posicion + ' de ' + est.foto.total + '; para pasar a otra, abrir_foto con direccion)' : '') + (est.foto.fecha ? ', del ' + est.foto.fecha : '') + '.' : '';
    // El álbum que tiene delante (o del que viene la foto abierta): gestionar_albumes lo usa como origen si no se dice otro.
    const alVista = albumALaVista();
    const album = alVista ? ' Está dentro del álbum «' + alVista.name + '» (' + alVista.photos.length + ')' + (alVista.auto ? ', que lo hizo Nido por fechas' : '') + '.' : '';
    // «Este álbum está vacío» es el texto de la pantalla recién creada: con fotos dentro, Nidi diría lo contrario de lo que se ve.
    const explica = pantalla === 'album-nuevo' && NidoAlbums.current && NidoAlbums.current.photos.length
      ? 'Estas son las fotos del álbum. Pulsa Añadir para meter más.' : explicacionDe(pantalla);
    return (cuando || 'Ahora') + ' la persona está en la pantalla «' + pantalla + '». ' + explica + ficha + album + foto +
      ' Personas que Nido conoce por su nombre: ' + (conNombre.join(', ') || 'ninguna todavía') + '.' +
      (sinNombre.length ? ' Fichas de personas SIN nombre: ' + sinNombre.length + '.' : '') +
      ' Álbumes creados por la persona: ' + (albumes.join(', ') || 'ninguno') + '.' +
      ' En Mis documentos (dentro de Yo) guarda fotos de papeles útiles: ' + (documentosEnPantalla().map((i) => i.alt).join(', ') || 'ninguno') + '.' +
      (automaticos.length ? ' Álbumes que hizo Nido por fechas (se pueden cambiar igual que los suyos: añadir, quitar, pasar fotos y renombrar): ' + automaticos.join(', ') + '.' : '');
  };

  // Cuando la persona abre la ficha de alguien que Nido no sabe quién es y Nidi está escuchando, Nidi se lo pregunta (una vez por ficha).
  const fichasPreguntadas = new Set();
  // Cuando es Nidi quien abre una ficha sin nombre (abrir_persona, agente-acciones.js), la respuesta de la herramienta ya le dice que
  // pregunte: la marca aquí para que este aviso no llegue además como otro turno 400 ms después (preguntaría dos veces).
  window.NidoAgenteFichaPreguntada = (id) => fichasPreguntadas.add(id);
  function agenteAvisoFicha() {
    const api = window.PersonaSelect && window.PersonaSelect.agente;
    if (!api || !window.NidoAgente || !window.NidoAgente.activa) return;
    const f = api.estado().ficha;
    if (!f || !f.real || f.nombre || fichasPreguntadas.has(f.id)) return;
    fichasPreguntadas.add(f.id);
    window.NidoAgente.decir('[Aviso de la app, no lo ha dicho la persona] Acaba de abrir la ficha de alguien que Nido todavía no sabe quién es (' + f.nFotos + ' fotos). Salúdala y pregúntale amablemente quién es.');
  }

  // ---- Lo que el asistente puede hacer con los álbumes (herramienta gestionar_albumes): crear, añadir fotos, pasarlas de un
  // álbum a otro, quitarlas de un álbum y renombrar ----
  // Devuelve siempre una frase corta y VERDADERA que el asistente le cuenta a la persona (y le sirve para saber si ha salido bien):
  // empieza por «Hecho:» solo si se ha hecho, con los números reales. Si falta algo, la frase dice qué preguntar.
  // Los álbumes automáticos (al.auto: por año, Navidad o verano, los pone Nido con NidoAlbums.upsert) no se tocan
  // a mano: upsert les vuelve a poner sus fotos cada vez que se cargan fotos o se reconoce a alguien, así que un cambio a mano
  // se perdería sin avisar. Se pueden usar como ORIGEN (se copian las fotos, sin quitarlas de allí), nunca como destino.

  // Filtra una lista de fotos ({src, tag, date?}) por lo que ha dicho la persona. Devuelve null si no se entiende ningún criterio:
  // antes «las fotos de la playa» o «de Pepe» (alguien sin ficha) no filtraban nada y devolvían TODAS, y un «pasa las fotos de
  // Pepe a Viaje» habría movido el álbum entero. Criterios: persona (por su nombre), año, Navidad, verano, vídeos, fotos, todas.
  function filtrarPorCriterio(lista, criterio) {
    const t = normV(criterio);
    if (!t) return null;
    let sel = lista.slice(), entendido = false;
    const ps = window.PersonaSelect;
    // personas nombradas en la frase: la foto tiene que salir en todas (si dice "Clara y Ana", en las que salen juntas)
    (ps ? ps.nombres() : []).forEach((n) => {
      const nn = normV(n), corto = nn.split(' ')[0];
      if (t.includes(nn) || (corto.length > 2 && new RegExp('\\b' + corto + '\\b').test(t))) {
        const propias = new Set(ps.fotosDePersona(ps.personIdByName(n)));
        sel = sel.filter((it) => propias.has(it.src));
        entendido = true;
      }
    });
    const anio = t.match(/\b(19|20)\d\d\b/);
    if (anio) { entendido = true; sel = sel.filter((it) => it.date && it.date.getFullYear() === Number(anio[0])); }
    if (/navidad/.test(t)) { entendido = true; sel = sel.filter((it) => { if (!it.date) return false; const m = it.date.getMonth() + 1, d = it.date.getDate(); return (m === 12 && d >= 15) || (m === 1 && d <= 6); }); }
    if (/verano/.test(t)) { entendido = true; sel = sel.filter((it) => { if (!it.date) return false; const m = it.date.getMonth() + 1, d = it.date.getDate(); return (m === 6 && d >= 21) || m === 7 || m === 8 || (m === 9 && d <= 22); }); }
    if (/\bvideos?\b/.test(t)) { entendido = true; sel = sel.filter((it) => it.tag === 'VIDEO'); }
    // «las fotos» = solo imágenes; «todas las fotos» y «estas fotos» = todo lo que hay (vídeos incluidos: así se habla)
    else if (/\bfotos?\b|\bimagen(es)?\b/.test(t) && !/\btod[oa]s?\b|\b(estas|esas|estos|esos)\b/.test(t)) { entendido = true; sel = sel.filter((it) => it.tag === 'IMG'); }
    if (/\btod[oa]s?\b|\b(estas|esas|estos|esos)\b|\beste album\b/.test(t)) entendido = true; // «todas», «estas fotos»: sin más filtro
    return entendido ? sel : null;
  }
  // Fotos de la biblioteca («Todas tus fotos») que encajan con el criterio; [] si no se entiende.
  function fotosPorCriterio(criterio) {
    const items = ((window.NidoGaleria && window.NidoGaleria.items) || []).filter((it) => it.src);
    return (filtrarPorCriterio(items, criterio) || []).map((it) => ({ src: it.src, tag: it.tag }));
  }
  // Dos direcciones de la misma foto: una puede venir relativa (fotos de ejemplo del HTML) y otra absoluta (el .src de un <img>).
  const srcAbs = (s) => { try { return new URL(s, location.href).href; } catch (e) { return s; } };
  const mismaSrc = (a, b) => srcAbs(a) === srcAbs(b);
  // «3 fotos»; si todo lo que se cuenta son vídeos, «3 vídeos» (la frase la oye la persona y tiene que ser verdad).
  const soloVideos = (lista) => !!(lista && lista.length && lista.every((f) => f.tag === 'VIDEO'));
  const nFotos = (n, lista) => n + (soloVideos(lista) ? (n === 1 ? ' vídeo' : ' vídeos') : (n === 1 ? ' foto' : ' fotos'));
  const concuerda = (raiz, n, lista) => raiz + (soloVideos(lista) ? 'o' : 'a') + (n === 1 ? '' : 's'); // «pasada», «quitados»…
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // Álbum por su nombre para añadir, quitar, renombrar o sacar fotos de él. Estricto, como buscarDestino: antes valía cualquier álbum
  // cuyo nombre estuviera DENTRO de lo dicho, y «Casa de verano» caía en «Casa», «Pueblo nuevo» vaciaba «Pueblo» y la frase empezaba
  // por «Hecho:». Vale el nombre exacto, o uno solo que lo contenga (primero entre los de la persona; si no, entre todos, para
  // encontrar también los que hace Nido por fechas). Si no hay uno claro, null: se dice que no existe y se da la lista.
  // «el álbum de la Playa», «mi álbum Viaje»: lo de delante del nombre no cuenta (así sigue valiendo el nombre exacto).
  const sinArticulo = (t) => t.replace(/^((el|la|los|las|mi|mis|album|de|del)\s+)+/, '');
  function buscarAlbum(nombre) {
    const t = sinArticulo(normV(nombre));
    if (!t) return albumALaVista(); // sin nombre («el álbum» a secas) = el que tiene delante; si no está en ninguno, null (NidoAlbums.current puede ser uno de antes)
    const exacto = NidoAlbums.list.find((al) => normV(al.name) === normV(nombre) || normV(al.name) === t);
    if (exacto) return exacto;
    const suyos = NidoAlbums.list.filter((al) => !al.auto && normV(al.name).includes(t));
    if (suyos.length) return suyos.length === 1 ? suyos[0] : null;
    const todos = NidoAlbums.list.filter((al) => normV(al.name).includes(t));
    return todos.length === 1 ? todos[0] : null;
  }
  // Destino de fotos: más estricto que buscarAlbum, porque meter fotos en el álbum equivocado sin preguntar es peor que preguntar.
  // Vale el nombre exacto, o uno solo de los álbumes de la persona que lo contenga («Navidad» → «Navidad en casa»). Un nombre más
  // largo que uno existente («Viaje 2025» con «Viaje» o con el automático «2025») es otro álbum: null, y Nidi pregunta si lo crea.
  function buscarDestino(nombre) {
    const t = sinArticulo(normV(nombre));
    if (!t) return null;
    const exacto = NidoAlbums.list.find((al) => normV(al.name) === normV(nombre) || normV(al.name) === t);
    if (exacto) return exacto;
    const parecidos = NidoAlbums.list.filter((al) => !al.auto && normV(al.name).includes(t));
    if (parecidos.length) return parecidos.length === 1 ? parecidos[0] : null;
    // Si no es uno suyo, uno solo de los de Nido («Navidad» → «Navidad 2025»); se pueden cambiar desde el 28-sep.
    const autos = NidoAlbums.list.filter((al) => al.auto && normV(al.name).includes(t));
    return autos.length === 1 ? autos[0] : null;
  }
  // Varios álbumes que encajan con lo dicho («Navidad» con «Navidad 2024» y «Navidad 2025»): se pregunta cuál en vez de ofrecer
  // crear uno nuevo (28-sep). Devuelve la frase o null si no hay dudas.
  function variosAlbumes(nombre) {
    const t = sinArticulo(normV(nombre));
    const hay = t ? NidoAlbums.list.filter((al) => normV(al.name).includes(t)) : [];
    return hay.length > 1 ? 'Hay varios álbumes que encajan: ' + hay.map((x) => '«' + x.name + '»').join(', ') + '. No he cambiado nada. Pregúntale a cuál.' : null;
  }
  // «Todas tus fotos» no es un álbum de la lista: es la galería del teléfono (pantalla album-detalle), se llena sola.
  const esTodasTusFotos = (nombre) => /\btodas (tus|mis|las) fotos\b|^todas$|\bgaleria\b|\bbiblioteca\b|\bcarrete\b/.test(normV(nombre));
  const listaAlbumes = () => NidoAlbums.list.map((x) => x.name).join(', ') || 'ninguno';

  // La foto que se ve ahora en «detalle-foto» (la misma cuenta que usa «Eliminar foto»: la tarjeta visible del carrusel) y la
  // pantalla de la que se abrió. null si no hay ninguna abierta.
  function fotoAbierta() {
    if (currentScreen() !== 'detalle-foto' || !detalleCards.length) return null;
    const i = Math.min(detalleCards.length - 1, Math.max(0, Math.round(detalleMedia.scrollLeft / detalleMedia.clientWidth)));
    const card = detalleCards[i];
    const el = card && card.querySelector('img, video');
    if (!el) return null;
    const scr = card.closest('.screen');
    return { src: el.src, tag: el.tagName, origen: scr ? scr.dataset.screen : null };
  }
  // El álbum creado que la persona tiene delante: dentro de él, o viendo en detalle una foto que se abrió desde él.
  function albumALaVista() {
    const pant = currentScreen();
    if (pant === 'album-nuevo') return NidoAlbums.current;
    if (pant === 'detalle-foto') { const f = fotoAbierta(); if (f && f.origen === 'album-nuevo') return NidoAlbums.current; }
    return null;
  }
  // En crear y añadir las fotos salen de la biblioteca, salvo «estas fotos» dicho dentro de un álbum: entonces son las de ese álbum.
  const origenDeEstas = (criterio) => (/\b(estas|esas|estos|esos)\b/.test(normV(criterio)) ? albumALaVista() : null);
  const esLaFotoAbierta = (t) => /\b(esta|este|esa|ese)\s+(foto|video|imagen)\b|\b(foto|video|imagen)\s+(abierta|abierto)\b|\bla que (estoy|estamos) viendo\b|^(esta|este|esa|ese)$/.test(t);

  // Qué fotos quiere decir la persona, sacadas del álbum `origen` si lo hay (o de toda la biblioteca). Devuelve { fotos } o { error }.
  function fotosElegidas(criterio, origen) {
    const t = normV(criterio);
    const cuales = 'Pregúntale cuáles: esta foto, las de una persona, de un año, de Navidad, de verano, los vídeos o todas.';
    if (!t) return { error: 'Falta saber qué fotos. ' + cuales };
    if (esLaFotoAbierta(t)) {
      const f = fotoAbierta();
      if (!f) return { error: 'Ahora no tiene ninguna foto abierta. Pregúntale qué fotos quiere decir, o que abra antes la foto.' };
      if (origen) {
        const p = origen.photos.find((x) => mismaSrc(x.src, f.src));
        return p ? { fotos: [p] } : { error: 'La foto que tiene abierta no está en el álbum «' + origen.name + '».' };
      }
      return { fotos: [{ src: f.src, tag: f.tag }] };
    }
    if (origen) {
      // Dentro de un álbum: sus fotos, filtradas con el criterio de siempre (la fecha se toma de la biblioteca).
      const items = ((window.NidoGaleria && window.NidoGaleria.items) || []);
      const conFecha = origen.photos.map((p) => { const it = items.find((x) => mismaSrc(x.src, p.src)); return { src: p.src, tag: p.tag, date: it ? it.date : null, ref: p }; });
      const sel = filtrarPorCriterio(conFecha, criterio);
      if (!sel) return { error: 'No sé qué fotos son «' + criterio + '». ' + cuales };
      return { fotos: sel.map((x) => x.ref) };
    }
    // Sin álbum de origen: «estas fotos» solo tiene sentido si se está viendo un grupo concreto de fotos.
    if (/\b(estas|esas|estos|esos)\b/.test(t) && !/\btod[oa]s?\b/.test(t)) {
      const pant = currentScreen(), ps = window.PersonaSelect;
      const ficha = ps && ps.agente ? ps.agente.estado().ficha : null;
      if (/^persona-/.test(pant) && ficha) {
        const items = ((window.NidoGaleria && window.NidoGaleria.items) || []);
        const fotos = ps.fotosDePersona(ficha.id).map((src) => { const it = items.find((x) => mismaSrc(x.src, src)); return { src, tag: it ? it.tag : 'IMG' }; });
        return { fotos };
      }
      if (pant !== 'album-detalle') return { error: 'No sé qué fotos son «estas» en esta pantalla. ' + cuales };
    }
    const sel = filtrarPorCriterio(((window.NidoGaleria && window.NidoGaleria.items) || []).filter((it) => it.src), criterio);
    if (!sel) return { error: 'No sé qué fotos son «' + criterio + '». ' + cuales };
    return { fotos: sel.map((it) => ({ src: it.src, tag: it.tag })) };
  }

  // Tras cambiar fotos de álbum: aviso visible con «Deshacer» (la persona ve lo que ha pasado y puede volver atrás sin pedirlo).
  function avisoConDeshacer(msg, albumes) {
    const copia = albumes.map((al) => [al, al.photos.slice()]);
    const deshacer = () => {
      copia.forEach(([al, fotos]) => { al.photos = fotos; albumSync(al); });
      if (currentScreen() === 'album-nuevo' && copia.some(([al]) => al === NidoAlbums.current)) albumRender();
    };
    setTimeout(() => nidoToast(currentScreen(), msg, 'Deshacer', deshacer, 7000), 700);
  }

  let ultimoResultadoAlbum = null;
  function gestionarAlbumes(p) {
    const r = gestionarAlbumesSinRegistro(p || {});
    ultimoResultadoAlbum = r;
    return r;
  }
  function gestionarAlbumesSinRegistro(p) {
    const accion = normV(p.accion), nombre = (p.nombre || '').trim(), nuevo = (p.nuevo_nombre || '').trim(), criterio = p.criterio || '';
    const origenTxt = (p.origen || '').trim();
    const crearSiNoExiste = p.crear_si_no_existe === true || p.crear_si_no_existe === 'true';
    const noEncuentro = (n) => (sinArticulo(normV(n)) ? 'No encuentro ningún álbum llamado «' + n + '».' : 'Falta saber qué álbum. Pregúntale cuál.') + ' Los que hay: ' + listaAlbumes() + '.';

    if (/crear|crea|nuevo/.test(accion)) {
      if (!nombre) return 'Falta el nombre del álbum. Pregúntale cómo quiere llamarlo.';
      if (buscarAlbum(nombre) && normV(buscarAlbum(nombre).name) === normV(nombre)) return 'Ya existe un álbum llamado «' + buscarAlbum(nombre).name + '». Pregúntale si quiere añadirle fotos u otro nombre.';
      // Con criterio, las fotos salen de la biblioteca (o, si dice «esta foto», de la que tiene abierta; si dice «estas fotos» dentro
      // de un álbum, de ese álbum).
      const el = criterio ? fotosElegidas(criterio, origenDeEstas(criterio)) : { fotos: [] };
      // Si no se entiende qué fotos quiere (o no hay foto abierta), no se crea nada: Nidi pregunta primero. Antes se creaba vacío,
      // se decía «Hecho» y el motivo que se daba podía ser falso.
      if (el.error) return el.error + ' Todavía no he creado el álbum.';
      const fotos = el.fotos;
      ayudaCerrar();
      const album = window.PersonaSelect.crearAlbum(cap1(nombre), fotos.map((f) => ({ src: f.src, tag: f.tag }))); // copias: no compartir fotos entre álbumes
      return 'Hecho: he creado el álbum «' + album.name + '» con ' + nFotos(fotos.length, fotos) + ' y ya lo tiene abierto.' +
        (criterio && !fotos.length ? ' No he encontrado fotos con ese criterio; está vacío y puede añadirlas con el botón Añadir.' : '');
    }

    // «pasa estas fotos a Viaje»: salen del álbum de origen (el que diga, o el que tiene delante) y entran en el destino.
    if (/\b(mover|mueve|pasar|pasa|trasladar|traslada|llevar|lleva|cambiar de album)\b/.test(accion)) {
      if (!nombre) return 'Falta el álbum al que quiere pasarlas. Pregúntale a cuál.';
      let origen = null;
      if (origenTxt) {
        if (!esTodasTusFotos(origenTxt)) { origen = buscarAlbum(origenTxt); if (!origen) return noEncuentro(origenTxt); }
      } else origen = albumALaVista();
      if (esTodasTusFotos(nombre)) return '«Todas tus fotos» son todas las fotos que hay en Nido: ya están ahí. Para sacarlas de un álbum, usa la acción quitar.';
      let destino = buscarDestino(nombre);
      if (destino && origen === destino) return 'Ya están en «' + destino.name + '». Pregúntale a qué otro álbum quiere pasarlas.';
      if (origen && !origen.photos.length) return 'El álbum «' + origen.name + '» está vacío. No he cambiado nada.';
      const el = fotosElegidas(criterio, origen);
      if (el.error) return el.error;
      if (!el.fotos.length) return 'No he encontrado ' + (origen ? 'en «' + origen.name + '» ' : '') + 'fotos con ese criterio. No he cambiado nada.';
      let creado = false;
      if (!destino) {
        // No se crea un álbum sin preguntar: Nidi pregunta y, si dice que sí, repite con crear_si_no_existe=true.
        if (!crearSiNoExiste && variosAlbumes(nombre)) return variosAlbumes(nombre);
        if (!crearSiNoExiste) return 'No hay ningún álbum llamado «' + nombre + '». Pregúntale si quiere que lo cree; si dice que sí, repite con crear_si_no_existe=true. Los que hay: ' + listaAlbumes() + '.';
        destino = NidoAlbums.create(cap1(nombre));
        creado = true;
      }
      const n = el.fotos.length;
      const nuevas = el.fotos.filter((f) => !destino.photos.some((x) => mismaSrc(x.src, f.src)));
      const yaEstaban = n - nuevas.length;
      // Del origen solo se quitan si es un álbum de la persona: de uno automático (por fecha: la foto sigue siendo de ese año) o de
      // «Todas tus fotos» se copian.
      const quitaDelOrigen = !!origen && !origen.auto;
      if (!quitaDelOrigen && !nuevas.length) return (n === 1 ? 'Ya estaba' : 'Ya estaban') + ' en «' + destino.name + '». No he cambiado nada.';
      avisoConDeshacer(quitaDelOrigen ? nFotos(n, el.fotos) + ' ' + concuerda('pasad', n, el.fotos) + ' a «' + destino.name + '»'
        : nFotos(nuevas.length, nuevas) + ' ' + concuerda('añadid', nuevas.length, nuevas) + ' a «' + destino.name + '»', quitaDelOrigen ? [destino, origen] : [destino]);
      destino.photos.push(...nuevas.map((f) => ({ src: f.src, tag: f.tag })));
      if (quitaDelOrigen) {
        const fuera = new Set(el.fotos);
        origen.photos = origen.photos.filter((x) => !fuera.has(x));
        albumSync(origen);
      }
      albumSync(destino);
      ayudaCerrar();
      NidoAlbums.open(destino.id); // la persona ve dónde han quedado
      const extra = yaEstaban ? ' (' + (yaEstaban === 1 ? '1 ya estaba' : yaEstaban + ' ya estaban') + ' en «' + destino.name + '»)' : '';
      const creadoTxt = creado ? 'he creado el álbum «' + destino.name + '» y ' : '';
      if (quitaDelOrigen) {
        return 'Hecho: ' + creadoTxt + 'he pasado ' + nFotos(n, el.fotos) + ' de «' + origen.name + '» a «' + destino.name + '»' + extra + '. Ahora «' + origen.name + '» tiene ' + nFotos(origen.photos.length) +
          ' y «' + destino.name + '» tiene ' + nFotos(destino.photos.length) + '. Ya lo tiene abierto.';
      }
      const deDonde = origen ? 'del álbum «' + origen.name + '», que lo hace Nido por fechas: allí siguen también' : 'de «Todas tus fotos», donde siguen también';
      return 'Hecho: ' + creadoTxt + 'he puesto ' + nFotos(nuevas.length, nuevas) + ' en «' + destino.name + '»' + extra + '. ' + (soloVideos(nuevas) ? (nuevas.length === 1 ? 'Lo' : 'Los') : (nuevas.length === 1 ? 'La' : 'Las')) + ' he copiado ' + deDonde + '. «' + destino.name + '» tiene ahora ' + nFotos(destino.photos.length) + '. Ya lo tiene abierto.';
    }

    // «quita esta foto del álbum»: sale del álbum, pero la foto sigue en el teléfono («Todas tus fotos»). No se borra nada.
    if (/\b(quitar|quita|sacar|saca|retirar|retira)\b/.test(accion)) {
      if (nombre && esTodasTusFotos(nombre)) return '«Todas tus fotos» son todas las fotos que hay en Nido y desde aquí no se quitan fotos de ella. Para borrar una foto, que la abra y pulse Eliminar.';
      const al = nombre ? buscarAlbum(nombre) : albumALaVista();
      if (!al) return nombre ? noEncuentro(nombre) : 'No sé de qué álbum quiere quitarlas. Pregúntale cuál. Los que hay: ' + listaAlbumes() + '.';
      if (!al.photos.length) return 'El álbum «' + al.name + '» ya está vacío. No he quitado nada.';
      const el = fotosElegidas(criterio, al);
      if (el.error) return el.error;
      if (!el.fotos.length) return 'No he encontrado en «' + al.name + '» fotos con ese criterio. No he quitado nada.';
      const fuera = new Set(el.fotos);
      const vista = albumALaVista() === al;
      avisoConDeshacer(nFotos(el.fotos.length, el.fotos) + ' ' + concuerda('quitad', el.fotos.length, el.fotos) + ' de «' + al.name + '»', [al]);
      al.photos = al.photos.filter((x) => !fuera.has(x));
      albumSync(al);
      ayudaCerrar();
      if (vista) NidoAlbums.open(al.id); // desde el detalle de una foto que ya no está en el álbum, se vuelve al álbum
      return 'Hecho: he quitado ' + nFotos(el.fotos.length, el.fotos) + ' del álbum «' + al.name + '», que ahora tiene ' + nFotos(al.photos.length) +
        '. No he borrado ' + (soloVideos(el.fotos) ? 'ninguno' : 'ninguna') + ': ' + (el.fotos.length === 1 ? 'sigue' : 'siguen') + ' en «Todas tus fotos».';
    }

    if (/anadir|agregar|meter|poner/.test(accion)) {
      const al = buscarAlbum(nombre);
      if (!al) return variosAlbumes(nombre) || noEncuentro(nombre);
      const el = fotosElegidas(criterio, origenDeEstas(criterio));
      if (el.error) return el.error;
      const fotos = el.fotos.filter((f) => !al.photos.some((x) => mismaSrc(x.src, f.src)));
      if (!fotos.length) return el.fotos.length ? 'Esas fotos ya estaban en «' + al.name + '». No he añadido nada.' : 'No he encontrado fotos nuevas con ese criterio para añadir a «' + al.name + '».';
      al.photos.push(...fotos.map((f) => ({ src: f.src, tag: f.tag })));
      albumSync(al);
      NidoAlbums.current = al;
      ayudaCerrar();
      NidoAlbums.open(al.id);
      return 'Hecho: he añadido ' + nFotos(fotos.length, fotos) + ' a «' + al.name + '», que ya tiene ' + al.photos.length + '.';
    }
    if (/renombrar|cambiar|llamar/.test(accion)) {
      const al = buscarAlbum(nombre);
      if (!al) return noEncuentro(nombre);
      if (!nuevo) return 'Falta el nombre nuevo. Pregúntale cómo quiere llamarlo.';
      // Dos álbumes con el mismo nombre no se podrían distinguir hablando (y uno automático taparía al suyo): se pregunta otro nombre.
      const otro = NidoAlbums.list.find((x) => x !== al && normV(x.name) === normV(nuevo));
      if (otro) return 'Ya hay un álbum llamado «' + otro.name + '». No he cambiado nada. Pregúntale otro nombre.';
      const antes = al.name;
      al.name = cap1(nuevo);
      if (al.auto) al.renombrado = true; // Nido ya no le vuelve a poner el suyo
      albumesLists().forEach((list) => {
        const c = list.querySelector('[data-album-id="' + al.id + '"] .album-stack__caption');
        if (c) c.firstChild.textContent = '\n                ' + al.name + '\n                ';
      });
      if (NidoAlbums.current === al) albumRender();
      return 'Hecho: «' + antes + '» ahora se llama «' + al.name + '».';
    }
    return 'No sé hacer «' + p.accion + '» con álbumes. Puedo crear uno, añadirle fotos, pasar fotos de un álbum a otro, quitarlas de un álbum o cambiarle el nombre.';
  }
  window.NidoAlbumAcciones = { gestionar: gestionarAlbumes };

  // ---- Entender lo que se dice ----
  const normV = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zñ0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const PANTALLAS_VOZ = [
    [/\b(album|albumes)\b/, 'albumes'], [/\b(personas|gente|familia)\b/, 'personas'], [/\bdocumentos?\b/, 'mis-documentos'],
    [/\b(ajustes|cuenta|configuracion)\b/, 'ajustes'], [/\b(yo|perfil)\b/, 'yo'], [/\b(inicio|casa|home|principio|pantalla principal)\b/, 'home'],
  ];

  // Devuelve true si entendió algo y lo hizo. Orden de prioridad: persona > álbum concreto > crear > felicitación > pantalla.
  function ayudaEntender(dicho) {
    const t = normV(dicho);
    const nav = (pantalla) => { ayudaCerrar(); showScreen(pantalla); return true; };

    // «vuelve atrás» / «la pantalla de antes»: pulsa el «Volver» que se ve, el mismo que tocaría la persona.
    if (/\b(atras|pantalla de antes)\b|^(vuelve|volver|regresa)$/.test(t)) {
      ayudaCerrar();
      const volver = botonVolverVisible();
      if (!volver) { ultimoResultadoAlbum = 'En esta pantalla no hay botón de volver. Pregúntale adónde quiere ir (el inicio, Álbumes, Personas, Yo).'; return true; }
      volver.click();
      return true;
    }

    // "pasa estas fotos al álbum Viaje" / "mueve esta foto a Navidad en casa" / "quita esta foto del álbum": va antes que
    // "llamado X" (si no, "pásala al álbum llamado Viaje" crearía un álbum) y antes que "abre el álbum X" (lo nombra también).
    // Sin conexión no hay Nidi que pregunte: si algo falta, se dice en el bocadillo la primera frase del resultado (el hecho),
    // no la instrucción para Nidi que va detrás.
    const hazConAlbum = (p) => {
      const r = gestionarAlbumes(p);
      if (!/^Hecho:/.test(r) && !(window.NidoAgente && window.NidoAgente.activa)) ayudaTexto(r.replace(/\.\s.*$/, '.')); // sin lookbehind: Safari antiguo no lo entiende y no cargaría app.js
      return true;
    };
    const cualesDicho = /\b(esta|este|esa|ese)\s+(foto|video|imagen)\b|\b(pasala|pasalo|muevela|muevelo|quitala|quitalo|sacala|sacalo)\b/.test(t) ? 'esta foto'
      : /\b(estas|esas|estos|esos)\b/.test(t) ? 'estas fotos' : '';
    const mover = (dicho || '').match(/\b(?:pasa|p[aá]sal[ao]s?|mueve|mu[eé]vel[ao]s?|lleva|ll[eé]val[ao]s?)\b.*?\b(?:al|a mi|en el|a)\s+(?:[aá]lbum\s+)?(?:(?:llamado|llamada|de nombre)\s+)?(.+?)[.!?]*$/i);
    if (mover && cualesDicho && (/\balbum\b/.test(t) || buscarDestino(mover[1]))) return hazConAlbum({ accion: 'mover', nombre: mover[1].replace(/^[aá]lbum\s+/i, ''), criterio: cualesDicho });
    if (/\b(quita|quitala|quitalo|saca|sacala|sacalo)\b.*\balbum\b/.test(t) && cualesDicho) {
      const de = (dicho || '').match(/\bdel\s+[aá]lbum\s+(?:de\s+)?(.+?)[.!?]*$/i); // "del álbum Viaje"; "del álbum" a secas = el que tiene delante
      return hazConAlbum({ accion: 'quitar', nombre: de ? de[1] : '', criterio: cualesDicho });
    }

    // "crea un álbum llamado Vacaciones" → se crea ya con ese nombre (no se vuelve a preguntar)
    const conNombre = (dicho || '').match(/[aá]lbum.*?\b(?:llamado|llamada|que se llame|de nombre|se llama)\s+(.+?)[.!?]*$/i); // del texto original: así conserva tildes y ñ
    if (conNombre) {
      // "…llamado Vacaciones con las fotos de Clara" → nombre «Vacaciones», criterio «las fotos de Clara»
      let nombre = conNombre[1], criterio = '';
      const partido = nombre.match(/^(.+?)\s+(?:con|que tenga|que incluya|y (?:a[ñn]ade|mete|pon))\s+(.+)$/i);
      if (partido) { nombre = partido[1]; criterio = partido[2]; }
      gestionarAlbumes({ accion: 'crear', nombre, criterio });
      return true;
    }

    // "enséñame las fotos de Clara" / "fotos de mi nieta Ainhoa" / "busca a Clara"
    const persona = window.PersonaSelect && window.PersonaSelect.personIdByName(t);
    if (persona) {
      ayudaCerrar(); NidoNav.returnTo(currentScreen()); window.PersonaSelect.openPerson(persona);
      // «las fotos de Clara», «todas las fotos de Clara»: su cuadrícula completa (pantalla Imágenes); «sus vídeos»: la de vídeos.
      if (/\bvideos?\b/.test(t)) setTimeout(() => showScreen('persona-videos'), 350);
      else if (/\b(tod[oa]s|fotos?|imagenes)\b/.test(t)) setTimeout(() => showScreen('persona-imagenes'), 350);
      return true;
    }

    // "abre el álbum Vacaciones en Venecia" (álbumes creados) / "todas mis fotos"
    const creado = NidoAlbums.list.find((al) => t.includes(normV(al.name)));
    if (creado) { ayudaCerrar(); NidoAlbums.open(creado.id); return true; }
    if (/\b(todas|todos)\b.*\b(fotos|imagenes)\b|\bmis fotos\b/.test(t)) return nav('album-detalle');

    // "crea un álbum" / "quiero un álbum nuevo"
    if (/\b(crea|crear|nuevo|nueva|hacer|haz)\b.*\balbum\b|\balbum\b.*\b(nuevo|nueva)\b/.test(t)) {
      // Con Nidi hablando no se abre la pregunta de siempre («¿Cómo quieres llamar a tu nuevo álbum? Toca en el micrófono…»): pediría
      // tocar OTRO micrófono en mitad de la conversación. Nidi pregunta el nombre y lo crea con gestionar_albumes.
      if (nidiHablando()) {
        ultimoResultadoAlbum = 'Todavía no he creado nada: falta el nombre. Pregúntale cómo quiere llamar el álbum (y si quiere meter ya algunas fotos) y créalo con gestionar_albumes, accion=crear.';
        return true;
      }
      ayudaCerrar();
      showScreen('albumes');
      setTimeout(() => { const b = document.querySelector('[data-screen="albumes"] [data-album-action="nuevo"]'); if (b) b.click(); }, 600);
      return true;
    }
    // "hazme una felicitación"
    // «el horario del bus», «mi DNI»: el papel de Mis documentos (sin esperar: aquí no hay quien lea luego)
    const doc = documentoDe(t);
    if (doc) { abrirDocumento(doc); return true; }
    // «mis felicitaciones» → Yo, donde están guardadas
    if (/\bmis felicitaciones\b/.test(t)) return nav('yo');
    // «vuelve a la felicitación» / «enséñame la de antes»: la última hecha, sin repetirla (25-sep: se salió sin querer y hubo que
    // empezar de nuevo). Va antes que «felicitación» a secas, que abre la pantalla para hacer una.
    if (/felicitacion/.test(t) && /\b(ultima|de antes|hecha|hemos hecho|has hecho|otra vez|vuelve|volver|volvamos|regresa|ensename|ver)\b/.test(t) && !/\b(hazme|haz|crea|crear|nueva|distinta)\b/.test(t)) {
      const api = window.PersonaSelect && window.PersonaSelect.agente;
      const f = api && api.abrirUltimaFelicitacion ? (ayudaCerrar(), api.abrirUltimaFelicitacion()) : null;
      ultimoResultadoAlbum = f ? 'Hecho: he vuelto a abrir la felicitación «' + f.titulo + '». Para enviarla, que pulse «Compartir».'
        : 'Todavía no se ha hecho ninguna felicitación. Pregúntale si quiere que hagáis una.';
      return true;
    }
    // «hazme una felicitación»: con una foto abierta, con esa; si no, que elija la foto (antes cogía la primera de la biblioteca).
    if (/felicitacion|felicitar/.test(t)) {
      ayudaCerrar();
      if (currentScreen() === 'detalle-foto') { window.PersonaSelect.openFelicitacionDesdeFoto(); showScreen('felicitacion-estilo'); }
      else abrirElegirFotoFelicitacion();
      return true;
    }

    const hit = PANTALLAS_VOZ.find(([re]) => re.test(t));
    return hit ? nav(hit[1]) : false;
  }

  window.NidoAyuda = { entender: (t) => ayudaEntender(t) }; // para pruebas y para otros módulos

  // El «Volver» que de verdad ve la persona en la pantalla activa. En la foto en grande hay tres: el de abajo y dos dentro de capas
  // ocultas (crear felicitación, eliminar foto) que siguen en el DOM con opacidad 0; antes se pulsaba el primero, que no hacía nada.
  function botonVolverVisible() {
    const scr = document.querySelector('.screen.is-active');
    if (!scr) return null;
    const seVe = (el) => {
      for (let n = el; n && n !== scr.parentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || (n !== el && cs.pointerEvents === 'none' && +cs.opacity < 1)) return false;
        if (n.hidden) return false;
      }
      return true;
    };
    const todos = Array.from(scr.querySelectorAll('button, [data-nav]')).filter((b) => /^volver$/i.test((b.innerText || b.textContent || '').trim()) && seVe(b));
    return todos.find((b) => b.closest('.bottom-action-row') || b.classList.contains('bottom-action')) || todos[0] || null;
  }

  // ---- Mis documentos (Yo): fotos de papeles útiles (25-sep) ----
  // Nidi decía «la app no sirve para eso» cuando le preguntaban el horario del autobús, que está aquí. Ahora sabe qué papeles hay
  // (NidoAgenteContexto) y abre el que se pida por su nombre o por lo que es («el bus», «el DNI»); para leer un dato, ver_foto.
  const DOCUMENTOS_VOZ = [
    [/\b(bus|autobus|autobuses|guagua|linea 2[134])\b/, 'Horario de autobús'],
    [/\b(mapa|plano|paradas?|estaciones)\b/, 'Mapa del tranvía'], // antes que el horario: «el mapa del tranvía» es el mapa
    [/\b(tranvia|tranvias|tram|tren|trenes|l4|linea 4|luceros)\b/, 'Horario del tranvía'],
    [/\b(dni|carne de identidad|carnet de identidad|documento de identidad)\b/, 'DNI'],
    [/\beuropea\b/, 'Tarjeta sanitaria europea'],
    [/\b(tarjeta sanitaria|tarjeta del medico|tarjeta de la seguridad social|sip)\b/, 'Tarjeta sanitaria'],
    [/\bcartel\b/, 'Cartel de fiestas'],
    [/\b(entrada|entradas|espectaculo)\b/, 'Entrada de espectáculo'],
  ];
  const documentosEnPantalla = () => {
    const vistos = new Set();
    return Array.from(document.querySelectorAll('[data-screen="mis-documentos"] .photo-card img'))
      .filter((i) => i.alt && !vistos.has(i.alt) && vistos.add(i.alt));
  };
  // Qué documento pide la frase: por su nombre exacto («Horario del tranvía») o por lo que es. null si no habla de un papel.
  function documentoDe(t) {
    const docs = documentosEnPantalla();
    const exacto = docs.find((i) => t.includes(normV(i.alt)));
    if (exacto) return exacto;
    if (!/\b(horario|horarios|hora|documento|documentos|papel|papeles|dni|carne|carnet|tarjeta|cartel|entrada|entradas|bus|autobus|tren|guagua|tranvia|tram|mapa|plano|paradas?)\b/.test(t)) return null;
    const hit = DOCUMENTOS_VOZ.find(([re]) => re.test(t));
    return hit ? docs.find((i) => i.alt === hit[1]) || null : null;
  }
  // Abre el documento en grande (lo mismo que tocarlo en Mis documentos) y espera a que esté abierto, para que un ver_foto justo después lo encuentre.
  async function abrirDocumento(img) {
    ayudaCerrar();
    showScreen('mis-documentos');
    await new Promise((ok) => setTimeout(ok, 500));
    img.closest('.photo-card').click();
    for (let i = 0; i < 30 && currentScreen() !== 'detalle-foto'; i++) await new Promise((ok) => setTimeout(ok, 50));
    return currentScreen() === 'detalle-foto';
  }

  function ayudaHablar(btn) {
    if (window.NidoAgente && navigator.onLine) {
      if (window.NidoAgente.activa) { agenteTerminar(); ayudaReset(); return; }
      nidiHaDicho = false;
      pistasDadas.clear();
      ayudaEstadoBoton('conectando');
      window.NidoAgente.start({
        contexto: () => window.NidoAgenteContexto('Al empezar,'),
        // La herramienta del agente: reutiliza el mismo entendimiento de órdenes que el modo sin conexión.
        abrir: async (pedido) => {
          ultimaAccionNidi = Date.now();
          const t = normV(pedido);
          if (/\bmis documentos\b/.test(t)) { ayudaCerrar(); showScreen('mis-documentos'); return 'Hecho: he abierto Mis documentos. Tiene: ' + documentosEnPantalla().map((i) => i.alt).join(', ') + '.'; }
          const doc = documentoDe(t);
          if (doc) {
            const ok = await abrirDocumento(doc);
            return ok ? 'Hecho: he abierto «' + doc.alt + '» de Mis documentos, en grande. Si quiere saber algo de él (por ejemplo a qué hora pasa), léelo con ver_foto pasando su pregunta.'
              : 'He ido a Mis documentos pero no he podido abrir «' + doc.alt + '». Dile que lo toque ella.';
          }
          ultimoResultadoAlbum = null;
          const antes = currentScreen();
          const ok = ayudaEntender(pedido);
          if (ultimoResultadoAlbum) return ultimoResultadoAlbum;
          if (!ok) return 'No he encontrado eso en la app.';
          // Se comprueba que la pantalla ha cambiado de verdad (25-sep: «atrás» decía «Hecho» y seguía en la misma).
          for (let i = 0; i < 24 && currentScreen() === antes; i++) await new Promise((r) => setTimeout(r, 50));
          return currentScreen() !== antes ? 'Hecho: ahora está en la pantalla «' + currentScreen() + '».'
            : 'Hecho: ya está en esa pantalla («' + antes + '»). Si esperaba otra cosa, pregúntale adónde quiere ir.';
        },
        gestionar: (p) => { ultimaAccionNidi = Date.now(); return gestionarAlbumes(p); },
        // personas, ver fotos, señalar botones…: js/agente-acciones.js
        herramientas: conMarca(window.NidoAgenteAcciones && window.NidoAgenteAcciones.crear({
          avisar: (m, ms) => nidoToast(currentScreen(), m, null, null, ms || 3000),
          cerrarAyuda: ayudaCerrar,
        })),
        mensaje: (t) => { nidiHaDicho = true; ayudaTexto(t.replace(/\[[^\]]*\]\s*/g, '')); },
        // Los avisos que manda la propia app (NidoAgente.decir, «[Aviso de la app…]») pueden volver como si los hubiera dicho la persona:
        // no se enseñan en su bocadillo.
        usuario: (t) => { if (t && !/^\s*\[Aviso de la app/.test(t)) { ultimoHablaPersona = Date.now(); ayudaUsuario(t); ayudaTexto('…'); } },
        estado: (e) => {
          ayudaEstadoBoton(e);
          if (e === 'cerrado') {
            agenteTerminar();
            if (ayudaBuild().classList.contains('is-visible') && !ayudaBuild().classList.contains('ayuda-layer--respuesta')) ayudaTexto('Hemos dejado de hablar. Toca el micrófono cuando quieras volver a empezar.');
          }
          agentePastilla();
        },
      }).catch((e) => {
        ayudaEstadoBoton('cerrado');
        // El navegador ha negado el micrófono: el reconocimiento de Safari fallaría igual, así que se explica cómo darle permiso.
        if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) { ayudaTexto('Safari no me deja usar el micrófono. Toca «aA» arriba → Ajustes del sitio web → Micrófono → Permitir.'); return; }
        ayudaHablarNavegador(btn); // sin acceso al asistente (sin conexión, etc.): la escucha de siempre
      });
      return;
    }
    ayudaHablarNavegador(btn);
  }

  function ayudaHablarNavegador(btn) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { ayudaTexto('Tu navegador no me deja escucharte. Pulsa Cancelar y usa los botones, ¡estoy aquí!'); return; }
    if (ayudaRec) { try { ayudaRec.abort(); } catch (e) {} }
    ayudaRec = new SR();
    ayudaRec.lang = 'es-ES';
    ayudaRec.interimResults = true; // se ve lo que va entendiendo mientras se habla
    ayudaRec.maxAlternatives = 3;
    let oyo = false;
    ayudaEstadoBoton('escuchando');
    ayudaRec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      const dicho = r[0].transcript;
      if (!r.isFinal) { ayudaUsuario(dicho); ayudaTexto('…'); return; } // se ve lo que va entendiendo mientras se habla
      oyo = true;
      ayudaUsuario(dicho);
      // "¿Qué significa esto?" / "explícame esta pantalla": explica la pantalla en la que está.
      if (/explic|significa|que es esto|para que sirve|donde estoy|que hago/.test(normV(dicho))) {
        ayudaTexto(explicacionDe(currentScreen()).replace(/^Está eligiendo/, 'Estás eligiendo') || 'Estás en una pantalla de Nido. Si te pierdes, dime «llévame al inicio».');
        return;
      }
      // Se prueba con las alternativas que da el navegador por si la primera no es la que encaja.
      const ok = Array.from(r).some((alt) => ayudaEntender(alt.transcript));
      if (!ok) ayudaTexto('Eso todavía no sé hacerlo. Prueba con «fotos de Clara», «mis álbumes» o «crea un álbum».');
    };
    ayudaRec.onerror = (e) => {
      oyo = true;
      const msg = { 'not-allowed': 'No puedo usar el micrófono. Revisa sus permisos.', 'service-not-allowed': 'Activa el dictado en los ajustes del teléfono.',
        'no-speech': 'No he oído nada. Toca el micrófono y dímelo otra vez.', 'audio-capture': 'No encuentro el micrófono.', 'network': 'Sin conexión no puedo escucharte bien.' }[e.error];
      ayudaTexto(msg || 'No he podido escucharte. Toca el micrófono para intentarlo otra vez.');
    };
    ayudaRec.onend = () => { ayudaEstadoBoton('cerrado'); if (!oyo) ayudaTexto('No he oído nada. Toca el micrófono y dímelo otra vez.'); };
    try { ayudaRec.start(); } catch (e) { ayudaEstadoBoton('cerrado'); ayudaTexto('No he podido escucharte. Toca el micrófono para intentarlo otra vez.'); }
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-help]')) {
      // Con Nidi hablando, el pollito abre su panel TAL CUAL está (lo último que ha dicho, el turno y las sugerencias): antes lo
      // reiniciaba como si no hubiera conversación, con el micrófono parado aunque Nidi seguía escuchando.
      if (!(window.NidoAgente && window.NidoAgente.activa)) ayudaReset();
      ayudaModoNidi();
      ayudaBuild().classList.add('is-visible');
      agentePastilla();
      return;
    }
    const sug = event.target.closest('[data-sugerencia]');
    if (sug) { agenteSugerencia(sug.textContent.trim()); return; }
    if (event.target.closest('[data-agente="terminar"]')) { agenteTerminar(); return; }
    const opt = event.target.closest('[data-ayuda]');
    if (!opt) return;
    const a = opt.dataset.ayuda;
    if (a === 'cerrar') { agenteTerminar(); ayudaCerrar(); }
    else if (a === 'ver') ayudaCerrar(); // «Ver pantalla»: se cierra el panel y la conversación sigue (queda la pastilla de arriba)
    else if (a === 'hablar') ayudaHablar(opt);
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-onboarding-layer-next]')) {
      // Capa de varios pasos (Yo): avanza al siguiente grupo y, en el último, se cierra con su propio botón.
      const layer = event.target.closest('[data-onboarding-layer]');
      const next = Number(layer.dataset.step) + 1;
      const target = layer.querySelector('[data-layer-step="' + next + '"]');
      if (target) {
        layer.dataset.step = String(next);
        layer.querySelectorAll('[data-layer-step]').forEach((g) => { g.hidden = g !== target; });
        window.Mascota.enterOnboardingPollito(target);
        layer.querySelector('.onboarding-cta').toggleAttribute('data-onboarding-layer-close', !layer.querySelector('[data-layer-step="' + (next + 1) + '"]'));
        layer.querySelector('.onboarding-cta').toggleAttribute('data-onboarding-layer-next', !!layer.querySelector('[data-layer-step="' + (next + 1) + '"]'));
      }
      return;
    }
    if (event.target.closest('[data-onboarding-layer-close]')) {
      const layer = event.target.closest('[data-onboarding-layer]');
      layer.classList.remove('is-visible');
      window.Mascota.exitOnboardingPollito(layer);
      return;
    }
    if (event.target.closest('[data-detalle-onboarding-next]')) {
      const layer = document.querySelector('[data-detalle-onboarding]');
      if (layer.dataset.step === '1') showDetalleOnboardingStep(layer, 2);
      else closeDetalleOnboarding();
      return;
    }
    if (isTransitioning) return; // evita dobles toques mientras cambia de pantalla

    // Tocar cualquier foto/vídeo abre la pantalla de detalle con ese mismo contenido.
    const card = event.target.closest('.photo-card');
    const navTarget = event.target.closest('[data-nav], [data-onboarding-next]');

    if (!card && !navTarget) return;

    let destination;
    let pressable;

    if (card) {
      destination = 'detalle-foto';
      pressable = card;
      cameFrom = currentScreen();
      const grupo = card.closest('[data-grupo-fotos]');
      if (grupo) {
        // Un grupo de personas (28-sep): primero la pantalla con TODAS sus fotos; el detalle, desde ahí.
        abrirGrupo(grupo);
        return;
      }
      openDetalle(card);
    } else {
      destination = navTarget.dataset.nav || navTarget.dataset.onboardingNext;
      // La primera vez que se abre Álbumes desde cualquier sitio, antes va su
      // onboarding (757:4368); "Siguiente" ya entra a Álbumes de verdad.
      if (destination === 'albumes' && !albumesOnboardingSeen && currentScreen() !== 'onboarding-albumes') {
        albumesOnboardingSeen = true;
        destination = 'onboarding-albumes';
      }
      pressable = event.target.closest('.btn, .album-card, .avatar') || navTarget;
      if (destination === 'back') destination = cameFrom;
      // "Ver recuerdos de esta persona" se abre desde el detalle de una foto;
      // "Volver" vuelve a donde estaba el usuario antes de ese detalle (no al
      // detalle, que si no ping-pongea con "Volver" del propio detalle).
      if (destination === 'persona-fotos') {
        if (currentScreen() !== 'detalle-foto') personaReturn = currentScreen();
        else if (cameFrom !== 'persona-fotos') personaReturn = cameFrom;
      }
      if (destination === 'persona-back') destination = personaReturn;
      if (destination === 'felicitacion-back') destination = window.felicitacionOrigin === 'yo' ? 'yo' : 'detalle-foto';
      if (destination === 'select-back') {
        if (selectTarget === 'felicitacion') destination = pressable.hasAttribute('data-select-add') ? 'felicitacion-estilo' : (eligiendoDeRecuerdo ? 'detalle-foto' : 'yo');
        else destination = selectTarget === 'nuevo' ? 'album-nuevo' : 'album-detalle';
      }
      // Volver desde las cuadrículas de Imágenes/Vídeos a la ficha de la persona, sin tocar a dónde vuelve ésta.
      if (destination === 'persona-fotos-keep') destination = 'persona-fotos';
    }

    isTransitioning = true;
    pressable.classList.add('is-pressed');

    setTimeout(() => {
      pressable.classList.remove('is-pressed');
      showScreen(destination);
      // Se libera un poco después de que la transición de pantalla termine.
      setTimeout(() => {
        isTransitioning = false;
      }, 500);
    }, PRESS_DELAY_MS);
  });
})();
