// Nido · concepto conversacional — servidor SOLO LOCAL, para probar en el móvil por wifi.
// No toca Netlify ni ningún despliegue: sirve los archivos de esta carpeta y hace de intermediario
// con ElevenLabs para que la clave nunca llegue al navegador (mismo patrón que netlify/functions/,
// pero sin desplegar nada). Se para con Ctrl+C.
//
// Antes de arrancarlo, crea el archivo .env.concepto en esta misma carpeta con:
//   ELEVENLABS_API_KEY=tu_clave
//   ELEVENLABS_AGENT_ID=el_id_del_agente_dedicado_a_este_concepto
//
// Arrancar:  node servidor-concepto.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const PORT = 8299;

// .env.concepto: variables solo locales, nunca se suben a ningún sitio.
const ENV_PATH = path.join(ROOT, '.env.concepto');
const env = {};
if (fs.existsSync(ENV_PATH)) {
  fs.readFileSync(ENV_PATH, 'utf8').split('\n').forEach((linea) => {
    const m = linea.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  });
} else {
  console.log('⚠️  Falta .env.concepto (ELEVENLABS_API_KEY y ELEVENLABS_AGENT_ID). El asistente no podrá conectar hasta crearlo.');
}

// Sin ";charset=utf-8" el navegador adivina la codificación y rompe las tildes/ñ del archivo
// (el <meta charset> propio se quitó del HTML porque, al publicarlo como Artifact, esa etiqueta
// la añade la propia plataforma — aquí, sirviendo el archivo directamente, hay que decirlo aquí).
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4' };

http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/agente-concepto')) {
    if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_AGENT_ID) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Falta .env.concepto con ELEVENLABS_API_KEY y ELEVENLABS_AGENT_ID' }));
      return;
    }
    try {
      const r = await fetch(
        'https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=' + encodeURIComponent(env.ELEVENLABS_AGENT_ID),
        { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY } }
      );
      const data = await r.json();
      res.writeHead(r.ok && data.signed_url ? 200 : 502, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(data.signed_url ? { signedUrl: data.signed_url } : { error: 'ElevenLabs no dio acceso' }));
    } catch (e) {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'No se pudo contactar con ElevenLabs' }));
    }
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/concepto-conversacional.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('No encontrado'); return; }
  const tipo = TIPOS[path.extname(f)] || 'application/octet-stream';
  const total = fs.statSync(f).size;
  // Safari de iPhone exige "Range" de verdad para reproducir <video>: sin esto (petición completa
  // de golpe, sin trocear) el vídeo se queda en negro/blanco y nunca dispara "playing" — bug real,
  // visto en el móvil (el pollito saliendo del cascarón no arrancaba y se quedaba en blanco).
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? parseInt(m[2], 10) : total - 1;
    res.writeHead(206, {
      'content-type': tipo, 'content-length': end - start + 1,
      'content-range': 'bytes ' + start + '-' + end + '/' + total, 'accept-ranges': 'bytes',
    });
    fs.createReadStream(f, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': tipo, 'content-length': total, 'accept-ranges': 'bytes' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => {
  const ip = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  console.log('Concepto Nido en marcha (solo local, nada desplegado):');
  console.log('  → http://localhost:' + PORT);
  if (ip) console.log('  → http://' + ip + ':' + PORT + '  (para probarlo desde el móvil, misma wifi)');
});
