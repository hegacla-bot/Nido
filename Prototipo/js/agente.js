// Nido · conversación de voz con el asistente (ElevenLabs Agents).
//
// El navegador pide a una función de Netlify (agente-voz.js) una URL firmada — la clave nunca sale del
// servidor — y abre la conversación por voz. El agente solo sabe lo que esta app le cuenta (pantalla, ficha o foto
// abierta, nombres, álbumes: NidoAgenteContexto en app.js) y solo actúa con herramientas cliente: aquí abrir_en_la_app
// y gestionar_albumes; el resto (personas, ver LA foto abierta, señalar, felicitaciones, subir fotos) en agente-acciones.js.
// Qué hace cada una y cómo darlas de alta en ElevenLabs: agente/HERRAMIENTAS.md.
// La librería es grande, así que solo se descarga la primera vez que alguien pulsa Hablar.

window.NidoAgente = (function () {
  let sesion = null;
  let cargando = null;

  function cargarLibreria() {
    if (window.ElevenLabsClient) return Promise.resolve();
    if (cargando) return cargando;
    cargando = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/elevenlabs-client.js?v=1';
      s.onload = ok;
      s.onerror = () => { cargando = null; ko(new Error('libreria')); };
      document.head.appendChild(s);
    });
    return cargando;
  }

  async function urlFirmada() {
    const res = await fetch('/.netlify/functions/agente-voz');
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.signedUrl) throw new Error('acceso');
    return data.signedUrl;
  }

  // hooks: { contexto(): string, abrir(pedido): string, mensaje(texto), estado('conectando'|'escuchando'|'hablando'|'cerrado') }
  async function start(hooks) {
    if (sesion) return;
    hooks.estado('conectando');
    // Safari en iPhone solo deja sonar y grabar si se pide dentro del propio toque, antes de cualquier espera.
    let pideMic = Promise.resolve();
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      window.__nidoAudio = window.__nidoAudio || new AC();
      window.__nidoAudio.resume();
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        pideMic = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
          .then((st) => st.getTracks().forEach((t) => t.stop()));
      }
    } catch (e) { /* sin audio no hay conversación: lo detecta startSession */ }
    try {
      await pideMic;
      await cargarLibreria();
      const signedUrl = await urlFirmada();
      // El micrófono se pide dentro del toque de "Hablar", así Safari lo permite.
      sesion = await window.ElevenLabsClient.Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        clientTools: Object.assign({
          abrir_en_la_app: async (p) => hooks.abrir((p && (p.pedido || p.request)) || ''),
          gestionar_albumes: async (p) => (hooks.gestionar ? hooks.gestionar(p || {}) : 'No puedo hacer eso ahora.'),
        }, hooks.herramientas || {}), // el resto (personas, ver fotos, señalar…) vive en agente-acciones.js
        onConnect: () => { try { sesion && sesion.sendContextualUpdate(hooks.contexto()); } catch (e) {} },
        onMessage: (m) => {
          if (!m || !m.message) return;
          if (m.source === 'ai') hooks.mensaje(m.message);
          else if (m.source === 'user' && hooks.usuario) hooks.usuario(m.message);
        },
        onModeChange: (m) => {
          const habla = m.mode === 'speaking';
          // Turnos claros: mientras Nidi habla el micrófono está cerrado (no hay eco que la interrumpa); al terminar, se abre.
          try { if (sesion && sesion.setMicMuted) sesion.setMicMuted(habla); } catch (e) {}
          hooks.estado(habla ? 'hablando' : 'escuchando');
        },
        onDisconnect: () => { sesion = null; hooks.estado('cerrado'); },
        onError: () => { sesion = null; hooks.estado('cerrado'); },
      });
      // startSession puede resolver antes que onConnect: se manda también aquí.
      try { sesion.sendContextualUpdate(hooks.contexto()); } catch (e) {}
    } catch (e) {
      sesion = null;
      hooks.estado('cerrado');
      throw e;
    }
  }

  function contexto(texto) { try { if (sesion) sesion.sendContextualUpdate(texto); } catch (e) {} }

  // Un aviso de la propia app que Nidi debe atender YA (p. ej. «acaba de abrir la ficha de alguien sin nombre»): entra como un turno de
  // la conversación y Nidi responde en voz alta. No se usa sendContextualUpdate porque ése no hace hablar al agente.
  function decir(texto) { try { if (sesion && sesion.sendUserMessage) { sesion.sendUserMessage(texto); return true; } } catch (e) {} return false; }

  async function stop() {
    const s = sesion;
    sesion = null;
    if (s) { try { await s.endSession(); } catch (e) {} }
  }

  return { start, stop, contexto, decir, get activa() { return !!sesion; } };
})();
