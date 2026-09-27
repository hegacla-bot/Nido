// Nido · acceso temporal al asistente de voz (ElevenLabs Agents).
//
// La clave de ElevenLabs vive solo aquí, en el servidor (variable de entorno secreta
// ELEVENLABS_API_KEY). El navegador pide una URL firmada que caduca a los pocos minutos y
// con ella abre la conversación; así nadie que abra la página puede usar la cuenta.
//
// Qué agente se abre: la variable de entorno ELEVENLABS_AGENT_ID (el id del agente nuevo, el que
// se crea con agente/PROMPT.md y agente/HERRAMIENTAS.md; no es secreto, es solo un nombre). Si no está puesta, se usa el
// agente de siempre (el id de abajo), así nada se rompe mientras no se cambie. Cómo ponerla: agente/LEEME.md.
// En local (servidor-local.mjs) se lee del .env, igual que la clave; tras cambiarlo hay que reiniciar ese servidor.

const AGENT_ID = (process.env.ELEVENLABS_AGENT_ID || '').trim() || 'agent_6001m325cmttf4ns277mgny82k4d';

exports.handler = async () => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return { statusCode: 500, body: JSON.stringify({ error: 'Falta ELEVENLABS_API_KEY en el servidor' }) };
  try {
    const res = await fetch(
      'https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=' + encodeURIComponent(AGENT_ID),
      { headers: { 'xi-api-key': key } }
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
