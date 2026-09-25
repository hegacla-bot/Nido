// Nido · lo que Nidi (el asistente de voz) puede HACER en la app: las herramientas cliente del agente de ElevenLabs.
//
// El agente decide; esta capa ejecuta y le devuelve siempre una frase corta y verdadera («Guardado…», «No conozco a…»)
// que él le cuenta a la persona. Nada de esto se ejecuta sin que el agente lo pida durante una conversación.
//
// Herramientas (los nombres y parámetros están descritos para pegar en ElevenLabs en agente/HERRAMIENTAS.md):
//   ver_contexto        · dónde está la persona, qué ficha/foto tiene abierta, a quién conoce Nido, qué álbumes hay
//   abrir_persona       · abre la ficha de alguien por su nombre, o la primera que no tiene nombre
//   nombrar_persona     · guarda al momento el nombre en la ficha abierta (con «Deshacer»); se corrige llamando otra vez; deshacer=true lo quita
//   ver_foto            · «mira» la foto abierta y la describe (solo esa foto, reducida y sin metadatos)
//   abrir_foto          · abre la foto N de la pantalla actual
//   senalar             · marca en la pantalla un botón (por su texto) para guiar a la persona con un «pulsa el que brilla»
//   crear_felicitacion  · hace una felicitación entera (cumpleaños, aniversario, Navidad, Año Nuevo) con la foto abierta o con una
//                         buena foto de quien diga; espera al resultado y marca «Compartir» (compartir lo tiene que pulsar la persona)
//   subir_fotos         · lleva a «Todas tus fotos», pone y hace brillar «Elegir fotos» y devuelve los pasos para guiarla; al terminar
//                         la subida la app avisa a Nidi sola («Acaba de subir 3 fotos…») para que lo celebre y ofrezca un álbum
// Además, en agente.js: abrir_en_la_app (moverse por la app) y gestionar_albumes (crear/añadir/pasar/quitar/renombrar álbumes).
// Todas las que cambian lo que se ve cierran antes la capa de ayuda (ctx.cerrarAyuda): si no, la ficha o la foto se abren DETRÁS del
// velo y del pollito, la persona no puede tocar nada, y su único botón («Cancelar») corta la conversación con Nidi.
// No hay «compartir_felicitacion»: el menú de compartir del móvil solo se abre con un toque de la persona (ver crear_felicitacion).

