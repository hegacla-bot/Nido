// Nido · reconocimiento de personas en el propio dispositivo (face-api.js, sin enviar fotos a ningún servidor).
//
// Qué hace:
//  - detect(img): encuentra las caras de una foto y una "huella" (vector de 128 números) de cada una.
//  - Personas guardadas: cuando alguien le dice a Nido quién es una cara, se guarda su huella con ese nombre
//    (localStorage). La próxima vez que aparezca esa cara, en la foto que sea, se reconoce sola.
//  - photosOf(persona): recorre las fotos de la biblioteca y devuelve en las que sale esa persona.
//  - zoneFor(...): un contorno tipo "busto" (cabeza + hombros) alrededor de la cara tocada, en % de la caja
//    de la foto — mismo formato que las siluetas hechas con Vision, así reutiliza el trazo azul de persona.js.
//
// Limitación conocida: el contorno es aproximado (se calcula desde la cara), no la silueta exacta de la
// persona. Para silueta exacta en fotos cualquiera haría falta un modelo de segmentación además.

window.Reconocimiento = (function () {
  const MODELS = 'assets/models';
  const MAX_SIDE = 800;        // se reduce la foto antes de analizarla: más rápido, y las caras siguen siendo grandes
  const MATCH_DIST = 0.55;     // distancia máxima entre huellas para decir "es la misma persona" (0,6 es el estándar; algo más estricto evita falsos positivos)
  const STORE_KEY = 'nido-personas-v1';
  const BOX_W = 393, BOX_H = 390; // caja de .detail-media__item (object-fit: cover)

  let ready = null;
  const cache = new Map(); // src -> Promise<caras>

  // La librería pesa 1,3 MB: se descarga la primera vez que hace falta (no al abrir la app), sin bloquear nada.
  let libCargada = null;
  function cargarLibreria() {
    if (window.faceapi) return Promise.resolve();
    if (libCargada) return libCargada;
    libCargada = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/face-api.js';
      s.onload = ok;
      s.onerror = () => { libCargada = null; ko(new Error('No se pudo cargar face-api.js')); };
      document.head.appendChild(s);
    });
    return libCargada;
  }

  function load() {
    if (ready) return ready;
    ready = (async () => {
      await cargarLibreria();
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS);
    })();
    ready.catch(() => { ready = null; });
    return ready;
  }

  function toCanvas(img) {
    const w = img.naturalWidth || img.videoWidth, h = img.naturalHeight || img.videoHeight;
    const k = Math.min(1, MAX_SIDE / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return { canvas: c, k, w, h };
  }

  // Caras de una imagen: [{ box:{x,y,w,h} en píxeles de la imagen original, descriptor: Float32Array(128) }]
  function detect(img) {
    const key = img.currentSrc || img.src;
    if (cache.has(key)) return cache.get(key);
    const p = (async () => {
      await load();
      if (!img.complete) await new Promise((r) => { img.onload = r; img.onerror = r; });
      const { canvas, k, w, h } = toCanvas(img);
      const found = await faceapi
        .detectAllFaces(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.75 }))
        .withFaceLandmarks()
        .withFaceDescriptors();
      return found.map((f) => ({
        box: { x: f.detection.box.x / k, y: f.detection.box.y / k, w: f.detection.box.width / k, h: f.detection.box.height / k },
        descriptor: f.descriptor,
        natural: { w, h },
      }));
    })();
    cache.set(key, p);
    p.catch(() => cache.delete(key));
    return p;
  }

  // ---- Personas guardadas ----
  let people = [];
  try {
    people = (JSON.parse(localStorage.getItem(STORE_KEY)) || []).map((p) => ({
      ...p, descriptors: p.descriptors.map((d) => Float32Array.from(d)),
    }));
  } catch (e) { people = []; }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(people.map((p) => ({ ...p, descriptors: p.descriptors.map((d) => Array.from(d)) }))));
    } catch (e) { /* sin almacenamiento: se pierde al recargar, no pasa nada más */ }
  }

  function dist(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s);
  }

  // Persona guardada que más se parece a esta huella (o null).
  function match(descriptor) {
    let best = null, bestD = Infinity;
    people.forEach((p) => p.descriptors.forEach((d) => {
      const x = dist(descriptor, d);
      if (x < bestD) { bestD = x; best = p; }
    }));
    return bestD <= MATCH_DIST ? best : null;
  }

  function addPerson(name, descriptor, avatar) {
    const p = { id: 'r' + Date.now().toString(36) + people.length, name, descriptors: [descriptor], avatar: avatar || null };
    people.push(p);
    save();
    return p;
  }

  // Cada vez que se reconoce una cara guardada se refuerza su huella (hasta 6), para reconocerla mejor con el tiempo.
  function reinforce(person, descriptor) {
    if (person.descriptors.length < 6) { person.descriptors.push(descriptor); save(); }
  }

  // Personas de la biblioteca de ejemplo: nombre + huellas de sus caras. Si ya hay una guardada con esa cara (aunque sin nombre)
  // se le pone el nombre en vez de crear otra; si ya tiene nombre, se respeta el que puso la persona. Se puede repetir sin duplicar.
  function sembrar(lista) {
    lista.forEach((s) => {
      const nuevas = s.descriptors.map((d) => Float32Array.from(d));
      const cerca = (p) => p.descriptors.some((d) => nuevas.some((n) => dist(d, n) <= MATCH_DIST));
      // Todas las personas guardadas con esa cara (o ese nombre) son la misma: se unen en una.
      const iguales = people.filter((p) => (s.name && p.name === s.name) || (!p.name || p.name === s.name) && cerca(p));
      if (!iguales.length) { people.push({ id: 'r' + Date.now().toString(36) + people.length, name: s.name || null, descriptors: nuevas.slice(0, 8), avatar: null }); return; }
      const destino = iguales.find((p) => p.name) || iguales[0]; // si alguna ya tiene nombre (el que puso la persona), se queda con él
      if (!destino.name && s.name) destino.name = s.name;
      iguales.filter((p) => p !== destino).forEach((p) => { p.descriptors.forEach((d) => destino.descriptors.push(d)); people.splice(people.indexOf(p), 1); });
      nuevas.forEach((n) => { if (destino.descriptors.length < 8 && !destino.descriptors.some((d) => dist(d, n) < 0.05)) destino.descriptors.push(n); });
      destino.descriptors = destino.descriptors.slice(0, 8);
    });
    save();
  }

  const byId = (id) => people.find((p) => p.id === id) || null;

  function rename(person, name) { person.name = name; save(); }
  function setAvatar(person, avatar) { person.avatar = avatar; save(); }
  const avatarOf = (img, f) => ({ src: img.currentSrc || img.src, nw: f.natural.w, nh: f.natural.h, x: f.box.x, y: f.box.y, w: f.box.w, h: f.box.h });

  // Las caras de fondo, diminutas o borrosas (menos del 6 % del ancho de la foto), no cuentan como personas.
  const caraGrande = (f) => f.box.w / f.natural.w >= 0.06;

  // Recorre TODA la biblioteca: agrupa las caras (misma persona = misma huella) y devuelve, por persona, en qué fotos sale.
  // Las caras que coinciden con una persona guardada se le asignan; las nuevas que salen en 2 o más fotos distintas se
  // guardan como personas SIN nombre (Nido luego pregunta quién es). También devuelve qué parejas salen juntas.
  async function organize(imgs, onProgress) {
    const found = [];
    let n = 0;
    for (const img of imgs) {
      // Las caras de fondo, diminutas o borrosas, no cuentan como personas.
      try { (await detect(img)).filter(caraGrande).forEach((f) => found.push({ img, f })); } catch (e) { /* una foto que falla no para el resto */ }
      if (onProgress) onProgress(++n, imgs.length);
      await new Promise((ok) => setTimeout(ok, 25)); // respiro para que la pantalla siga respondiendo mientras se busca
    }
    const groups = [];
    found.forEach(({ img, f }) => {
      const p = match(f.descriptor);
      let g = groups.find((x) => (p && x.person === p) || (!p && !x.person && dist(x.descriptors[0], f.descriptor) <= MATCH_DIST));
      if (!g) { g = { person: p, descriptors: [], items: [] }; groups.push(g); }
      g.descriptors.push(f.descriptor);
      g.items.push({ img, f });
    });
    const area = (it) => it.f.box.w * it.f.box.h;
    const out = [];
    groups.forEach((g) => {
      const distinct = [...new Set(g.items.map((i) => i.img))];
      const best = g.items.slice().sort((a, b) => area(b) - area(a))[0];
      if (!g.person) {
        if (distinct.length < 2) return; // una cara suelta (¿alguien de fondo?) no es "una persona" de la familia
        g.person = addPerson(null, g.descriptors[0], avatarOf(best.img, best.f));
      } else {
        g.person.avatar = avatarOf(best.img, best.f); // el avatar de una sesión anterior apunta a fotos que ya no existen
        reinforce(g.person, g.descriptors[0]);
        save();
      }
      out.push({ person: g.person, imgs: distinct });
    });
    // Parejas que salen juntas en 2 o más fotos: sirven para los "grupos de personas".
    const pares = {};
    imgs.forEach((img) => {
      const aqui = out.filter((o) => o.imgs.includes(img)).map((o) => o.person);
      for (let i = 0; i < aqui.length; i++) for (let j = i + 1; j < aqui.length; j++) {
        const k = [aqui[i].id, aqui[j].id].sort().join('+');
        (pares[k] = pares[k] || { a: aqui[i], b: aqui[j], imgs: [] }).imgs.push(img);
      }
    });
    return { personas: out, grupos: Object.values(pares).filter((p) => p.imgs.length >= 2) };
  }

  // Fotos de la biblioteca (elementos <img>) en las que sale esta persona. onProgress(n, total) opcional.
  async function photosOf(person, imgs, onProgress) {
    const out = [];
    let n = 0;
    for (const img of imgs) {
      try {
        const faces = await detect(img);
        // Mismo criterio que organize (el que llena las fichas de Personas): una cara que cuente (caraGrande) y que se parezca MÁS a esta
        // persona que a ninguna otra. Antes valía cualquier cara de fondo y estar a ≤ MATCH_DIST de su primera huella aunque se
        // pareciera más a otra: al abrir una ficha le crecían las fotos (Clara 9 → 12, una sin nombre 7 → 13) y las cifras que
        // decía Nidi dejaban de coincidir con la pantalla y con el álbum.
        if (faces.some((f) => caraGrande(f) && match(f.descriptor) === person)) out.push(img);
      } catch (e) { /* una foto que falla no detiene las demás */ }
      if (onProgress) onProgress(++n, imgs.length);
    }
    return out;
  }

  // ---- Geometría: de píxeles de la foto a % de la caja visible (393×390, object-fit: cover) ----
  function cover(nat) {
    const s = Math.max(BOX_W / nat.w, BOX_H / nat.h);
    return { s, ox: (nat.w * s - BOX_W) / 2, oy: (nat.h * s - BOX_H) / 2 };
  }
  const toPct = (nat, x, y) => {
    const c = cover(nat);
    return [(x * c.s - c.ox) / BOX_W * 100, (y * c.s - c.oy) / BOX_H * 100];
  };
  const fromPct = (nat, px, py) => {
    const c = cover(nat);
    return [(px / 100 * BOX_W + c.ox) / c.s, (py / 100 * BOX_H + c.oy) / c.s];
  };

  // Cara tocada: la que esté más cerca del punto (en % de la caja) dentro de su "zona de cuerpo".
  function faceAt(faces, pxPct, pyPct) {
    let best = null, bestD = Infinity;
    faces.forEach((f) => {
      const [x, y] = fromPct(f.natural, pxPct, pyPct);
      const b = f.box;
      const inside = x >= b.x - 1.2 * b.w && x <= b.x + 2.2 * b.w && y >= b.y - 0.5 * b.h && y <= b.y + 5 * b.h;
      if (!inside) return;
      const d = Math.hypot(x - (b.x + b.w / 2), (y - (b.y + b.h * 1.5)) * 0.6);
      if (d < bestD) { bestD = d; best = f; }
    });
    return best;
  }

  const clamp = (v) => Math.max(-2, Math.min(102, v));

  // Contorno "busto" alrededor de una cara, en % de la caja visible.
  function bustPolygon(face) {
    const { x, y, w, h } = face.box, nat = face.natural;
    const cx = x + w / 2;
    const pts = [];
    for (let a = 180; a <= 360; a += 15) { // cabeza (mitad superior de una elipse)
      const r = (a * Math.PI) / 180;
      pts.push([cx + 0.78 * w * Math.cos(r), y + 0.5 * h + 0.82 * h * Math.sin(r)]);
    }
    pts.push([cx + 0.5 * w, y + 1.1 * h], [cx + 1.55 * w, y + 1.45 * h], [cx + 1.85 * w, y + 2.2 * h],
      [cx + 1.85 * w, y + 5 * h], [cx - 1.85 * w, y + 5 * h], [cx - 1.85 * w, y + 2.2 * h],
      [cx - 1.55 * w, y + 1.45 * h], [cx - 0.5 * w, y + 1.1 * h]);
    return pts.map(([px, py]) => {
      const [a, b] = toPct(nat, px, py);
      return [Math.round(clamp(a) * 100) / 100, Math.round(clamp(b) * 100) / 100];
    });
  }

  // Recuadro de la cara en % de la caja: [centroX, centroY, ancho] (formato de `face` en PERSON_ZONES).
  function faceBox(face) {
    const { x, y, w, h } = face.box;
    const [cx, cy] = toPct(face.natural, x + w / 2, y + h / 2);
    return [Math.round(cx * 10) / 10, Math.round(cy * 10) / 10, Math.round((w * cover(face.natural).s) / BOX_W * 1000) / 10];
  }

  return {
    load, detect, match, addPerson, reinforce, byId, photosOf, faceAt, bustPolygon, faceBox, rename, setAvatar, organize, sembrar,
    get people() { return people; },
  };
})();
