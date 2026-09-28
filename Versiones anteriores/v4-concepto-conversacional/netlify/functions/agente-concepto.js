// Nido · concepto conversacional — versión desplegada del proxy local (servidor-concepto.mjs).
// Mismo motivo que netlify/functions/agente-voz.js: la clave de ElevenLabs vive solo aquí (variable
// de entorno del propio sitio de Netlify), nunca en el navegador. Agente DISTINTO del de
// agente-voz.js — este es el dedicado al concepto conversacional, con su propio prompt.

exports.handler = async () => {
  const { ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID } = process.env;
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Faltan ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID en el entorno de Netlify' }) };
  }
  try {
    const res = await fetch(
      'https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=' + encodeURIComponent(ELEVENLABS_AGENT_ID),
      { headers: { 'xi-api-key': ELEVENLABS_API_KEY } }
    );
    const data = await res.json();
    if (!res.ok || !data.signed_url) {
      return { statusCode: 502, body: JSON.stringify({ error: 'ElevenLabs no dio acceso', status: res.status }) };
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ signedUrl: data.signed_url }) };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: 'No se pudo contactar con ElevenLabs' }) };
  }
};
