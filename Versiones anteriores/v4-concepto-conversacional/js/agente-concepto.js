// Nido · concepto conversacional — conversación real con el asistente (ElevenLabs Agents).
//
// Distinto del agente de la app actual (js/agente.js): aquí el asistente no mueve pantallas, solo
// conversa sobre UNA foto y va guardando lo que la persona cuenta con la herramienta
// `guardar_recuerdo`. Cuando ya hay bastante, cierra la conversación con `cerrar_historia`, que le
// pide que ESCRIBA ÉL MISMO el resumen (no se cose a mano en el cliente) — así "cómo se transforma
// una conversación en datos" tiene una respuesta concreta: cada frase guardada es un recuerdo con
// quién/qué, y el cierre es el propio texto que arma la historia.
//
// El asistente nunca ve la foto ni datos de otras personas: solo la fecha, el lugar (si se conoce)
// y, como mucho, un dato cultural de esa fecha ya verificado (no una búsqueda en vivo).

window.NidoAgenteConcepto = (function () {
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
    const res = await fetch('/api/agente-concepto');
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.signedUrl) throw new Error('acceso');
    return data.signedUrl;
  }

  // hooks:
  //  - contexto(): string                         → lo que sabe el asistente al empezar (fecha, lugar, dato de la época)
  //  - recuerdo({ quien, que })                    → cada vez que el asistente guarda algo contado
  //  - cierre({ resumen })                         → el asistente decide que ya hay historia y la escribe él mismo
  //  - mensaje(texto) / usuario(texto)             → para pintar las burbujas del chat
  //  - estado('conectando'|'escuchando'|'hablando'|'cerrado')
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
    } catch (e) { /* sin audio no hay voz: se sigue pudiendo escribir */ }
    try {
      await pideMic;
      await cargarLibreria();
      const signedUrl = await urlFirmada();
      sesion = await window.ElevenLabsClient.Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        dynamicVariables: (hooks.variables && hooks.variables()) || {}, // {{fecha}} etc. para el "Primer mensaje" del agente
        clientTools: {
          guardar_recuerdo: async (p) => {
            const r = { quien: (p && p.quien) || '', que: (p && p.que) || '' };
            if (hooks.recuerdo) hooks.recuerdo(r);
            return 'Guardado.';
          },
          cerrar_historia: async (p) => {
            const resumen = (p && p.resumen) || '';
            const r = hooks.cierre ? hooks.cierre({ resumen }) : null;
            // Si el cliente rechaza el cierre (por ejemplo, sin ningún recuerdo real guardado antes),
            // devuelve su propio texto en vez de confirmar algo que no ha pasado.
            return (typeof r === 'string' && r) ? r : 'Historia guardada y mostrada.';
          },
          buscar_persona: async (p) => (hooks.buscarPersona ? await hooks.buscarPersona((p && p.nombre) || '') : 'No puedo buscar a nadie ahora mismo.'),
          otra_foto: async () => (hooks.otraFoto ? hooks.otraFoto() : 'No puedo cambiar de foto ahora mismo.'),
          guardar_nombre_usuario: async (p) => {
            const nombre = (p && p.nombre) || '', comoLlamarla = (p && p.como_llamarla) || nombre;
            if (hooks.nombreUsuario) hooks.nombreUsuario({ nombre, comoLlamarla });
            return 'Guardado. A partir de ahora la llamo así siempre.';
          },
        },
        onConnect: () => { try { sesion && sesion.sendContextualUpdate(hooks.contexto()); } catch (e) {} },
        onMessage: (m) => {
          if (!m || !m.message) return;
          const limpio = m.message.replace(/\[[^\]]*\]\s*/g, ''); // por si la voz mete etiquetas de emoción entre corchetes
          if (m.source === 'ai') hooks.mensaje(limpio);
          else if (m.source === 'user' && hooks.usuario) hooks.usuario(limpio);
        },
        // Cuando la persona interrumpe a Nidi a media frase, ElevenLabs manda por separado un
        // "corrected_agent_response" con lo que de verdad llegó a decir (recortado) — sin escuchar
        // esto, el bocadillo se quedaba con la frase larga original mientras la voz ya había pasado
        // a otra cosa, dando la sensación de "se corta y dice otra cosa por su cuenta". Bug real,
        // reportado así por la usuaria (22-sep).
        onAgentResponseCorrection: (c) => {
          const corregido = c && (c.corrected_agent_response || c.correctedAgentResponse);
          if (corregido) hooks.mensaje(corregido.replace(/\[[^\]]*\]\s*/g, ''));
        },
        onModeChange: (m) => {
          const habla = m.mode === 'speaking';
          // Antes se mutaba el micrófono mientras Nidi hablaba, para que no se autointerrumpiera —
          // pero eso también le impedía a la PERSONA cortarla si quería, que es justo cómo funciona
          // una conversación real (bug reportado así: "si le hablo mientras ella habla no debería
          // cortarse, en teoría es como una conversación normal"). Se quita esa regla: el propio
          // agente ya sabe interrumpirse solo cuando detecta que alguien le habla encima (evento
          // "interruption" del SDK) y el micrófono ya pide cancelación de eco al arrancar (más
          // arriba, en start()) — no hacía falta este mudo forzado para evitar que se oiga a sí
          // mismo. El único mudo que queda es el explícito (microForzadoMudo, ver abajo).
          const forzarMudo = (hooks.microForzadoMudo && hooks.microForzadoMudo()) || false;
          try { if (sesion && sesion.setMicMuted) sesion.setMicMuted(forzarMudo); } catch (e) {}
          hooks.estado(habla ? 'hablando' : 'escuchando');
        },
        onDisconnect: () => { sesion = null; hooks.estado('cerrado'); },
        onError: () => { sesion = null; hooks.estado('cerrado'); },
      });
      try { sesion.sendContextualUpdate(hooks.contexto()); } catch (e) {}
    } catch (e) {
      sesion = null;
      hooks.estado('cerrado');
      throw e;
    }
  }

  // Alternativa a hablar: escribir. Entra en la MISMA conversación (turno real, no un truco aparte).
  function enviarTexto(texto) {
    if (!sesion || !texto.trim()) return false;
    try { sesion.sendUserMessage(texto.trim()); return true; } catch (e) { return false; }
  }

  function contexto(texto) { try { if (sesion) sesion.sendContextualUpdate(texto); } catch (e) {} }

  // Para forzar el mudo desde fuera en el momento exacto de un toque (tocar el micrófono debe
  // notarse al instante, sin esperar al próximo cambio de turno para que onModeChange lo aplique).
  function setMicMuted(v) { try { if (sesion && sesion.setMicMuted) sesion.setMicMuted(v); } catch (e) {} }

  async function stop() {
    const s = sesion;
    sesion = null;
    if (s) { try { await s.endSession(); } catch (e) {} }
  }

  return { start, stop, contexto, enviarTexto, setMicMuted, get activa() { return !!sesion; } };
})();
