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
const PORT = Number(process.env.PORT) || 8990; // PORT=8998 node servidor-local.mjs → otra copia para pruebas, sin tocar la del 8990
const ENV_PATH = path.join(ROOT, '.env');
if (fs.existsSync(ENV_PATH)) {
  fs.readFileSync(ENV_PATH, 'utf8').split('\n').forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); });
} else {
  console.log('⚠️  No encuentro .env — el agente de voz y crear-imagen no podrán conectar.');
}
// Una función que falla (p. ej. un cuerpo malformado) responde 500 en vez de tumbar el servidor entero.
async function conFuncion(res, llamar) {
  try {
    const out = await llamar();
    res.writeHead(out.statusCode, { 'content-type': 'application/json', ...(out.headers || {}) });
    res.end(out.body);
  } catch (err) {
    console.error('Función local falló:', (err && err.message) || err);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'fallo interno' }));
  }
}
const require = createRequire(import.meta.url);

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4' };

// ---- Editor visual de pollitos (js/editor-pollitos.js, ?editar=pollitos) ----
// Busca el bloque de una regla CSS por su selector exacto (tolerante a que el selector esté
// partido en varias líneas, como ".ob-step-4 .onboarding-pollito,\n.ob-step-5 ...") y devuelve
// dónde empieza y acaba su cuerpo, para poder tocar solo left/top sin rehacer el resto.
function buscarBloqueCSS(css, selector) {
  const partes = selector.split(',').map((s) => s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const patron = partes.join('\\s*,\\s*') + '\\s*\\{';
  const m = new RegExp(patron).exec(css);
  if (!m) return null;
  const bodyStart = m.index + m[0].length;
  const bodyEnd = css.indexOf('}', bodyStart);
  if (bodyEnd === -1) return null;
  return { bodyStart, bodyEnd };
}
function reemplazarPropiedadCSS(bloque, prop, valor) {
  // (^|[{;]): el bloque recibido ya viene SIN la '{' inicial (se quitó al localizarlo), así que la
  // primera propiedad del bloque no tiene ningún '{'/';' delante — solo el propio inicio de cadena.
  // Bug real, visto en la primera prueba: "left" (siempre la primera) no se sustituía nunca.
  const re = new RegExp('(^|[{;])(\\s*)' + prop + '(\\s*:\\s*)[^;]+(;)');
  if (re.test(bloque)) return bloque.replace(re, '$1$2' + prop + '$3' + valor + '$4');
  return ' ' + prop + ': ' + valor + ';' + bloque;
}

http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/__guardar-posicion') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const { file, selector, left, top } = JSON.parse(body || '{}');
      if (!file || !selector || !left || !top) throw new Error('faltan datos');
      const filePath = path.join(ROOT, file);
      if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath)) throw new Error('archivo no válido: ' + file);
      let css = fs.readFileSync(filePath, 'utf8');
      const bloque = buscarBloqueCSS(css, selector);
      if (!bloque) throw new Error('no encuentro el selector en ' + file + ': ' + selector);
      let cuerpo = css.slice(bloque.bodyStart, bloque.bodyEnd);
      cuerpo = reemplazarPropiedadCSS(cuerpo, 'left', left);
      cuerpo = reemplazarPropiedadCSS(cuerpo, 'top', top);
      css = css.slice(0, bloque.bodyStart) + cuerpo + css.slice(bloque.bodyEnd);
      fs.writeFileSync(filePath, css);
      console.log('✏️  Guardado', selector, '->', left, top, 'en', file);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: String((err && err.message) || err) }));
    }
    return;
  }
  if (req.url.startsWith('/.netlify/functions/agente-voz')) {
    await conFuncion(res, () => require('./netlify/functions/agente-voz.js').handler());
    return;
  }
  if (req.url.startsWith('/.netlify/functions/ver-foto')) {
    let body = '';
    for await (const chunk of req) body += chunk;
    await conFuncion(res, () => require('./netlify/functions/ver-foto.js').handler({ httpMethod: req.method, body }));
    return;
  }
  if (req.url.startsWith('/.netlify/functions/crear-imagen')) {
    let body = '';
    for await (const chunk of req) body += chunk;
    await conFuncion(res, () => require('./netlify/functions/crear-imagen.js').handler({ httpMethod: 'POST', body }));
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
