// Nido · "Crear algo con esta persona" — genera de verdad la imagen con IA.
//
// Corre en el servidor (función de Netlify), nunca en el navegador: la clave
// de Cloudflare Workers AI no puede llegar al cliente, o cualquiera que abra
// la página podría gastar la cuota gratuita de la cuenta. El navegador solo
// manda la foto (base64) y el estilo elegido; esta función construye el
// prompt y llama a Cloudflare.
//
// Modelo: @cf/black-forest-labs/flux-2-klein-4b (Workers AI, nivel gratuito
// real — 10.000 "neuronas"/día, sin tarjeta). Probado a mano contra
// prueba-selector.jpg antes de conectarlo aquí: mantiene reconocibles caras,
// pelo y ropa de las 3 personas.

const RECONOCIBLE = 'manteniendo reconocibles las caras, el pelo y la ropa de las personas.';
// El texto real (CAPTIONS, en persona.js) se pone aparte, como HTML normal,
// perfectamente escrito siempre — nunca lo escribe la IA, que no acierta
// tildes/ñ ni evita que las letras se solapen ("¡Feliz cumpleaños!" salió
// como "cumpleanos" con letras encimadas). Este modelo (FLUX.2 klein) NO
// admite prompt negativo — "no incluyas texto" lo ignoró y siguió metiendo
// un rótulo (esta vez en inglés y mal escrito) de todos modos. Hay que
// describir en positivo qué aspecto tiene la superficie, no qué no debe
// llevar — confirmado con la documentación del modelo.
// Genérica a propósito — nunca nombra "globos": eso hacía que aparecieran
// globos en TODAS las creaciones (aniversario, navidad...) aunque no
// pegaran, solo por estar en esta frase compartida. Cada estilo pone sus
// propios elementos decorativos en su propio prompt, esta frase solo dice
// cómo deben ser (lisos, sin marcas, sin texto), sea cual sea el elemento.
const SOLO_DECORACION =
  'Los elementos decorativos son de colores lisos y limpios, sin ningún dibujo ni marca en su ' +
  'superficie. Es una escena puramente decorativa e ilustrada, sin ningún cartel, pancarta ni rótulo.';
// El pie de foto (CAPTIONS, en persona.js) siempre se pone en la misma
// franja (arriba) — para que nunca tape una cara, el hueco tiene que
// reservarse AL GENERAR, no calcularse después mirando la imagen ya hecha
// (analizar píxeles del resultado chocaría con el mismo bloqueo de canvas
// de Safari de antes, y además no es fiable). Se le pide encuadrar a las
// personas más abajo/centradas para que la franja superior quede siempre
// despejada.
const ESPACIO_TITULAR =
  'Encuadra a las personas en la mitad inferior de la imagen. La franja superior de la imagen ' +
  'queda despejada, solo con cielo, fondo liso o decoración de fondo — sin ninguna cara ni objeto ' +
  'importante ahí, para poder añadir un título encima. Ese cielo o fondo es un degradado suave y continuo, ' +
  'sin ninguna forma parecida a letras, números o símbolos.';

// Los prompts NO nombran la ocasión ("cumpleaños", "Navidad", "Año Nuevo"): al oír esas palabras el modelo
// dibuja por su cuenta un rótulo con ellas ("New Year Year", visto en pruebas 21-sep). Se describe el aspecto
// visual y ya está; el título real lo pone Nido encima como HTML.
const PROMPTS = {
  cumpleanos:
    'Convierte esta foto en una ilustración alegre y colorida de una fiesta, ' +
    'con globos y confeti. ' + SOLO_DECORACION + ' ' + ESPACIO_TITULAR + ' ' + RECONOCIBLE,
  aniversario:
    'Convierte esta foto en una ilustración elegante y romántica, ' +
    'con detalles florales y dorados. ' + SOLO_DECORACION + ' ' + ESPACIO_TITULAR + ' ' + RECONOCIBLE,
  navidad:
    'Convierte esta foto en una ilustración cálida y festiva de invierno, ' +
    'con nieve, luces cálidas, abetos y adornos rojos y dorados. ' + SOLO_DECORACION + ' ' + ESPACIO_TITULAR + ' ' + RECONOCIBLE,
  anonuevo:
    // Sin confeti aquí tampoco — solo la fiesta lo lleva.
    'Convierte esta foto en una ilustración festiva de una noche de gala, ' +
    'con fuegos artificiales dorados sobre un cielo azul noche despejado. ' + SOLO_DECORACION + ' ' + ESPACIO_TITULAR + ' ' + RECONOCIBLE,
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = process.env;
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Faltan CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN en el entorno del servidor' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { imageBase64, style } = payload;
  let prompt = PROMPTS[style];
  // Felicitación libre (25-sep, «otra»): la persona elige la ocasión (santo, jubilación, bautizo…) y el asistente manda una
  // DECORACIÓN descrita solo con cosas que se ven. Se limpia y se acota, y se mete en la misma plantilla que los estilos fijos
  // (sin rótulos, franja de arriba despejada para el título, caras reconocibles). El título lo pone la app encima, nunca la IA.
  if (style === 'otra') {
    const decoracion = String(payload.decoracion || '').replace(/[\r\n"«»<>{}]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (decoracion) {
      prompt = 'Convierte esta foto en una ilustración alegre y festiva, decorada con ' + decoracion + '. ' +
        SOLO_DECORACION + ' ' + ESPACIO_TITULAR + ' ' + RECONOCIBLE;
    }
  }
  if (!imageBase64 || !prompt) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Falta imageBase64 o "style" no es uno de: ${Object.keys(PROMPTS).join(', ')}, otra (con decoracion)` }),
    };
  }

  const form = new FormData();
  form.append('prompt', prompt);
  form.append('width', '1024');
  form.append('height', '1024');
  form.append('input_image_0', new Blob([Buffer.from(imageBase64, 'base64')], { type: 'image/jpeg' }), 'foto.jpg');

  const cfUrl =
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}` +
    '/ai/run/@cf/black-forest-labs/flux-2-klein-4b';

  let cfResponse;
  try {
    cfResponse = await fetch(cfUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
      body: form,
    });
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: 'No se pudo contactar con Cloudflare', detail: String(err) }) };
  }

  const data = await cfResponse.json();
  if (!data.success || !data.result || !data.result.image) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Cloudflare no devolvió una imagen', detail: data }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: data.result.image }),
  };
};