window.NidoAgenteAcciones = (function () {
  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const pantalla = () => window.NidoNav.current();
  const ps = () => (window.PersonaSelect && window.PersonaSelect.agente) || null;
  const bool = (v) => v === true || v === 'true' || v === 1 || v === '1' || norm(String(v)) === 'si';
  const plural = (n, una, varias) => n + ' ' + (n === 1 ? una : varias);

  // ---- ver_foto ----
  const VER_URL = '/.netlify/functions/ver-foto';
  // El servidor corta a los 18 s (ver-foto.js, PLAZO_MS): el navegador espera un poco más que él.
  const VER_TOPE_MS = 20000;
  // AbortSignal.timeout no existe en Safari/iOS anterior a 16: allí lanzaría un TypeError y ver_foto fallaría siempre con «sin conexión».
  // Mismo cuidado que persona.js con CREAR_TOPE_MS, pero con un AbortController, que sí existe, para no quedarse sin tope.
  function plazo(ms) {
    if (window.AbortSignal && AbortSignal.timeout) return AbortSignal.timeout(ms);
    if (!window.AbortController) return undefined;
    const c = new AbortController();
    setTimeout(() => c.abort(), ms);
    return c.signal;
  }
  async function verFoto(p, ctx) {
    const api = ps();
    if (!api) return 'No puedo ver fotos ahora mismo.';
    if (pantalla() !== 'detalle-foto') return 'No hay ninguna foto abierta. Ábrela con abrir_foto (o pídele que toque la que quiere) y vuelve a intentarlo.';
    if (ctx.cerrarAyuda) ctx.cerrarAyuda();
    ctx.avisar('Nidi está mirando esta foto…', 3500); // que se sepa siempre cuándo se manda una foto
    let datos;
    try { datos = await api.fotoParaVer(); } catch (e) { return 'No he podido preparar la foto para mirarla. Ofrécele intentarlo otra vez.'; }
    if (!datos) return 'No hay ninguna foto abierta.';
    let res, j;
    try {
      res = await fetch(VER_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageBase64: datos.imageBase64, tipo: datos.tipo, fecha: datos.fecha, personas: datos.personas, pregunta: String((p && p.pregunta) || '').slice(0, 300) }),
        signal: plazo(VER_TOPE_MS),
      });
      j = await res.json().catch(() => ({}));
    } catch (e) { return 'No he conseguido ver la foto (sin conexión o tardó demasiado). Díselo con naturalidad y ofrécele volver a intentarlo.'; }
    if (res.status === 503) return 'Ahora mismo no puedo mirar fotos. Díselo con naturalidad y sigue ayudando de palabra.';
    if (!res.ok || !j.descripcion) return 'No he conseguido ver la foto ahora. Ofrécele intentarlo otra vez dentro de un momento.';
    const conocidos = datos.personas.filter((x) => x.nombre).map((x) => x.nombre);
    const sin = datos.personas.length - conocidos.length;
    let quien = '';
    if (datos.personas.length) {
      quien = ' Nido reconoce a: ' + (conocidos.length ? conocidos.join(', ') : 'nadie por su nombre') +
        (sin ? (conocidos.length ? ', y a ' : ' y hay ') + plural(sin, 'persona que aún no sabe quién es', 'personas que aún no sabe quiénes son') : '') + '.';
    }
    return 'Lo que se ve: ' + j.descripcion + (datos.fecha ? ' (Foto del ' + datos.fecha + '.)' : '') + quien;
  }

  // ---- abrir_foto ----
  async function abrirFoto(p, ctx) {
    const pant = document.querySelector('.screen.is-active');
    if (!pant) return 'No veo ninguna pantalla con fotos.';
    // Las tarjetas se cuentan antes de cerrar la ayuda: con la capa encima siguen ahí (solo tapadas), y así un «no hay fotos» no la cierra.
    const cards = Array.from(pant.querySelectorAll('.photo-card')).filter((c) => c.offsetParent && c.getBoundingClientRect().width > 0 && !c.closest('[hidden]') && c.querySelector('img, video'));
    if (!cards.length) return 'En esta pantalla no hay fotos que abrir.';
    if (ctx.cerrarAyuda) ctx.cerrarAyuda();
    let n = Math.round(Number(p && (p.posicion || p.numero))) || 1;
    n = Math.min(cards.length, Math.max(1, n));
    cards[n - 1].scrollIntoView({ block: 'center' });
    cards[n - 1].click();
    // El toque tarda un poco en cambiar de pantalla (botón «hundido», PRESS_DELAY_MS en app.js): se espera a que la foto esté abierta
    // de verdad, para que un ver_foto justo después no conteste «no hay ninguna foto abierta».
    for (let i = 0; i < 20 && pantalla() !== 'detalle-foto'; i++) await new Promise((ok) => setTimeout(ok, 50));
    return 'He abierto la foto ' + n + ' de ' + cards.length + '.';
  }

  // ---- senalar ----
  let senalActual = null;
  function quitarSenal() {
    if (senalActual) { senalActual.el.classList.remove('nido-senal'); clearTimeout(senalActual.t); senalActual = null; }
  }
  function senalar(p, ctx) {
    const texto = norm(p && (p.texto || p.elemento || p.boton));
    if (!texto) return 'Falta decir qué botón marcar (por ejemplo «Añadir» o «Volver»).';
    if (ctx.cerrarAyuda) ctx.cerrarAyuda();
    const pant = document.querySelector('.screen.is-active');
    if (!pant) return 'No veo dónde marcarlo.';
    let el = null;
    if (/^(ayuda|avatar|pollito|nidi)$/.test(texto)) el = pant.querySelector('.avatar');
    else {
      const visibles = Array.from(pant.querySelectorAll('button, [data-nav], [role="button"], a, .album-card, .felicitacion-card, .persona-item, .ajustes-row'))
        .filter((e) => e.offsetParent && e.getBoundingClientRect().width > 8 && !e.closest('[hidden]'));
      const conTexto = visibles.map((e) => ({ e, t: norm(e.getAttribute('aria-label') || e.innerText || e.textContent) })).filter((x) => x.t);
      const exacto = conTexto.filter((x) => x.t === texto);
      // Parcial solo si lo dicho tiene al menos 3 letras y encaja con el PRINCIPIO de una palabra del botón («volv» → «Volver»,
      // «recuerdos» → «Ver más recuerdos»): antes una «a» suelta marcaba «Ayuda», que no tenía nada que ver.
      const parcial = texto.length < 3 ? [] : conTexto.filter((x) => (' ' + x.t).includes(' ' + texto)).sort((a, b) => a.t.length - b.t.length);
      const hit = exacto[0] || parcial[0];
      el = hit && hit.e;
    }
    if (!el) {
      const botones = Array.from(pant.querySelectorAll('button')).filter((e) => e.offsetParent && norm(e.innerText)).map((e) => '«' + e.innerText.trim().replace(/\s+/g, ' ') + '»').slice(0, 6);
      return 'No he encontrado «' + (p.texto || p.elemento) + '» en esta pantalla. Botones que hay: ' + (botones.join(', ') || 'ninguno visible') + '.';
    }
    marcar(el);
    return 'Lo estoy marcando en la pantalla (brilla): «' + (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ') + '». Dile que lo pulse.';
  }
  // Marca un elemento concreto (lo usan también crear_felicitacion y subir_fotos, que ya saben cuál es). Brilla 12 s o hasta el siguiente toque.
  function marcar(el, ms) {
    quitarSenal();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('nido-senal');
    senalActual = { el, t: setTimeout(quitarSenal, ms || 12000) };
  }
  document.addEventListener('pointerdown', quitarSenal, true);

  // ---- personas ----
  // La app, al ver abrirse una ficha sin nombre con Nidi escuchando, le manda su propio aviso («pregúntale quién es», app.js
  // agenteAvisoFicha). Si la abre Nidi, la respuesta de esta herramienta ya se lo dice: se marca como preguntada para que no
  // llegue un segundo turno 400 ms después (Nidi preguntaría dos veces o se cortaría a sí mismo).
  const yaPreguntada = (id) => { if (id && window.NidoAgenteFichaPreguntada) window.NidoAgenteFichaPreguntada(id); };
  function abrirPersona(p, ctx) {
    const api = ps();
    if (!api) return 'No puedo abrir personas ahora mismo.';
    if (p && bool(p.sin_nombre)) {
      if (ctx.cerrarAyuda) ctx.cerrarAyuda();
      const f = api.abrirFichaSinNombre();
      yaPreguntada(f && f.id);
      return f ? 'He abierto una ficha sin nombre (' + plural(f.nFotos, 'foto', 'fotos') + '). Pregúntale quién es y, cuando te lo diga, guárdalo con nombrar_persona.'
        : 'No hay ninguna ficha sin nombre: Nido aún no ha encontrado a nadie nuevo.';
    }
    const nombre = (p && p.nombre) || '';
    if (!nombre.trim()) return 'Falta el nombre de la persona.';
    const id = window.PersonaSelect.personIdByName(nombre);
    const conocidas = api.estado().personas.filter((x) => x.nombre).map((x) => x.nombre);
    if (!id) return 'No conozco a «' + nombre + '». Nido conoce a: ' + (conocidas.join(', ') || 'nadie por su nombre todavía') + '. Pregúntale si se refiere a alguien de esa lista o si quiere que abras una ficha sin nombre.';
    if (ctx.cerrarAyuda) ctx.cerrarAyuda();
    window.PersonaSelect.openPerson(id);
    const info = api.estado().personas.find((x) => x.id === id);
    return 'He abierto la ficha de ' + (info && info.nombre ? info.nombre : nombre) + (info ? ' (' + plural(info.nFotos, 'foto', 'fotos') + ')' : '') + '.';
  }

  function nombrarPersona(p, ctx) {
    const api = ps();
    if (!api) return 'No puedo guardar nombres ahora mismo.';
    p = p || {};
    if (bool(p.deshacer)) return api.nombrarPersona({ deshacer: true }).mensaje;
    if (!String(p.nombre || '').trim()) return 'Falta el nombre. Pregúntale cómo se llama y, si no lo oyes bien, que lo deletree.';
    // Se guarda al momento y Nidi lo lee en voz alta para que lo corrija si hace falta (ver guardarNombre en persona.js).
    if (ctx.cerrarAyuda) ctx.cerrarAyuda(); // que vea el nombre en la ficha y el aviso «Guardado: … · Deshacer»
    const r = api.nombrarPersona({ nombre: p.nombre, sobrescribir: bool(p.sobrescribir), id: p.persona_id || undefined });
    return r.mensaje;
  }

  // ---- crear_felicitacion ----
  // Nidi hace la felicitación entera (elige la foto, la manda a pintar y la deja en pantalla) sin que la persona toque nada.
  // Lo único que no puede hacer por ella es COMPARTIRLA: el menú de compartir del móvil (navigator.share) solo se abre dentro de un
  // toque de la persona, así que no hay herramienta «compartir_felicitacion»; al terminar se marca el botón «Compartir» y Nidi le pide
  // que lo pulse. (Si más tarde quiere enviarla, Nidi puede volver a marcarlo con senalar «Compartir».)
  //
  // Tiempos: pintar tarda unos segundos (ver SESSION-NOTES, sesión 9). ElevenLabs espera la respuesta de una herramienta un tiempo
  // limitado, así que se espera como mucho ESPERA_MAX_MS: si para entonces no ha terminado, se contesta «se está creando» y, cuando
  // acabe, la app se lo cuenta a Nidi con NidoAgente.decir (igual que el aviso de la ficha sin nombre).
  const ESPERA_MAX_MS = 18000;
  // Lo que se dice en voz alta (o lo que mande el agente) → los 4 estilos de la app, mismas claves que CAPTIONS en persona.js. Acepta
  // sinónimos hablados: «cumple», «boda», «bodas de oro», «Nochevieja», «Nochebuena», «Reyes»… Si dice dos («Navidad y Año Nuevo»)
  // gana el primero de esta lista.
  const ESTILOS = [
    ['anonuevo', /\b(ano ?nuevo|nuevo ano|nochevieja|fin de ano|las uvas|anonuevo)\b/],
    ['navidad', /(navidad|navide|nochebuena|reyes|felices fiestas|papa noel)/],
    ['aniversario', /(aniversario|boda|casad|matrimonio)/],
    ['cumpleanos', /(cumple|cumpleanos)/],
  ];
  const NOMBRE_ESTILO = { cumpleanos: 'cumpleaños', aniversario: 'aniversario', navidad: 'Navidad', anonuevo: 'Año Nuevo' };
  function estiloDe(dicho) {
    const t = norm(dicho).replace(/_/g, ' ');
    const hit = ESTILOS.find(([, re]) => re.test(t));
    return hit ? hit[0] : null;
  }
  const ESTA_PERSONA = /^(esta|este|esta persona|la abierta|la de la ficha|la ficha|el|ella)$/; // «hazle una a esta» con la ficha abierta
  const conocidas = () => { const api = ps(); return api ? api.estado().personas.filter((x) => x.nombre).map((x) => x.nombre) : []; };

  // Error técnico → frase que Nidi puede decir sin tecnicismos (el detalle va aparte, por si hay que depurar).
  function errorAmable(e) {
    const t = norm(e);
    if (/tardo demasiado|timeout|timed out/.test(t)) return 'ha tardado demasiado';
    if (/failed to fetch|load failed|network|conexion/.test(t)) return 'no ha habido conexión con el servicio que la pinta';
    if (/cloudflare|faltan|servidor|no valida|imagen/.test(t)) return 'el servicio que pinta las felicitaciones no ha respondido bien';
    return 'algo ha fallado';
  }

  function textoFelicitacion(r) {
    if (r.ok) {
      const boton = document.querySelector('[data-screen="felicitacion-generada"] [data-persona-action="compartir-whatsapp"]');
      if (boton && pantalla() === 'felicitacion-generada') marcar(boton, 15000);
      const de = r.persona ? ' con una foto de ' + r.persona : r.conFotoAbierta ? ' con la foto que tenía abierta' : '';
      return 'Hecho: ya tiene en pantalla la felicitación de ' + NOMBRE_ESTILO[r.estilo] + de + ' («' + r.titulo + '»; ha tardado ' + Math.round((r.ms || 0) / 1000) + ' s). ' +
        'Queda guardada en «Mis felicitaciones», en Yo. Para enviarla puede compartirla con el botón «Compartir», abajo a la derecha (lo estoy marcando, brilla): ' +
        'tiene que pulsarlo la persona, el móvil no deja abrir WhatsApp sin su toque. Si no quiere enviarla ahora, «Volver».';
    }
    if (r.ocupado) return 'Ya estoy creando una felicitación. Dile que espere un momento; cuando esté, la app te avisará.';
    if (r.sinFotoAbierta) return 'No tiene ninguna foto abierta. Pregúntale con quién quiere la felicitación (Nido conoce a: ' + (conocidas().join(', ') || 'nadie por su nombre todavía') + ') o ábrele la foto que quiera con abrir_foto.';
    if (r.sinFoto) return 'Falta la foto. Pregúntale con quién quiere la felicitación (Nido conoce a: ' + (conocidas().join(', ') || 'nadie por su nombre todavía') + ') o si quiere usar una foto concreta (ábrela con abrir_foto y vuelve a llamar con usar_foto_abierta=true).';
    if (r.personaSinFotos) return 'Todavía no tengo ninguna foto de ' + (r.nombre || 'esa persona') + '. Pregúntale si quiere hacerla con otra persona o con una foto concreta.';
    const detalle = String(r.error || '').slice(0, 140);
    return 'No se ha podido crear la felicitación: ' + errorAmable(detalle) + ' (detalle técnico: ' + detalle + '). Díselo con naturalidad, sin tecnicismos, y ofrécele intentarlo otra vez.';
  }

  async function crearFelicitacion(p, ctx) {
    const api = ps();
    if (!api || !api.crearFelicitacion) return 'No puedo crear felicitaciones ahora mismo.';
    const dicho = String(p.estilo || p.tipo || '').trim();
    if (!dicho) return 'Falta saber de qué es la felicitación. Pregúntale si es de cumpleaños, de aniversario, de Navidad o de Año Nuevo.';
    const estilo = estiloDe(dicho);
    if (!estilo) return 'No sé hacer felicitaciones de «' + dicho + '». Puedo hacerlas de cumpleaños, de aniversario, de Navidad o de Año Nuevo: pregúntale cuál le va mejor.';
    if (api.creandoFelicitacion()) return textoFelicitacion({ ocupado: true });
    if (!navigator.onLine) return 'No hay conexión a internet y las felicitaciones la necesitan. Díselo con naturalidad y ofrécele hacerla cuando vuelva la conexión.';
    let personaId = null;
    const nombre = String(p.persona || '').trim();
    if (nombre && !ESTA_PERSONA.test(norm(nombre))) {
      personaId = window.PersonaSelect.personIdByName(nombre);
      if (!personaId) return 'No conozco a «' + nombre + '». Nido conoce a: ' + (conocidas().join(', ') || 'nadie por su nombre todavía') + '. Pregúntale si se refiere a alguien de esa lista o si prefiere hacerla con una foto concreta.';
    }
    if (ctx.cerrarAyuda) ctx.cerrarAyuda(); // que vea «Creando imagen» y luego la felicitación, sin la capa de ayuda encima
    const trabajo = api.crearFelicitacion({ estilo, personaId, usarFotoAbierta: bool(p.usar_foto_abierta) });
    const r = await Promise.race([trabajo, new Promise((ok) => setTimeout(() => ok(null), ESPERA_MAX_MS))]);
    if (r) return textoFelicitacion(r);
    // Tarda más de lo que ElevenLabs espera a una herramienta: se contesta ya y el resultado se le cuenta a Nidi cuando llegue.
    trabajo.then((tarde) => {
      const t = textoFelicitacion(tarde);
      if (window.NidoAgente && window.NidoAgente.activa) window.NidoAgente.decir('[Aviso de la app, no lo ha dicho la persona] ' + t);
    }, () => {});
    return 'La felicitación se está creando y hoy tarda un poco más de lo normal. Dile que espere un momento mirando la pantalla; en cuanto esté, la app te avisará y se lo cuentas.';
  }

  // ---- subir_fotos ----
  // Abrir las fotos del móvil (el <input type="file" id="gallery-input">) SOLO se puede dentro de un toque de la persona: Nidi no puede
  // hacerlo por ella. Así que la lleva a «Todas tus fotos», pone ahí un botón «Elegir fotos» (el mismo data-pick-gallery que usa
  // «Permitir» en el alta: app.js abre el selector dentro del toque), lo hace brillar y le devuelve a Nidi los pasos para guiarla.
  // Cuando la persona elige, la app importa las fotos (app.js, cargarGaleria) y aquí se escucha el final para que Nidi lo celebre.
  const PANTALLA_SUBIR = 'album-detalle'; // «Todas tus fotos»
  const MAX_FOTOS = 60; // el mismo tope que MAX_GALLERY en app.js: lo que pase de ahí no se importa
  let subiendo = false; // la persona está en medio del flujo que empezó Nidi (para avisar también si cierra sin elegir)

  function botonSubir() {
    const pant = document.querySelector('[data-screen="' + PANTALLA_SUBIR + '"]');
    if (!pant) return null;
    let b = pant.querySelector('.nido-subir-fotos');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn--soft btn--horizontal btn--lg btn--icon-wide nido-subir-fotos';
      b.setAttribute('data-pick-gallery', '');
      b.innerHTML = '<span class="btn__icon"><img src="assets/icons/icon-image-01-blue.svg" alt="" /></span>Elegir fotos';
      pant.appendChild(b);
      // «Todas tus fotos» no lleva botón de añadir (decisión de diseño, ver index.html): este solo existe mientras dura la ayuda.
      new MutationObserver((_, obs) => { if (!pant.classList.contains('is-active')) { b.remove(); subiendo = false; obs.disconnect(); } })
        .observe(pant, { attributes: true, attributeFilter: ['class'] });
    }
    return b;
  }

  function subirFotos(p, ctx) {
    if (!document.getElementById('gallery-input')) return 'En esta versión de la app no se pueden subir fotos.';
    if (/^(registro|onboarding)/.test(pantalla())) return 'Ahora mismo está en la presentación de la app; cuando llegue al inicio podrá subir fotos.';
    if (ctx.cerrarAyuda) ctx.cerrarAyuda();
    if (pantalla() !== PANTALLA_SUBIR) window.NidoNav.show(PANTALLA_SUBIR);
    const b = botonSubir();
    if (!b) return 'No he encontrado dónde se suben las fotos.';
    subiendo = true;
    marcar(b, 20000);
    return 'Estamos en «Todas tus fotos» y he puesto un botón «Elegir fotos» que brilla, encima de «Volver». Yo no puedo abrir sus fotos: el móvil ' +
      'solo deja hacerlo con su dedo. Guíale paso a paso, de uno en uno y esperando a que lo haga: 1) que pulse «Elegir fotos»; 2) si le sale un menú, ' +
      'que toque «Fototeca»; 3) que toque las fotos que quiera subir (se marcan con un círculo azul); 4) que pulse «Añadir» (arriba a la derecha). ' +
      'Se añadirán a las que ya tiene. Cuando termine, la app te avisará de cuántas ha subido.';
  }

  // La importación ha terminado cuando app.js publica la galería nueva (evento 'nido:gallery' con NidoGaleria.items ya puesto) y en ella
  // están estos archivos (el mismo evento lo lanza también la biblioteca de ejemplo; por eso se comprueba). Si no llega, false.
  function esperarImportacion(files, ms) {
    return new Promise((ok) => {
      const fin = (v) => { clearTimeout(t); window.removeEventListener('nido:gallery', alLlegar); ok(v); };
      const alLlegar = () => {
        const items = (window.NidoGaleria && window.NidoGaleria.items) || [];
        if (items.some((it) => files.includes(it.file))) fin(true);
      };
      const t = setTimeout(() => fin(false), ms);
      window.addEventListener('nido:gallery', alLlegar);
    });
  }

  // Fase de captura a nivel document: corre ANTES que el listener de app.js (que vacía el input al terminar), así los archivos aún están.
  document.addEventListener('change', (e) => {
    if (!e.target || e.target.id !== 'gallery-input') return;
    const files = Array.from(e.target.files || []).filter((f) => /^(image|video)\//.test(f.type)).slice(0, MAX_FOTOS);
    const b = document.querySelector('.nido-subir-fotos');
    if (b && files.length) b.remove(); // ya ha elegido: el botón de ayuda sobra
    subiendo = false;
    if (!files.length || !window.NidoAgente || !window.NidoAgente.activa) return;
    const nV = files.filter((f) => f.type.startsWith('video')).length, nF = files.length - nV;
    const que = [nF ? plural(nF, 'foto', 'fotos') : '', nV ? plural(nV, 'vídeo', 'vídeos') : ''].filter(Boolean).join(' y ');
    esperarImportacion(files, 60000).then((ok) => {
      if (!window.NidoAgente.activa) return;
      window.NidoAgente.decir(ok
        ? '[Aviso de la app, no lo ha dicho la persona] Acaba de subir ' + que + ' a Nido; ya están en «Todas tus fotos». Celébralo en una frase corta y ofrécele meterlas en un álbum (gestionar_albumes) o que te cuente quién sale en ellas.'
        : '[Aviso de la app, no lo ha dicho la persona] Ha elegido ' + que + ' pero la app no ha terminado de subirlas. Díselo con calma y ofrécele intentarlo otra vez.');
    });
  }, true);

  // Cierra las fotos del móvil sin elegir nada estando en el flujo de Nidi: que Nidi lo sepa y le ofrezca otra vez (el botón sigue ahí).
  document.addEventListener('cancel', (e) => {
    if (!e.target || e.target.id !== 'gallery-input' || !subiendo) return;
    if (window.NidoAgente && window.NidoAgente.activa) {
      window.NidoAgente.decir('[Aviso de la app, no lo ha dicho la persona] Ha cerrado las fotos del móvil sin elegir ninguna. Pregúntale con calma si quiere intentarlo otra vez (el botón «Elegir fotos» sigue en pantalla) o si prefiere dejarlo para otro momento.');
    }
  }, true);

  function verContexto() { return window.NidoAgenteContexto ? window.NidoAgenteContexto('Ahora') : 'Sin contexto.'; }

  // ctx: { avisar(mensaje, ms), cerrarAyuda() }
  function crear(ctx) {
    ctx = ctx || {};
    const c = { avisar: ctx.avisar || (() => {}), cerrarAyuda: ctx.cerrarAyuda };
    const seguro = (f) => async (p) => { try { return await f(p || {}, c); } catch (e) { return 'No he podido hacerlo (' + ((e && e.message) || 'error') + '). Díselo con naturalidad.'; } };
    return {
      ver_contexto: seguro(() => verContexto()),
      abrir_persona: seguro((p, cc) => abrirPersona(p, cc)),
      nombrar_persona: seguro((p, cc) => nombrarPersona(p, cc)),
      ver_foto: seguro((p, cc) => verFoto(p, cc)),
      abrir_foto: seguro((p, cc) => abrirFoto(p, cc)),
      senalar: seguro((p, cc) => senalar(p, cc)),
      crear_felicitacion: seguro((p, cc) => crearFelicitacion(p, cc)),
      subir_fotos: seguro((p, cc) => subirFotos(p, cc)),
    };
  }

  return { crear, estiloDe }; // estiloDe: para probar los sinónimos sin crear nada
})();
