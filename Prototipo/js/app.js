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
  var galeriaPropia = false;   // la persona ha elegido sus propias fotos: la biblioteca de ejemplo ya no se carga
  var bibliotecaCargada = false;
  let albumesOnboardingSeen = false; // el tour de Álbumes solo sale la primera vez (se reinicia al recargar)
  let personaReturn = 'home'; // pantalla a la que vuelve "persona-fotos" (la que había antes de abrir el detalle)

  function currentScreen() {
    const active = document.querySelector('.screen.is-active');
    return active ? active.dataset.screen : 'home';
  }

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
    if (window.NidoAgente && window.NidoAgente.activa && window.NidoAgenteContexto) setTimeout(() => window.NidoAgente.contexto(window.NidoAgenteContexto('Ahora')), 400);
    screens.forEach((screen) => {
      const willBeActive = screen.dataset.screen === name;
      const wasActive = screen.classList.contains('is-active');
      screen.classList.toggle('is-active', willBeActive);

      if (screen.classList.contains('screen--onboarding')) {
        // Cada tutorial lleva una copia del recuerdo en vídeo: solo se reproduce el de la pantalla que se ve.
        screen.querySelectorAll('video').forEach((v) => { if (willBeActive) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); });
        if (willBeActive && !wasActive) window.Mascota.enterOnboardingPollito(screen);
        if (!willBeActive && wasActive) window.Mascota.exitOnboardingPollito(screen);
      }

      if (screen.classList.contains('screen--pre-registro')) {
        if (willBeActive && !wasActive) enterPreRegistro(screen);
        if (!willBeActive && wasActive) exitPreRegistro(screen);
      }

      if (willBeActive && !wasActive && name === 'yo' && !yoOnboardingSeen) {
        yoOnboardingSeen = true;
        const layer = screen.querySelector('[data-onboarding-layer]');
        layer.classList.add('is-visible');
        window.Mascota.enterOnboardingPollito(layer);
      }
      if (willBeActive && !wasActive && name === 'home' && window.NidoBiblioteca) window.NidoBiblioteca.cargar();
      if (willBeActive && !wasActive && name === 'personas' && !personasOnboardingSeen) {
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
      }
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
  // Pre-registro: el vídeo ya trae el logo y el pollito integrados desde
  // su primer frame, así que solo hay que reproducirlo al entrar (se
  // repite cada vez, útil para testear sin recargar) y pararlo al salir.
  // Al terminar, se desenfoca y desvanece, y pasa sola al flujo de
  // registro — ya no hay botón "Siguiente" ni pantalla en blanco de por
  // medio, era un provisional de antes de tener las pantallas reales.
  // ---------------------------------------------------------------
  const PRE_REGISTRO_FADE_MS = 550; // debe coincidir con la transition del CSS

  let preRegistroRespaldo = false;
  function enterPreRegistro(screen) {
    const video = screen.querySelector('[data-pre-registro-video]');
    if (!video) return;
    video.classList.remove('is-ending');
    video.currentTime = 0;
    const p = video.play();
    if (p && p.catch) p.catch(() => {}); // si no lo deja, entra el respaldo animado (abajo)
    if (!preRegistroRespaldo) {
      preRegistroRespaldo = true;
      const activa = () => document.querySelector('.screen.is-active')?.dataset.screen === 'pre-registro';
      videoConRespaldo(video, { activa, animacion: 'assets/video/pollito-fotos.webp', ms: 3000,
        fin: (img) => { img.classList.add('is-ending'); setTimeout(() => showScreen('registro-1'), PRE_REGISTRO_FADE_MS); } });
    }
  }

  function exitPreRegistro(screen) {
    const video = screen.querySelector('[data-pre-registro-video]');
    if (video) video.pause();
  }

  const preRegistroVideo = document.querySelector('[data-pre-registro-video]');
  if (preRegistroVideo) {
    preRegistroVideo.addEventListener('ended', () => {
      if (document.querySelector('.screen.is-active')?.dataset.screen !== 'pre-registro') return;
      preRegistroVideo.classList.add('is-ending');
      setTimeout(() => showScreen('registro-1'), PRE_REGISTRO_FADE_MS);
    });
  }

  // ---------------------------------------------------------------
  // Galería de la pantalla de detalle: todas las fotos de la pantalla
  // de origen, deslizable, arrancando en la que se ha tocado.
  // ---------------------------------------------------------------
  const detalleMedia = document.getElementById('detalle-foto-media');

  let detalleCards = []; // tarjetas de la pantalla de origen, en el mismo orden que la galería del detalle

  function openDetalle(clickedCard) {
    const originScreen = document.querySelector('.screen.is-active');
    const cards = Array.from(originScreen.querySelectorAll('.photo-card'));
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

      if (clone.tagName === 'IMG') window.PersonaSelect.buildHotspots(item, clone);
    });

    // Arranca ya en la foto tocada, sin animación de scroll de por medio.
    detalleMedia.scrollLeft = startIndex * detalleMedia.clientWidth;
    detalleVideoVisible();

    // Primera vez que se abre una foto: onboarding de la pantalla (765:5320).
    if (!detalleOnboardingSeen) {
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
    detalleMedia.querySelectorAll('.detail-media__item video').forEach((v, idx) => {
      if (idx === i) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      else { v.pause(); v.currentTime = 0; }
    });
  }
  detalleMedia.addEventListener('scroll', () => {
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
  function videoConRespaldo(video, opts) {
    let sonando = false, respaldo = false;
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
    pon();
    setTimeout(pon, 300);
    setTimeout(() => {
      if (sonando || !opts.activa()) return;
      respaldo = true;
      const img = document.createElement('img');
      img.className = video.className;
      img.alt = '';
      img.src = opts.animacion + '?t=' + Date.now(); // el parámetro hace que empiece de cero
      video.style.display = 'none';
      video.after(img);
      setTimeout(() => { if (opts.activa()) opts.fin(img); }, opts.ms);
    }, 1200);
  }

  // ---------------------------------------------------------------
  // Bienvenida: el vídeo del pollito naciendo se ve una sola vez, sin botón
  // — al terminar, pasa solo a la pantalla de pre-registro.
  // ---------------------------------------------------------------
  const bienvenidaVideo = document.querySelector('[data-bienvenida-video]');
  if (bienvenidaVideo) {
    // Solo si sigue en bienvenida: con un deep-link (#pantalla) el vídeo se reproduce
    // igualmente por debajo y, al acabar, arrastraba a otra pantalla (bug de la sesión 3).
    const enBienvenida = () => document.querySelector('.screen.is-active')?.dataset.screen === 'bienvenida';
    bienvenidaVideo.addEventListener('ended', () => { if (enBienvenida()) showScreen('pre-registro'); });
    videoConRespaldo(bienvenidaVideo, { activa: enBienvenida, animacion: 'assets/video/pollito-huevo.webp', ms: 5300, fin: () => showScreen('pre-registro') });
  }

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
  const REGISTRO_NIDI_MS = 3500; // el saludo de Nidi no tiene botón: pasa solo (o al tocar)
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
    registroNidiTimer = setTimeout(() => showScreen('registro-4'), REGISTRO_NIDI_MS);
  }

  function enterRegistroSplash(screen) {
    clearTimeout(registroSplashTimer);
    // Tras el loader arranca el tour de onboarding (rediseño de la sesión 5).
    registroSplashTimer = setTimeout(() => showScreen('onboarding-1'), 1800);
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

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-registro-resend]')) return;
    const screen = event.target.closest('.screen');
    registroCode = '';
    renderRegistroCode(screen);
    const modal = screen.querySelector('[data-registro-modal]');
    if (modal) modal.classList.remove('is-visible');
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
      const scrolled = content.scrollTop > 4;
      icon.src = scrolled
        ? 'assets/icons/icon-arrow-narrow-up-blue.svg'
        : 'assets/icons/icon-arrow-narrow-down-blue.svg';
      toggleBtn.setAttribute('aria-label', scrolled ? 'Volver arriba' : 'Bajar');
    }
    content.addEventListener('scroll', updateState);

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
  document.querySelectorAll('[data-select-grid]').forEach((grid) => {
    grid.addEventListener('click', (event) => {
      const cell = event.target.closest('.photo-card');
      if (!cell) return;
      event.stopImmediatePropagation();
      event.preventDefault();
      cell.classList.toggle('is-selected');
    }, true);
  });

  // ---------------------------------------------------------------
  // Álbumes creados por la persona: cada uno tiene su nombre, sus fotos y su tarjeta en "Mis álbumes";
  // una sola pantalla (`album-nuevo`, 746:3458) se rellena con el que se abra. Crear otro álbum añade uno
  // más, nunca sustituye a los anteriores.
  // ---------------------------------------------------------------
  const NidoAlbums = { list: [], current: null, seq: 0 };
  window.NidoAlbums = NidoAlbums;

  const albumesLists = () => document.querySelectorAll('[data-screen="albumes"] .albumes-list');

  function albumSync(album) {
    const n = album.photos.length;
    albumesLists().forEach((list) => {
      const stack = list.querySelector('[data-album-id="' + album.id + '"]');
      if (!stack) return;
      stack.querySelector('.album-stack__meta').textContent = n + (n === 1 ? ' foto' : ' fotos');
      const portada = album.photos.find((p) => p.tag === 'IMG'); // portada = 1ª foto (nunca un vídeo: no se puede pintar como imagen)
      if (portada) stack.querySelector('.album-stack__front > img').src = portada.src;
    });
  }

  function albumRender() {
    const album = NidoAlbums.current;
    if (!album) return;
    const screen = document.querySelector('[data-screen="album-nuevo"]');
    screen.querySelector('[data-album-title]').textContent = album.name;
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
      if (p.tag === 'VIDEO') { el.muted = true; el.playsInline = true; el.preload = 'metadata'; }
      else el.alt = '';
      card.appendChild(el);
      grid.appendChild(card);
    });
  }

  // opts.auto: álbum generado por Nido (por año, época o persona): va justo detrás de "Todas tus fotos", no delante.
  NidoAlbums.create = (name, opts) => {
    const o = opts || {};
    const album = { id: 'a' + (++NidoAlbums.seq), name, photos: o.photos || [], key: o.key || null, auto: !!o.auto };
    NidoAlbums.list.push(album);
    albumesLists().forEach((list) => {
      const base = list.querySelector('.album-stack:not([data-album-id])') || list.querySelector('.album-stack');
      const stack = base.cloneNode(true);
      stack.dataset.albumId = album.id;
      const front = stack.querySelector('.album-stack__front');
      front.removeAttribute('data-nav');
      front.dataset.albumOpen = album.id;
      front.querySelector('.album-stack__caption').firstChild.textContent = '\n                ' + name + '\n                ';
      if (album.auto && base.matches(':not([data-album-id])')) base.after(stack); else list.prepend(stack);
    });
    albumSync(album);
    return album;
  };

  // Crea o actualiza un álbum automático por clave (p. ej. "anio:2025", "navidad:2025", "persona:r1abc").
  NidoAlbums.upsert = (key, name, photos) => {
    let album = NidoAlbums.list.find((x) => x.key === key);
    if (!album) return NidoAlbums.create(name, { key, auto: true, photos });
    album.photos = photos;
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
  document.addEventListener('click', (event) => {
    const src = event.target.closest('[data-select-target]');
    if (src) {
      selectTarget = src.dataset.selectTarget;
      document.querySelectorAll('[data-select-grid] .is-selected').forEach((c) => c.classList.remove('is-selected'));
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
    const hit = event.target.closest('.onboarding-highlight, .onboarding-tooltip, .onboarding-pollito, .onboarding-caption, .onboarding-glow-title');
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
    if (event.target.closest('[data-pick-gallery]')) galleryInput.click(); // debe ir dentro del toque
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
        if (f.nidoPoster) { el.src = url; el.poster = f.nidoPoster; el.preload = 'none'; }
        else { el.src = url + '#t=0.001'; el.preload = 'metadata'; }
        el.muted = true; el.loop = true; el.playsInline = true; el.setAttribute('playsinline', '');
      } else { el.src = url; el.alt = ''; el.decoding = 'async'; }
      return el;
    });
  }

  // Si cierra el selector sin elegir nada: no es un error, se queda con las fotos de ejemplo y se le dice.
  galleryInput.addEventListener('cancel', () => {
    setTimeout(() => nidoToast(currentScreen(), 'Sin problema: de momento verás fotos de ejemplo.', null, null, 5000), 600);
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

  async function cargarGaleria(files) {
    files = files.filter((f) => /^(image|video)\//.test(f.type)).slice(0, MAX_GALLERY);
    if (!files.length) return;
    // Más recientes primero.
    const fechas = await Promise.all(files.map(fotoFecha));
    const orden = files.map((f, i) => ({ f, d: fechas[i] })).sort((x, y) => y.d - x.d);
    files = orden.map((o) => o.f);

    // Home: el carrusel conserva sus títulos, cambia la foto de cada tarjeta.
    const homeCards = document.querySelectorAll('[data-screen="home"] .carousel .photo-card');
    const captions = Array.from(homeCards).map((c) => c.querySelector('.photo-card__caption span').textContent);
    const carousel = document.querySelector('[data-screen="home"] [data-carousel]');
    const template = homeCards[0];
    // El recuerdo de ejemplo en vídeo ("Un día especial") que ya traía Home se conserva: es de los que se ven moverse.
    const vEj = carousel.querySelector('video');
    const ejemplo = vEj ? vEj.closest('.photo-card').cloneNode(true) : null;
    carousel.innerHTML = '';
    // "Mis recuerdos": hasta 4 vídeos y las fotos más recientes, alternados (vídeo, foto, vídeo, foto…).
    const todos = galleryMedia(files);
    const vids = todos.filter((m) => m.tagName === 'VIDEO').slice(0, 4);
    const fots = todos.filter((m) => m.tagName === 'IMG');
    const recuerdos = [];
    for (let i = 0; recuerdos.length < 8 && (i < vids.length || i < fots.length); i++) {
      if (vids[i]) recuerdos.push(vids[i]);
      if (fots[i] && recuerdos.length < 8) recuerdos.push(fots[i]);
    }
    recuerdos.slice(0, 8).forEach((media, i) => {
      const card = template.cloneNode(false);
      card.className = 'photo-card photo-card--tall';
      card.appendChild(media);
      card.insertAdjacentHTML('beforeend', '<div class="photo-card__gradient"></div><div class="photo-card__caption"><span>' +
        captions[i % captions.length] + '</span><img src="assets/icons/icon-chevron-right.svg" alt="" /></div>');
      carousel.appendChild(card);
    });
    if (ejemplo) { // vuelve en 2.ª posición y es el único que se reproduce solo (varios vídeos a la vez son demasiado para un iPhone)
      carousel.insertBefore(ejemplo, carousel.children[1] || null);
      const ev = ejemplo.querySelector('video');
      if (ev) { const p = ev.play(); if (p && p.catch) p.catch(() => {}); }
    }
    carousel.scrollLeft = 0;

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
    galleryMedia(files).forEach((media) => {
      const cell = document.createElement('button');
      cell.className = 'photo-card is-selectable';
      cell.appendChild(media);
      cell.insertAdjacentHTML('beforeend', '<span class="select-overlay"><img src="assets/icons/icon-check-circle.svg" alt="" /></span>');
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
        if (portada) { todas.querySelector('.album-stack__front > img').src = portada.src; todas.querySelector('.album-stack__back img').src = (items.find((it) => it.tag === 'IMG' && it !== portada) || portada).src; }
      }
      stacks.slice(1).forEach((s) => s.remove());
    });
    window.NidoGaleria = { items }; // foto/vídeo, dirección y fecha: el asistente arma álbumes por año, época o persona con esto
    albumesAutomaticos(items);
    window.dispatchEvent(new CustomEvent('nido:gallery')); // persona.js busca de nuevo a las personas conocidas
  }

  galleryInput.addEventListener('change', async () => {
    const files = Array.from(galleryInput.files || []);
    if (files.length) galeriaPropia = true;
    await cargarGaleria(files);
    galleryInput.value = '';
  });

  // Biblioteca de ejemplo (assets/biblioteca.json): fotos y vídeos reales con su fecha, para que la app enseñe algo de verdad
  // sin pedir nada. Entra por el mismo camino que la galería del teléfono (fechas, álbumes automáticos, reconocimiento).
  // Se carga al llegar a Home y solo si la persona no ha elegido las suyas.
  async function cargarBiblioteca() {
    if (bibliotecaCargada || galeriaPropia) return;
    bibliotecaCargada = true;
    try {
      const lista = await (await fetch('assets/biblioteca.json')).json();
      const files = await Promise.all(lista.map(async (m) => {
        const b = await (await fetch(m.src)).blob();
        const f = new File([b], m.src.split('/').pop(), { type: b.type || (m.tipo === 'video' ? 'video/mp4' : 'image/jpeg'), lastModified: new Date(m.fecha).getTime() });
        if (m.poster) f.nidoPoster = m.poster;
        return f;
      }));
      // Personas de la biblioteca (nombre + huellas de cara): así "Clara nieta", "Carlos hijo"... salen con nombre desde el principio.
      try { if (window.Reconocimiento) window.Reconocimiento.sembrar(await (await fetch('assets/biblioteca-personas.json')).json()); } catch (e) { /* sin nombres: salen "Sin nombre" */ }
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
    'persona-videos': 'Todos los vídeos de esta persona.',
    yo: 'Aquí tienes tus documentos, tus felicitaciones y los ajustes.',
    'mis-documentos': 'Aquí están las fotos con documentos o información útil.',
    ajustes: 'Aquí puedes cambiar tu teléfono, ver los términos o cerrar la sesión.',
    'felicitacion-estilo': 'Elige el tipo de felicitación y pulsa Continuar.',
    'felicitacion-generada': 'Esta es tu felicitación. Puedes compartirla.',
  };
  const AYUDA_SALUDO = '¡Hola! Toca al micrófono y dime en qué necesitas ayuda.';
  let ayudaLayer = null;
  let ayudaRec = null;

  function ayudaBuild() {
    if (ayudaLayer) return ayudaLayer;
    ayudaLayer = document.createElement('div');
    ayudaLayer.className = 'ayuda-layer';
    ayudaLayer.innerHTML =
      '<div class="onboarding-overlay"></div>' +
      '<p class="ayuda-layer__bubble ayuda-layer__bubble--tu" data-ayuda-tu hidden></p>' +
      '<p class="ayuda-layer__bubble ayuda-layer__bubble--nidi" data-ayuda-texto></p>' +
      '<img class="ayuda-layer__pollito" src="assets/img/pollito-pregunta-nombre.webp" alt="" />' +
      '<button class="ayuda-layer__mic" data-ayuda="hablar" aria-label="Hablar"><img src="assets/icons/mic-escuchar.svg" alt="" /></button>' +
      '<button class="btn btn--type2 btn--horizontal btn--lg ayuda-layer__close" data-ayuda="cerrar"><span data-ayuda-cerrar-texto>Cancelar</span></button>';
    screens[0].parentElement.appendChild(ayudaLayer);
    return ayudaLayer;
  }

  // El micrófono avisa a quién le toca: late cuando escucha (habla tú) y se atenúa mientras habla Nidi.
  let ayudaLento = null;
  function ayudaEstadoBoton(estado) {
    const layer = ayudaBuild();
    const mic = layer.querySelector('[data-ayuda="hablar"]');
    mic.classList.toggle('is-listening', estado === 'escuchando');
    mic.classList.toggle('is-nidi', estado === 'hablando' || estado === 'conectando');
    if (estado === 'escuchando' && !layer.classList.contains('ayuda-layer--respuesta')) ayudaTexto('Te escucho. Dime qué necesitas.');
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
  }
  function ayudaReset() {
    const layer = ayudaBuild();
    layer.classList.remove('ayuda-layer--respuesta');
    layer.querySelector('[data-ayuda-tu]').hidden = true;
    layer.querySelector('[data-ayuda-cerrar-texto]').textContent = 'Cancelar';
    ayudaEstadoBoton('cerrado');
    ayudaTexto(AYUDA_SALUDO);
  }

  function ayudaTexto(t) { ayudaBuild().querySelector('[data-ayuda-texto]').textContent = t; }

  function ayudaCerrar() {
    if (ayudaRec) { try { ayudaRec.abort(); } catch (e) {} ayudaRec = null; }
    ayudaBuild().classList.remove('is-visible');
    agentePastilla(); // si la conversación sigue, queda una pastilla para poder terminarla
  }

  // ---- Conversación de voz con el asistente (ElevenLabs, js/agente.js) ----
  let agentePill = null;
  function agentePastilla() {
    const on = window.NidoAgente && window.NidoAgente.activa;
    if (!agentePill) {
      if (!on) return;
      agentePill = document.createElement('button');
      agentePill.className = 'agente-pill';
      agentePill.dataset.agente = 'terminar';
      agentePill.innerHTML = '<span class="agente-pill__dot"></span>Nidi te escucha · Toca para terminar';
      screens[0].parentElement.appendChild(agentePill);
    }
    agentePill.classList.toggle('is-visible', !!on && !ayudaBuild().classList.contains('is-visible'));
  }
  function agenteTerminar() {
    if (window.NidoAgente) window.NidoAgente.stop();
    if (agentePill) agentePill.classList.remove('is-visible');
    ayudaEstadoBoton('cerrado');
  }

  // Lo que el asistente sabe de la app en cada momento: solo esto, nunca las fotos.
  window.NidoAgenteContexto = (cuando) => {
    const pantalla = currentScreen();
    const personas = window.PersonaSelect ? window.PersonaSelect.nombres() : [];
    const albumes = NidoAlbums.list.map((a) => a.name);
    return (cuando || 'Ahora') + ' la persona está en la pantalla «' + pantalla + '». ' + (AYUDA_TEXTOS[pantalla] || '') +
      ' Personas que Nido conoce: ' + (personas.join(', ') || 'ninguna todavía') + '.' +
      ' Álbumes creados por la persona: ' + (albumes.join(', ') || 'ninguno') + '.' +
      ' Puedes mover la app con la herramienta abrir_en_la_app (por ejemplo «fotos de Clara», «mis álbumes», «felicitación», «inicio»). ' +
      'Para CREAR un álbum, AÑADIRLE fotos o CAMBIARLE el nombre usa la herramienta gestionar_albumes (acciones: crear, anadir, renombrar; criterio: persona, año, «navidad», «verano», «vídeos» o «todas»). ' +
      'Después de usarla, di solo lo que has abierto. Si el nombre no está en la lista, no lo intentes: pregunta.';
  };

  // ---- Lo que el asistente puede hacer con los álbumes (herramienta gestionar_albumes): crear, añadir fotos y renombrar ----
  // Devuelve siempre una frase corta que el asistente le cuenta a la persona (y le sirve para saber si ha salido bien).
  function fotosPorCriterio(criterio) {
    const t = normV(criterio);
    let sel = ((window.NidoGaleria && window.NidoGaleria.items) || []).filter((it) => it.src);
    if (!t) return [];
    const ps = window.PersonaSelect;
    // personas nombradas en la frase: la foto tiene que salir en todas (si dice "Clara y Ana", en las que salen juntas)
    (ps ? ps.nombres() : []).forEach((n) => {
      const nn = normV(n), corto = nn.split(' ')[0];
      if (t.includes(nn) || (corto.length > 2 && new RegExp('\\b' + corto + '\\b').test(t))) {
        const propias = new Set(ps.fotosDePersona(ps.personIdByName(n)));
        sel = sel.filter((it) => propias.has(it.src));
      }
    });
    const anio = t.match(/\b(19|20)\d\d\b/);
    if (anio) sel = sel.filter((it) => it.date.getFullYear() === Number(anio[0]));
    if (/navidad/.test(t)) sel = sel.filter((it) => { const m = it.date.getMonth() + 1, d = it.date.getDate(); return (m === 12 && d >= 15) || (m === 1 && d <= 6); });
    if (/verano/.test(t)) sel = sel.filter((it) => { const m = it.date.getMonth() + 1, d = it.date.getDate(); return (m === 6 && d >= 21) || m === 7 || m === 8 || (m === 9 && d <= 22); });
    if (/\bvideos?\b/.test(t)) sel = sel.filter((it) => it.tag === 'VIDEO');
    else if (/\bfotos?\b|\bimagenes\b/.test(t) && !/\btodas\b/.test(t)) sel = sel.filter((it) => it.tag === 'IMG');
    return sel.map((it) => ({ src: it.src, tag: it.tag }));
  }
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function buscarAlbum(nombre) {
    const t = normV(nombre);
    if (!t) return NidoAlbums.current || null;
    return NidoAlbums.list.find((al) => normV(al.name) === t) || NidoAlbums.list.find((al) => normV(al.name).includes(t) || t.includes(normV(al.name))) || null;
  }
  let ultimoResultadoAlbum = null;
  function gestionarAlbumes(p) {
    const r = gestionarAlbumesSinRegistro(p);
    ultimoResultadoAlbum = r;
    return r;
  }
  function gestionarAlbumesSinRegistro(p) {
    const accion = normV(p.accion), nombre = (p.nombre || '').trim(), nuevo = (p.nuevo_nombre || '').trim(), criterio = p.criterio || '';
    if (/crear|crea|nuevo/.test(accion)) {
      if (!nombre) return 'Falta el nombre del álbum. Pregúntale cómo quiere llamarlo.';
      if (buscarAlbum(nombre) && normV(buscarAlbum(nombre).name) === normV(nombre)) return 'Ya existe un álbum llamado «' + buscarAlbum(nombre).name + '». Pregúntale si quiere añadirle fotos u otro nombre.';
      const fotos = fotosPorCriterio(criterio);
      ayudaCerrar();
      const album = window.PersonaSelect.crearAlbum(cap1(nombre), fotos);
      return 'Hecho: he creado el álbum «' + album.name + '» con ' + fotos.length + (fotos.length === 1 ? ' foto' : ' fotos') + ' y ya lo tiene abierto.' +
        (criterio && !fotos.length ? ' No he encontrado fotos con ese criterio; está vacío y puede añadirlas con el botón Añadir.' : '');
    }
    if (/anadir|agregar|meter|poner/.test(accion)) {
      const al = buscarAlbum(nombre);
      if (!al) return 'No encuentro ningún álbum llamado «' + nombre + '». Los que hay: ' + (NidoAlbums.list.map((x) => x.name).join(', ') || 'ninguno') + '.';
      const fotos = fotosPorCriterio(criterio).filter((f) => !al.photos.some((x) => x.src === f.src));
      if (!fotos.length) return 'No he encontrado fotos nuevas con ese criterio para añadir a «' + al.name + '».';
      al.photos.push(...fotos);
      albumSync(al);
      NidoAlbums.current = al;
      ayudaCerrar();
      NidoAlbums.open(al.id);
      return 'Hecho: he añadido ' + fotos.length + (fotos.length === 1 ? ' foto' : ' fotos') + ' a «' + al.name + '», que ya tiene ' + al.photos.length + '.';
    }
    if (/renombrar|cambiar|llamar/.test(accion)) {
      const al = buscarAlbum(nombre);
      if (!al) return 'No encuentro ningún álbum llamado «' + nombre + '». Los que hay: ' + (NidoAlbums.list.map((x) => x.name).join(', ') || 'ninguno') + '.';
      if (al.auto) return 'El álbum «' + al.name + '» lo pone Nido solo y no se puede renombrar.';
      if (!nuevo) return 'Falta el nombre nuevo. Pregúntale cómo quiere llamarlo.';
      const antes = al.name;
      al.name = cap1(nuevo);
      albumesLists().forEach((list) => {
        const c = list.querySelector('[data-album-id="' + al.id + '"] .album-stack__caption');
        if (c) c.firstChild.textContent = '\n                ' + al.name + '\n                ';
      });
      if (NidoAlbums.current === al) albumRender();
      return 'Hecho: «' + antes + '» ahora se llama «' + al.name + '».';
    }
    return 'No sé hacer «' + p.accion + '» con álbumes. Puedo crear uno, añadirle fotos o cambiarle el nombre.';
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
    if (persona) { ayudaCerrar(); NidoNav.returnTo(currentScreen()); window.PersonaSelect.openPerson(persona); return true; }

    // "abre el álbum Vacaciones en Venecia" (álbumes creados) / "todas mis fotos"
    const creado = NidoAlbums.list.find((al) => t.includes(normV(al.name)));
    if (creado) { ayudaCerrar(); NidoAlbums.open(creado.id); return true; }
    if (/\b(todas|todos)\b.*\b(fotos|imagenes)\b|\bmis fotos\b/.test(t)) return nav('album-detalle');

    // "crea un álbum" / "quiero un álbum nuevo"
    if (/\b(crea|crear|nuevo|nueva|hacer|haz)\b.*\balbum\b|\balbum\b.*\b(nuevo|nueva)\b/.test(t)) {
      ayudaCerrar();
      showScreen('albumes');
      setTimeout(() => { const b = document.querySelector('[data-screen="albumes"] [data-album-action="nuevo"]'); if (b) b.click(); }, 600);
      return true;
    }
    // "hazme una felicitación"
    if (/felicitacion|felicitar/.test(t)) { ayudaCerrar(); window.PersonaSelect.openFelicitacionDesdeYo(); showScreen('felicitacion-estilo'); return true; }

    const hit = PANTALLAS_VOZ.find(([re]) => re.test(t));
    return hit ? nav(hit[1]) : false;
  }

  window.NidoAyuda = { entender: (t) => ayudaEntender(t) }; // para pruebas y para otros módulos

  function ayudaHablar(btn) {
    if (window.NidoAgente && navigator.onLine) {
      if (window.NidoAgente.activa) { agenteTerminar(); ayudaReset(); return; }
      ayudaEstadoBoton('conectando');
      window.NidoAgente.start({
        contexto: () => window.NidoAgenteContexto('Al empezar,'),
        // La herramienta del agente: reutiliza el mismo entendimiento de órdenes que el modo sin conexión.
        abrir: (pedido) => { ultimoResultadoAlbum = null; const ok = ayudaEntender(pedido); return ultimoResultadoAlbum || (ok ? 'Hecho: he abierto lo que pedía.' : 'No he encontrado eso en la app.'); },
        gestionar: (p) => gestionarAlbumes(p),
        mensaje: (t) => ayudaTexto(t.replace(/\[[^\]]*\]\s*/g, '')),
        usuario: (t) => { if (t) { ayudaUsuario(t); ayudaTexto('…'); } },
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
        ayudaTexto(AYUDA_TEXTOS[currentScreen()] || 'Estás en una pantalla de Nido. Si te pierdes, dime «llévame al inicio».');
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
      ayudaReset();
      ayudaBuild().classList.add('is-visible');
      return;
    }
    if (event.target.closest('[data-agente="terminar"]')) { agenteTerminar(); return; }
    const opt = event.target.closest('[data-ayuda]');
    if (!opt) return;
    const a = opt.dataset.ayuda;
    if (a === 'cerrar') { agenteTerminar(); ayudaCerrar(); }
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
      if (destination === 'select-back') destination = selectTarget === 'nuevo' ? 'album-nuevo' : 'album-detalle';
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
