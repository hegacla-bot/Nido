// Nido · «los ojos de Nidi» — describe la foto que la persona tiene abierta.
//
// Lo llama el asistente de voz (herramienta ver_foto, js/agente-acciones.js) SOLO cuando hace falta:
// la persona pregunta por la foto o Nidi necesita verla para ayudar. Nunca se manda la biblioteca entera.
//
// Privacidad (decisión de producto, ver agente/LEEME.md):
//  - el navegador manda una sola foto, reducida y recomprimida en un canvas (sin EXIF ni GPS);
//  - esta función no guarda ni registra la imagen ni la respuesta;
//  - quién sale en la foto lo decide el reconocimiento del propio dispositivo: aquí se recibe ya como nombres,
//    y el modelo tiene prohibido identificar a nadie por la cara.
//
// Proveedor: Claude (Anthropic) si hay ANTHROPIC_API_KEY — es el más fiable y rápido para una conversación de voz.
// Si no, Gemini (GEMINI_API_KEY) como respaldo. Con ninguno, la función dice que no puede ver ahora.
//
// Modelos de Gemini, en orden (medido el 24-sep con la clave gratuita, fotos de 896 px, ver SESSION-NOTES sesión 9):
//  - gemma-4-26b-a4b-it: 16/16 respuestas, mediana 2,3 s, p90 4,2 s → va primero.
//  - gemini-3.5-flash-lite: responde bien pero lento (mediana 11,3 s, p90 15,8 s; con 12 s de tope solo 12 de 32) → solo de respaldo.
//  - Descartados: 2.5-flash-lite (404 para cuentas nuevas), 3.1-flash-lite (503 casi siempre), 3.6/3.7/3.8-flash (20 al día gratis).
//
// Plazo: toda la llamada (todos los modelos e intentos) cabe en PLAZO_MS = 18 s, por debajo de los 20 s que espera el navegador
// (agente-acciones.js). Netlify deja a una función síncrona hasta 60 s (docs.netlify.com/build/functions/configuration, 24-sep),
// así que el corte lo pone este plazo, no Netlify.

const MAX_BASE64 = 2_000_000; // ~1,5 MB de JPEG: de sobra para una foto reducida a ~900 px
const CLAUDE_MODELO = process.env.NIDO_VISION_CLAUDE || 'claude-haiku-4-5-20251001';
const GEMINI_MODELOS = (process.env.NIDO_VISION_GEMINI || 'gemma-4-26b-a4b-it,gemini-3.5-flash-lite').split(',').map((m) => m.trim()).filter(Boolean);
const PLAZO_MS = Number(process.env.NIDO_VISION_PLAZO_MS) || 18000;
const INTENTO_MAX_MS = 12000; // ningún intento suelto dura más que esto, aunque quede plazo
const MIN_INTENTO_MS = 1500;  // con menos tiempo que esto no merece la pena empezar otro intento

const SISTEMA =
  'Eres los ojos de Nidi, una asistente de voz cálida que acompaña a una persona mayor con las fotos de su familia. ' +
  'Vas a recibir UNA foto (o un fotograma de un vídeo). Cuenta lo que se ve en español sencillo, como se lo contarías en voz alta a quien tienes al lado: ' +
  'máximo 3 frases cortas, sin listas, sin emojis, sin markdown.\n' +
  'Reglas:\n' +
  '- Describe solo lo que se ve de verdad: personas (cuántas, qué hacen, cómo van vestidas), lugar, objetos, ambiente, momento del día. No inventes nada; si algo no se ve con claridad, dilo.\n' +
  '- NUNCA identifiques a nadie por su cara ni adivines quién es. Si te dan nombres de personas reconocidas por la app, úsalos tal cual y SOLO para la persona que está en la posición indicada; si no, di «una mujer», «un niño», «dos personas»…\n' +
  '- Si no está claro a quién corresponde un nombre (la posición no encaja, o hay más personas que nombres), no pongas ese nombre a nadie: describe sin nombres. Nunca uses un mismo nombre para dos personas.\n' +
  '- No digas que la persona que te habla sale en la foto: no sabes quién es.\n' +
  '- No hables de la calidad técnica de la foto ni de metadatos, salvo que te lo pregunten.\n' +
  '- Si te hacen una pregunta concreta sobre la foto, respóndela primero y con precisión.\n' +
  '- Si la imagen no es una foto (pantalla, documento), di qué es en una frase; si hay texto legible importante (un documento, un cartel) puedes leerlo si te lo piden.\n' +
  '- Si es un documento (un horario, un cartel, una entrada) y te preguntan un dato, léelo EXACTO tal como está escrito (horas, fechas, líneas, lugares) y, si hay varios, di los que respondan a la pregunta. Si el dato no aparece, dilo; no lo deduzcas. Si la imagen es pequeña o borrosa y no lees un número con total seguridad, di que no se lee bien y que conviene mirarlo en el papel, en vez de dar un número que podría estar mal.\n' +
  '- Tono amable y natural. No empieces con «En la imagen»; empieza directamente por lo que ves.';

