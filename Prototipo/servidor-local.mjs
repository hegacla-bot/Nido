// Nido · servidor SOLO LOCAL para probar sin desplegar nada (nunca se despliega, mismo patrón que
// ya se usó antes esta sesión). Sirve los archivos tal cual están en disco (con soporte de Range,
// que iOS Safari necesita para los vídeos) y ejecuta de verdad las dos funciones de Netlify
// (agente-voz, crear-imagen) contra sus APIs reales, leyendo las claves del .env de este proyecto.
// Arrancar: node servidor-local.mjs — y si se toca alguna función, hay que reiniciarlo (require
// se queda en memoria, no relee el archivo solo).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const PORT = 8990;
const ENV_PATH = path.join(ROOT, '.env');
if (fs.existsSync(ENV_PATH)) {
  fs.readFileSync(ENV_PATH, 'utf8').split('\n').forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); });
} else {
  console.log('⚠️  No encuentro .env — el agente de voz y crear-imagen no podrán conectar.');
}
const require = createRequire(import.meta.url);

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4' };

http.createServer(async (req, res) => {
  if (req.url.startsWith('/.netlify/functions/agente-voz')) {
    const { handler } = require('./netlify/functions/agente-voz.js');
    const out = await handler();
    res.writeHead(out.statusCode, { 'content-type': 'application/json', ...(out.headers || {}) });
    res.end(out.body);
    return;
  }
  if (req.url.startsWith('/.netlify/functions/crear-imagen')) {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { handler } = require('./netlify/functions/crear-imagen.js');
    const out = await handler({ httpMethod: 'POST', body });
    res.writeHead(out.statusCode, { 'content-type': 'application/json', ...(out.headers || {}) });
    res.end(out.body);
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('No encontrado'); return; }
  const tipo = TIPOS[path.extname(f)] || 'application/octet-stream';
  const total = fs.statSync(f).size;
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m[1] ? parseInt(m[1], 10) : 0, end = m[2] ? parseInt(m[2], 10) : total - 1;
    res.writeHead(206, { 'content-type': tipo, 'content-length': end - start + 1, 'content-range': 'bytes ' + start + '-' + end + '/' + total, 'accept-ranges': 'bytes' });
    fs.createReadStream(f, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': tipo, 'content-length': total, 'accept-ranges': 'bytes' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => {
  const ip = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  console.log('Prueba local (nada desplegado):');
  console.log('  → http://localhost:' + PORT);
  if (ip) console.log('  → http://' + ip + ':' + PORT + '  (para probarlo desde el móvil, misma wifi)');
});