// Modo «clasificar» (27-sep): al SUBIR fotos, la app pregunta si cada una es un papel (DNI, horario…) para guardarla en Mis documentos
// sin que la persona haga nada, y (28-sep) si se reconoce el lugar, para titular sus recuerdos («Venecia, enero de 2026»). Foto
// pequeña (512 px, sin EXIF), respuesta de una línea, nada se guarda.
const CLASIFICAR =
  'Clasifica la imagen. Responde SOLO una línea con el formato TIPO|NOMBRE|LUGAR, sin nada más.\n' +
  'TIPO es uno de estos:\n' +
  '- identificativo: DNI, pasaporte, carné de conducir, tarjeta sanitaria, tarjeta de la seguridad social, tarjeta del banco.\n' +
  '- horario: horario de autobús, tren, metro, farmacia, centro de salud, misa, tienda; calendario de citas o de recogida.\n' +
  '- documento: cualquier otro papel o pantalla con texto que interese guardar: receta médica, cita del médico, carta, factura, recibo, entrada, cartel, instrucciones.\n' +
  '- foto: una foto normal (personas, paisajes, comida, animales, objetos, celebraciones), aunque salga algo de texto de fondo.\n' +
  'NOMBRE: 1 a 4 palabras en español que digan qué es, como «DNI», «Tarjeta sanitaria», «Horario de autobús», «Receta médica». Vacío si es foto.\n' +
  'LUGAR: la ciudad o el sitio conocido donde se hizo la foto, SOLO si se reconoce con seguridad por lo que se ve (monumentos, canales, ' +
  'paisajes o calles muy característicos): «Venecia», «París», «Sagrada Familia». Nunca lo deduzcas por las personas. Si no estás seguro, vacío.\n' +
  'Si dudas del tipo, responde foto||';
const TIPOS_DOC = ['identificativo', 'horario', 'documento', 'foto'];
function leerClase(t) {
  const linea = String(t || '').split('\n').map((l) => l.trim()).find((l) => l.includes('|')) || '';
  const [tipo, nombre, lugar] = linea.replace(/[*`«»"]/g, '').split('|').map((x) => (x || '').trim());
  const tp = TIPOS_DOC.includes((tipo || '').toLowerCase()) ? tipo.toLowerCase() : 'foto';
  const lg = (lugar || '').replace(/[.?¿]/g, '').trim();
  return { tipo: tp, nombre: tp === 'foto' ? '' : (nombre || '').slice(0, 40), lugar: tp === 'foto' && lg && !/^(desconocido|ninguno|no|vac[ií]o)$/i.test(lg) ? lg.slice(0, 30) : '' };
}

function textoUsuario({ pregunta, personas, fecha, tipo }) {
  const partes = [];
  partes.push(tipo === 'video' ? 'Este es un fotograma de un vídeo.' : 'Esta es la foto que tiene abierta.');
  if (fecha) partes.push('Fecha de la foto: ' + fecha + '.');
  if (Array.isArray(personas) && personas.length) {
    // Cada nombre con su sitio en la foto («Clara (a la izquierda)»): con solo el orden, el modelo se lo ponía a quien le parecía.
    const donde = (p) => (p && typeof p.posicion === 'string' && p.posicion ? ' (' + p.posicion.slice(0, 40) + ')' : '');
    partes.push('Caras que ha encontrado la app, de izquierda a derecha: ' + personas.slice(0, 12).map((p) => (p && typeof p.nombre === 'string' && p.nombre ? p.nombre.slice(0, 60) : 'una persona que Nido aún no sabe quién es') + donde(p)).join('; ') + '.');
  }
  partes.push(pregunta ? 'Pregunta de la persona: ' + pregunta : 'Cuéntame qué se ve en la foto.');
  return partes.join(' ');
}

// Tiempo que le queda a la llamada entera (fin = Date.now() + PLAZO_MS al empezar).
const quedan = (fin) => fin - Date.now();
// Un intento con su propio tope: lo que quede de plazo, sin pasar de INTENTO_MAX_MS.
const tope = (fin) => AbortSignal.timeout(Math.max(1, Math.min(INTENTO_MAX_MS, quedan(fin))));

async function conReintento(fn, fin, intentos = 2) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    if (quedan(fin) < MIN_INTENTO_MS) break;
    try { return await fn(); } catch (e) {
      ultimo = e;
      // Un tiempo agotado no se repite (ya no queda tiempo); una cuota DIARIA agotada tampoco (fallaría igual).
      if (!e || !e.reintentable) break;
      const espera = 700 * (i + 1);
      if (quedan(fin) - espera < MIN_INTENTO_MS) break;
      await new Promise((r) => setTimeout(r, espera));
    }
  }
  throw ultimo || new Error('sin tiempo');
}
// Error de la API → ¿merece otro intento? 429 por minuto y 5xx sí; 429 por día no (se renueva mañana).
async function errorHttp(res, quien) {
  const cuerpo = await res.text().catch(() => '');
  const e = new Error(quien + ' ' + res.status);
  e.reintentable = (res.status === 429 && !/PerDay/i.test(cuerpo)) || res.status >= 500;
  return e;
}

async function conClaude(base64, datos, fin) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODELO,
      max_tokens: datos._sistema ? 400 : 300,
      system: datos._sistema || SISTEMA,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
        { type: 'text', text: datos._texto || textoUsuario(datos) },
      ] }],
    }),
    signal: tope(fin),
  });
  if (!res.ok) throw await errorHttp(res, 'claude');
  const j = await res.json();
  const t = (j.content || []).map((c) => c.text || '').join(' ').trim();
  if (!t) throw new Error('claude vacío');
  return t;
}

async function conGemini(base64, datos, fin) {
  let ultimo;
  for (const modelo of GEMINI_MODELOS) {
    if (quedan(fin) < MIN_INTENTO_MS) break;
    try {
      return await conReintento(async () => {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent', {
          method: 'POST',
          headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: datos._sistema || SISTEMA }] },
            contents: [{ parts: [{ text: datos._texto || textoUsuario(datos) }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }] }],
            // Clasificar hace pensar más al modelo (≈760 «tokens» de razonamiento, 28-sep): con 300 se cortaba y no contestaba nada.
            generationConfig: { maxOutputTokens: datos._sistema ? 2048 : 300 },
          }),
          signal: tope(fin),
        });
        if (!res.ok) throw await errorHttp(res, 'gemini');
        const j = await res.json();
        const cand = (j.candidates || [])[0] || {};
        // Sin las partes de razonamiento (thought): los modelos que «piensan» (Gemma, 3.x-flash) las mandan junto al texto, y en
        // inglés. Y si la respuesta se ha cortado (finishReason ≠ STOP, p. ej. MAX_TOKENS), se pasa al siguiente modelo: una frase
        // a medias se diría en voz alta como si estuviera bien.
        const t = ((cand.content && cand.content.parts) || []).filter((p) => !p.thought).map((p) => p.text || '').join(' ').trim();
        if (cand.finishReason && cand.finishReason !== 'STOP') throw new Error('gemini cortado: ' + cand.finishReason);
        if (!t) throw new Error('gemini vacío');
        return t;
      }, fin, 2);
    } catch (e) { ultimo = e; }
  }
  throw ultimo || new Error('gemini');
}

const resp = (statusCode, obj) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Método no permitido' });
  let datos;
  try { datos = JSON.parse(event.body || '{}'); } catch (e) { return resp(400, { error: 'JSON inválido' }); }
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return resp(400, { error: 'JSON inválido' }); // «null», «[]», «3»…
  const base64 = datos.imageBase64;
  if (typeof base64 !== 'string' || !base64.startsWith('/9j/')) return resp(400, { error: 'Falta la foto (JPEG en base64)' });
  if (base64.length > MAX_BASE64) return resp(413, { error: 'La foto es demasiado grande' });
  datos.pregunta = typeof datos.pregunta === 'string' ? datos.pregunta.slice(0, 300) : '';
  const clasificar = datos.modo === 'clasificar';
  datos._sistema = clasificar ? CLASIFICAR : undefined; // nunca lo que mande el navegador
  datos._texto = clasificar ? '¿Qué es esta imagen?' : undefined;

  const fin = Date.now() + PLAZO_MS;
  const proveedores = [];
  if (process.env.ANTHROPIC_API_KEY) proveedores.push(['claude', () => conReintento(() => conClaude(base64, datos, fin), fin, 2)]);
  if (process.env.GEMINI_API_KEY) proveedores.push(['gemini', () => conGemini(base64, datos, fin)]);
  if (!proveedores.length) return resp(503, { error: 'sin_proveedor', mensaje: 'No hay ningún modelo de visión configurado en el servidor (ANTHROPIC_API_KEY o GEMINI_API_KEY).' });

  for (const [nombre, llamar] of proveedores) {
    try {
      const descripcion = await llamar();
      if (clasificar) return resp(200, { ...leerClase(descripcion), proveedor: nombre });
      return resp(200, { descripcion, proveedor: nombre });
    } catch (e) { /* se prueba el siguiente; no se registra nada de la foto */ }
  }
  return resp(502, { error: 'no_disponible', mensaje: 'El modelo de visión no ha respondido.' });
};
