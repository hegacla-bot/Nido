// Nido · selección de persona en una foto — mantener pulsado sobre alguien
// traza un contorno brillante alrededor de su silueta real (no un óvalo) y,
// al completarse, la "despega" un poco de la foto (lift + drop-shadow) y
// aparece el pollito con 3 opciones. Inspirado en "levantar sujeto" de iOS:
// ahí la foto NUNCA se oscurece, así que aquí tampoco — a diferencia de la
// primera versión de esta función, que sí atenuaba toda la pantalla.
//
// Sin reconocimiento facial real: las siluetas son polígonos trazados a mano
// (puntos en % del recorte real de .detail-media__item, medidos con Chrome
// headless + capturas 1:1, no a ojo) — ver SESSION-NOTES para el método.

window.PersonaSelect = (function () {
  const HOLD_MS = 650; // el contorno se dibuja durante este tiempo — mantener pulsado = trazarlo

  // Zonas por foto: cada persona es un polígono en % del recorte visible
  // (0-100 en X = % del ancho de .detail-media__item, 0-100 en Y = % del
  // alto) — no de la imagen original. Las 3 primeras fotos son las de
  // Figma (rectángulos simples, heredados de la v1 de esta función); las de
  // "prueba-selector.jpg" (foto real, no de Figma) llevan un contorno
  // trazado a mano sobre la persona.
  // Identificación SIMULADA con datos (decisión del usuario, sesión 4): cada zona
  // lleva un personId y esta tabla dice quién es y en qué fotos sale. Cuando se
  // metan las imágenes reales, esta tabla se sustituye por face-api.js — ver
  // SESSION-NOTES.md, "Sesión 4 · identificar persona al tocar". `face` es el
  // recuadro de la cara [centroX, centroY, ancho] en % del recorte de la foto,
  // para el avatar de la cabecera de "sus fotos" (sin canvas, ver buildAvatar).
  // name: título de la cabecera de la persona (Figma: "Ainhoa Nieta"); ask: cómo se la nombra
  // en "¿Quieres ver más fotos de …?".
  let personaAbiertaId = null; // ficha de persona que se ha abierto (la usa el asistente de voz para saber de quién se habla)
  const PERSONAS = {
    clara: { name: 'Clara', ask: 'Clara', photos: ['people-grupo-venecia.jpg', 'album-museo.webp', 'album-venecia.webp', 'prueba-selector.jpg', 'people-group-1.png'] },
    ainhoa: { name: 'Ainhoa Nieta', ask: 'tu nieta Ainhoa', photos: ['people-grupo-venecia.jpg', 'album-museo.webp', 'prueba-selector.jpg', 'people-group-2.png', 'people-group-1.png'] },
    sinnombre: { name: 'Persona sin nombre', ask: 'esta persona', photos: ['album-venecia.webp', 'prueba-selector.jpg', 'people-group-2.png', 'people-person-1.jpg'] },
  };
  // Pie de foto de las tarjetas de la persona (datos de ejemplo, como en Figma).
  const CAPTIONS_FOTO = {
    'people-grupo-venecia.jpg': 'Clara y Ana',
    'album-venecia.webp': 'Clara y Ana',
    'album-museo.webp': 'Clara y Ainhoa',
    'people-group-1.png': 'Clara y Ainhoa',
    'people-group-2.png': 'Clara y Ainhoa',
    'people-person-1.jpg': 'Ainhoa',
    'prueba-selector.jpg': 'Clara, Ainhoa y Pablo',
  };


  const PERSON_ZONES = {
    'people-group-1.png': [
      { name: 'la persona de la izquierda', personId: 'clara', face: [39, 36, 28], points: rect(18.5, 19, 56.5, 90) },
      { name: 'la persona de la derecha', personId: 'ainhoa', face: [66, 31, 28], points: rect(53.5, 7.5, 93, 96) },
    ],
    'people-group-2.png': [
      { name: 'la persona de la izquierda', personId: 'ainhoa', face: [32, 42, 28], points: rect(9, 28, 53, 99) },
      { name: 'la persona de la derecha', personId: 'sinnombre', face: [66, 44, 28], points: rect(46, 30, 92, 99) },
    ],
    // Segmentación real (Vision, VNGeneratePersonInstanceMaskRequest), sesión 4 —
    // mismo método que prueba-selector.jpg. Ver tools/segment-personas.swift.
    'album-venecia.webp': [
      {
        name: 'la persona de la izquierda',
        personId: 'clara',
        face: [50, 43, 22],
        points: [
          [54.53, 34.26], [52.27, 33.25], [47.73, 34.01], [44.21, 38.58], [39.67, 49.49],
          [33.88, 52.54], [27.84, 60.41], [17.76, 84.26], [17.01, 90.61], [19.78, 94.67],
          [16.75, 99.75], [53.53, 99.75], [56.3, 92.89], [58.82, 93.4], [60.33, 91.88],
          [61.59, 77.41], [60.33, 73.86], [57.81, 72.34], [58.06, 62.94], [61.84, 58.63],
          [61.84, 56.85], [61.33, 57.87], [58.82, 54.06], [56.8, 38.83],
        ],
      },
      {
        name: 'la persona de la derecha',
        personId: 'sinnombre',
        face: [66.7, 42, 22],
        points: [
          [64.1, 32.74], [60.33, 35.53], [59.32, 39.59], [59.57, 45.18], [61.59, 48.22],
          [60.07, 48.98], [59.32, 53.81], [61.33, 58.63], [58.31, 62.69], [57.81, 71.57],
          [61.08, 75.89], [61.33, 79.44], [59.82, 79.7], [61.33, 81.98], [60.83, 91.12],
          [55.29, 94.42], [56.8, 99.75], [90.3, 99.75], [92.06, 97.97], [89.8, 86.8],
          [95.84, 78.43], [96.85, 71.57], [89.54, 59.64], [88.54, 52.28], [85.01, 50.76],
          [79.97, 44.67], [75.44, 43.91], [73.68, 36.55], [69.9, 33.25],
        ],
      },
    ],
    'album-museo.webp': [
      {
        name: 'la persona de la izquierda',
        personId: 'ainhoa',
        face: [37, 42, 30],
        points: [
          [40.0, 32.47], [35.4, 32.06], [30.0, 35.89], [26.4, 43.35], [17.0, 52.02],
          [16.6, 70.96], [6.6, 106.63], [8.2, 111.67], [13.4, 112.88], [10.4, 139.48],
          [28.2, 139.48], [30.0, 118.52], [32.2, 119.93], [34.2, 139.48], [50.4, 139.48],
          [48.8, 102.8], [46.4, 91.32], [49.0, 80.43], [46.4, 76.0], [39.2, 74.18],
          [45.8, 65.92], [50.4, 55.24], [40.0, 52.02], [45.2, 42.34], [44.2, 35.49],
        ],
      },
      {
        name: 'la persona de la derecha',
        personId: 'clara',
        face: [67, 44.6, 30],
        points: [
          [65.8, 34.48], [58.8, 37.71], [54.8, 48.19], [56.6, 54.64], [52.8, 57.05],
          [51.2, 55.04], [43.8, 68.74], [44.8, 75.39], [47.6, 76.8], [49.8, 84.06],
          [47.4, 96.56], [49.4, 105.42], [50.6, 139.48], [91.2, 139.48], [82.2, 104.01],
          [86.2, 103.0], [84.6, 100.99], [90.4, 86.28], [88.4, 62.09], [80.0, 58.67],
          [77.0, 54.03], [73.4, 39.32], [70.2, 35.69],
        ],
      },
    ],
    'people-grupo-venecia.jpg': [
      {
        name: 'la persona de la izquierda',
        personId: 'clara',
        face: [43.4, 36.7, 22],
        points: [
          [44.53, 28.65], [38.7, 30.78], [34.46, 45.2], [24.75, 52.14], [25.46, 53.38],
          [18.04, 69.93], [14.86, 80.96], [14.33, 86.65], [16.1, 87.54], [12.39, 96.09],
          [15.21, 99.82], [17.86, 99.82], [20.16, 97.51], [21.57, 99.64], [21.22, 98.04],
          [23.34, 97.51], [23.87, 99.82], [49.12, 99.82], [51.59, 90.75], [54.77, 88.43],
          [54.06, 85.94], [49.82, 82.38], [49.65, 79.36], [52.12, 74.91], [55.47, 73.67],
          [53.88, 62.1], [55.12, 56.05], [51.77, 51.25], [51.24, 38.61], [47.7, 31.14],
        ],
      },
      {
        name: 'la persona de la derecha',
        personId: 'ainhoa',
        face: [61.7, 31.7, 22],
        points: [
          [60.77, 23.13], [56.0, 28.11], [52.47, 43.24], [51.94, 51.25], [55.12, 57.12],
          [53.53, 62.28], [55.65, 68.15], [55.47, 73.67], [50.18, 77.22], [51.77, 75.44],
          [49.82, 81.85], [55.12, 87.37], [59.89, 99.82], [82.67, 99.82], [82.67, 95.37],
          [87.43, 90.21], [90.08, 83.63], [93.26, 81.85], [94.5, 77.94], [91.67, 61.57],
          [83.37, 44.66], [80.02, 41.46], [79.67, 37.01], [71.19, 36.65], [69.6, 27.76],
          [67.3, 23.67],
        ],
      },
    ],
    // Segmentación real (Vision) de las fotos del carrusel de Home, sesión 6: cualquier foto con gente
    // permite seleccionar personas, venga de la pantalla que venga.
    'memory-baby.png': [
      { name: 'la persona de la izquierda', personId: 'sinnombre', face: [25.0, 39.2, 18.9], points: [[31.05, 29.68], [27.86, 31.19], [26.18, 30.62], [22.99, 32.89], [20.17, 32.89], [17.92, 35.35], [10.23, 38.19], [5.92, 41.97], [7.42, 44.8], [6.29, 46.88], [8.17, 49.15], [7.6, 51.61], [12.48, 59.55], [13.61, 62.95], [15.11, 63.33], [16.23, 65.41], [18.11, 65.22], [20.55, 63.52], [22.42, 67.49], [24.3, 65.78], [24.11, 62.19], [22.61, 58.79], [25.61, 56.52], [26.36, 57.09], [26.93, 55.2], [26.18, 54.25], [27.86, 53.69], [31.43, 54.44], [36.68, 51.8], [36.68, 50.47], [41.75, 45.56], [43.81, 41.97], [41.56, 36.29], [33.87, 32.33]] },
      { name: 'la persona de la derecha', personId: 'sinnombre', face: [23.5, 71.5, 18.9], points: [[15.3, 62.57], [17.55, 68.05], [17.55, 73.16], [16.42, 72.97], [16.98, 72.02], [13.61, 67.3], [12.48, 69.75], [16.8, 73.72], [16.42, 76.18], [17.55, 78.83], [20.92, 81.1], [23.55, 87.15], [21.49, 90.36], [21.86, 95.84], [20.55, 93.76], [18.67, 94.33], [15.3, 92.63], [13.42, 94.71], [13.42, 99.81], [24.49, 99.81], [22.99, 91.87], [25.61, 93.76], [28.8, 99.81], [33.68, 99.81], [34.43, 98.68], [33.49, 99.05], [31.05, 92.44], [27.49, 86.77], [30.3, 73.91], [28.8, 72.02], [23.74, 71.08], [20.36, 62.19]] },
    ],
    'memory-kids-costumes.png': [
      { name: 'la persona de la izquierda', personId: 'ainhoa', face: [39.5, 24.8, 50.0], points: [[44.43, -0.38], [41.29, -0.24], [39.14, 9.55], [35.14, 8.68], [33.86, 34.74], [24.14, 38.2], [8.14, 50.43], [13.71, 59.07], [12.0, 73.03], [14.29, 72.75], [15.0, 81.67], [11.71, 100.24], [52.0, 100.24], [50.29, 91.32], [56.14, 82.53], [55.14, 89.16], [57.71, 89.44], [62.0, 74.04], [65.57, 73.32], [70.43, 67.56], [67.43, 56.48], [53.14, 37.33], [59.14, 28.98], [58.43, 24.81], [62.71, 11.42], [56.43, 11.13], [53.71, 6.53], [51.57, 8.83], [42.57, 8.97]] },
      { name: 'la persona de la derecha', personId: 'clara', face: [74.3, 34.6, 41.1], points: [[80.29, 14.15], [74.0, 15.88], [70.43, 14.01], [61.14, 19.19], [58.71, 24.95], [59.0, 30.85], [53.86, 36.04], [55.0, 40.07], [63.86, 50.0], [72.0, 66.12], [71.29, 68.57], [68.0, 69.72], [68.14, 74.18], [64.0, 75.19], [62.14, 84.41], [60.43, 84.84], [58.14, 91.46], [55.0, 91.46], [53.71, 96.93], [55.71, 100.24], [78.29, 100.24], [81.14, 95.49], [82.14, 84.69], [76.86, 57.63], [78.71, 55.76], [77.43, 49.71], [84.71, 48.56], [85.0, 45.83], [92.43, 39.2], [94.71, 33.01], [94.14, 29.13], [91.29, 27.4], [81.71, 32.73], [84.14, 23.22]] },
    ],
    'memory-wedding.png': [
      { name: 'la persona de la izquierda', personId: 'clara', face: [24.6, 11.9, 43.4], points: [[35.7, -9.96], [28.21, -7.83], [24.57, -2.22], [24.76, 13.83], [9.79, 20.41], [4.22, 33.17], [2.88, 59.09], [5.76, 70.5], [3.65, 87.52], [5.76, 89.65], [6.53, 117.5], [24.76, 117.5], [31.67, 89.84], [28.41, 87.14], [23.99, 77.46], [38.0, 35.49], [44.34, 31.24], [46.07, 23.12], [38.2, 17.12], [43.38, -3.0], [41.27, -7.83]] },
      { name: 'la persona de la derecha', personId: 'sinnombre', face: [59.6, 31.5, 57.0], points: [[56.81, 2.81], [44.72, 8.22], [46.07, 27.37], [38.58, 34.72], [24.18, 77.66], [30.13, 84.62], [30.33, 74.76], [41.84, 52.32], [41.46, 66.05], [31.48, 85.01], [32.82, 89.84], [24.95, 117.5], [74.28, 117.5], [71.79, 97.0], [76.58, 96.42], [72.36, 92.74], [71.98, 64.89], [82.92, 91.0], [87.72, 93.13], [80.81, 66.05], [93.28, 50.39], [93.86, 34.33], [86.76, 22.92], [69.87, 20.79], [64.3, 14.02], [62.76, 4.93]] },
    ],
    'people-person-1.jpg': [
      { name: 'esta persona', personId: 'sinnombre', face: [50, 40, 44], points: rect(10, 10, 90, 99) },
    ],
    // Puntos extraídos de una segmentación real, no dibujados a mano — ver
    // tools/segment-personas.swift. Cuerpo entero CON los brazos: usa
    // VNGeneratePersonInstanceMaskRequest (API específica de personas de
    // Vision framework, distinta de la genérica VNGenerateForegroundInstance-
    // MaskRequest que se probó primero). La genérica, sobre la foto entera,
    // fusionaba a las 3 personas en un solo "instance" porque sus brazos se
    // tocan — de ahí que la v4/v5 de esta función recortara cara por cara y
    // se cortara en los hombros. La API de personas SÍ separa a las 3
    // limpiamente, cuerpo entero, sin recortar nada de antemano: el modelo
    // entiende "persona" como concepto (probablemente con pose corporal por
    // debajo), no solo "región de color conectada" como la genérica. El
    // contorno se extrajo con cv2.findContours + approxPolyDP directamente
    // sobre la máscara a resolución completa (tools/contour-from-mask.py).
    'prueba-selector.jpg': [
      {
        name: 'la persona de la izquierda',
        personId: 'clara',
        face: [14, 38, 30],
        points: [
          [25.33, 24.1], [17.11, 21.24], [7.47, 24.19], [-0.47, 36.19], [-3.49, 48.67],
          [-16.16, 50.57], [-16.16, 99.9], [6.71, 99.9], [4.92, 97.43], [8.89, 91.43],
          [12.86, 91.24], [13.42, 88.48], [20.32, 79.14], [24.2, 66.76], [30.34, 61.14],
          [27.98, 33.71], [29.3, 29.9], [28.74, 26.76],
        ],
      },
      {
        name: 'la persona del centro',
        personId: 'ainhoa',
        face: [54, 39, 30],
        points: [
          [63.42, 26.86], [55.39, 23.71], [48.02, 27.05], [44.42, 34], [43.95, 46.38],
          [48.49, 55.62], [34.5, 58.67], [27.32, 63.05], [17.58, 83.71], [1.99, 99.9],
          [14.18, 99.9], [19.47, 96.48], [22.59, 99.9], [71.74, 99.9], [74.29, 88.57],
          [78.83, 99.9], [95.55, 99.9], [86.76, 88.57], [81.09, 71.05], [62.95, 58.67],
          [63.7, 50.57], [65.69, 53.05], [68.34, 42],
        ],
      },
      {
        name: 'la persona de la derecha',
        personId: 'sinnombre',
        face: [82, 37, 30],
        points: [
          [74.57, 22], [71.17, 25.62], [69.75, 31.52], [72.49, 45.62], [78.83, 55.05],
          [77.5, 60.19], [73.53, 65.71], [78.54, 68.38], [82.32, 72.76], [85.91, 86.76],
          [94.04, 99.9], [100, 99.9], [100, 50.29], [98.67, 49.62], [92.91, 48.38],
          [92.91, 45.33], [95.74, 44.29], [95.74, 29.14], [94.42, 25.81], [84.4, 20.76],
        ],
      },
    ],
  };

  function rect(left, top, right, bottom) {
    return [[left, top], [right, top], [right, bottom], [left, bottom]];
  }

  function fileName(src) {
    if (!src) return '';
    return src.split('/').pop().split('?')[0];
  }

  function bboxOf(points) {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
  }

  // Punto-en-polígono (ray casting) — hace falta porque con cuerpo entero
  // (brazos incluidos) las cajas de dos personas se solapan de verdad: el
  // brazo de "centro" pasa por encima de la zona de "izquierda" en esta
  // foto. Con botones posicionados por caja rectangular, ese solape
  // siempre lo ganaba el último creado (apilado encima), así que tocar el
  // brazo de la persona de la izquierda seleccionaba a la del centro.
  // Comprobar el polígono real, no la caja, resuelve el solape sin más.
  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0], yi = points[i][1];
      const xj = points[j][0], yj = points[j][1];
      const intersects = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  let uidCounter = 0;

  function buildHotspots(item, sourceEl) {
    item._personaZones = []; // siempre: el reconocimiento real añade aquí las zonas que va descubriendo
    const zones = PERSON_ZONES[fileName(sourceEl.getAttribute('src'))];
    if (!zones) return;
    zones.forEach((zone) => makeZone(item, sourceEl, zone));
  }

  function makeZone(item, sourceEl, zone) {
    {
      const uid = 'persona-clip-' + ++uidCounter;
      const bbox = bboxOf(zone.points);
      // Chrome no respeta bien pathLength+stroke-dasharray sobre <polygon>
      // (solo dibuja parte del contorno, verificado con Chrome headless) —
      // por eso el brillo animado usa un <path> "M...L...Z" en vez de
      // <polygon>. El clipPath sí puede seguir siendo <polygon>, no anima.
      const pathD = 'M' + zone.points.map((p) => p[0] + ',' + p[1]).join('L') + 'Z';
      const pointsFrac = zone.points.map((p) => (p[0] / 100) + ',' + (p[1] / 100)).join(' ');

      // Capa visual: SVG a tamaño completo del item (glow + defs del recorte)
      // + copia "levantada" de la foto, recortada a la silueta.
      const wrap = document.createElement('div');
      wrap.className = 'persona-silhouette';
      wrap.style.transformOrigin = (bbox.left + bbox.width / 2) + '% ' + (bbox.top + bbox.height / 2) + '%';

      const lift = sourceEl.cloneNode(true);
      lift.removeAttribute('id');
      lift.className = 'persona-silhouette__lift';
      lift.style.clipPath = 'url(#' + uid + ')';
      lift.style.webkitClipPath = 'url(#' + uid + ')';

      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'persona-silhouette__svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');

      const defs = document.createElementNS(ns, 'defs');
      const clip = document.createElementNS(ns, 'clipPath');
      clip.setAttribute('id', uid);
      clip.setAttribute('clipPathUnits', 'objectBoundingBox');
      const clipPoly = document.createElementNS(ns, 'polygon');
      clipPoly.setAttribute('points', pointsFrac);
      clip.appendChild(clipPoly);
      defs.appendChild(clip);

      // Dos trazos con el mismo "d", no uno con varios drop-shadow apilados:
      // apilar drop-shadow() sobre una línea fina no se ve como que brilla,
      // se ve como una línea plana con un borde blando (comprobado). El halo
      // (grueso, azul, muy desenfocado) va DETRÁS dando la sensación de luz
      // saliendo hacia fuera; el núcleo (fino, blanco, nítido) va DELANTE
      // dando el "filamento" caliente — técnica estándar de neón en SVG.
      const halo = document.createElementNS(ns, 'path');
      halo.setAttribute('class', 'persona-silhouette__halo');
      halo.setAttribute('d', pathD);

      const glow = document.createElementNS(ns, 'path');
      glow.setAttribute('class', 'persona-silhouette__glow');
      glow.setAttribute('d', pathD);

      svg.appendChild(defs);
      svg.appendChild(halo);
      svg.appendChild(glow);
      wrap.appendChild(lift);
      wrap.appendChild(svg);
      item.appendChild(wrap);

      // Longitud real del trazo, no normalizada por pathLength: WAAPI
      // animando stroke-dashoffset con pathLength da un valor "0" correcto
      // en getComputedStyle pero pinta el trazo incompleto (comprobado con
      // Chrome headless) — usar getTotalLength() de verdad evita el bug.
      // Mismo "d" en halo y glow → misma longitud, sirve para los dos.
      const glowLength = halo.getTotalLength(); // el núcleo blanco (glow) ya no se muestra: medir con el halo, que tiene el mismo trazo

      // Nada de <button> por caja rectangular: con cuerpo entero las cajas
      // de personas distintas se solapan de verdad (ver pointInPolygon
      // arriba). El hit-test real va en el pointerdown de mediaWrap, contra
      // este registro — bbox solo sirve ya para el transformOrigin del lift.
      item._personaZones.push({
        name: zone.name,
        personId: zone.personId,
        face: zone.face,
        points: zone.points,
        wrap: wrap,
        glow: glow,
        halo: halo,
        glowLength: glowLength,
        sourceEl: sourceEl, // la foto original — hace falta para "Crear algo con esta persona"
      });
      return item._personaZones[item._personaZones.length - 1];
    }
  }

  const mediaWrap = document.getElementById('detalle-foto-media');
  let holdTimer = null;
  let holdAnims = [];
  let activeZone = null;

  function resetAll() {
    document.querySelectorAll('.persona-silhouette.is-selected, .persona-silhouette.is-holding').forEach((el) => {
      el.classList.remove('is-selected', 'is-holding');
    });
  }

  function cancelHold() {
    clearTimeout(holdTimer);
    holdTimer = null;
    holdAnims.forEach((a) => a.cancel());
    holdAnims = [];
    if (activeZone) activeZone.wrap.classList.remove('is-holding');
    activeZone = null;
    if (mediaWrap) mediaWrap.style.touchAction = '';
  }

  function isOverlayVisible() {
    const layer = document.querySelector('.persona-select-layer');
    return !!(layer && layer.classList.contains('is-visible'));
  }

  function startHold(zone) {
    if (isOverlayVisible()) return; // ya hay una persona seleccionada, no se apilan gestos
    cancelHold();
    activeZone = zone;
    zone.wrap.classList.add('is-holding');
    // Mientras se mantiene pulsado sobre una persona, que el dedo no
    // dispare el scroll horizontal de la galería (.detail-media tiene
    // touch-action:pan-x) — antes esto lo hacía el <button> por zona, que
    // ya no existe (el hit-test ahora es por polígono, no por caja).
    if (mediaWrap) mediaWrap.style.touchAction = 'none';

    const len = zone.glowLength;
    holdAnims = [zone.glow, zone.halo].map((el) => {
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
      return el.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: HOLD_MS, easing: 'linear', fill: 'forwards' }
      );
    });

    holdTimer = setTimeout(() => selectPersona(zone), HOLD_MS);
  }

  function selectPersona(zone) {
    clearTimeout(holdTimer);
    holdTimer = null;
    // finish() deja el trazo dibujado del todo — cancel() lo habría revertido a oculto.
    holdAnims.forEach((a) => a.finish());
    holdAnims = [];
    zone.wrap.classList.remove('is-holding');
    zone.wrap.classList.add('is-selected');
    activeZone = zone;

    if (zone.dynamic) {
      // Cara descubierta por el reconocimiento real: si ya se conoce, se pasa directo a la confirmación;
      // si no, Nido pregunta quién es.
      if (zone.known && zone.known.name) {
        Reconocimiento.reinforce(zone.known, zone.descriptor);
        showPersonConfirm(zone.known);
      } else {
        openAsk(true);
      }
      return;
    }
    fillPersonaFotos(zone); // la pantalla de la persona queda lista antes de que se confirme
    openAsk(false);
  }

  // ---------------------------------------------------------------
  // Pantallas de la persona (692:2188 / 692:2241 / vídeos): nombre en la cabecera, dos filas
  // (Imágenes y Vídeos) y las dos cuadrículas completas. Se rellenan al elegir a alguien,
  // desde la foto (mantener pulsado → "Sí, enséñame más") o desde la lista Personas.
  // ---------------------------------------------------------------
  // Las fotos de las personas del prototipo son nombres de archivo; las de las personas reconocidas, rutas completas.
  const srcOfFoto = (f) => (/^(blob:|data:|assets\/|https?:)/.test(f) ? f : 'assets/img/' + f);

  function fillPersonaFotos(zone) {
    fillPersonaScreen(zone.personId);
  }

  function fillPersonaScreen(personId) {
    const persona = PERSONAS[personId];
    if (!persona) return;
    // La ficha que el asistente cree abierta es SIEMPRE la que está pintada en pantalla: se apunta aquí, en el único sitio que la
    // pinta. Antes se apuntaba en tres sitios sueltos y el camino principal (mantener pulsada una cara → «Sí, enséñame más»)
    // no pasaba por ninguno: la pantalla enseñaba a Clara y Nidi seguía creyendo que era la ficha de Ana.
    personaAbiertaId = personId;
    document.querySelectorAll('[data-persona-name]').forEach((el) => {
      el.textContent = persona.name;
    });

    // Una persona de verdad (reconocida en las fotos de la biblioteca): cada foto una sola vez, y sin vídeos inventados
    // (todavía no se reconoce a nadie dentro de un vídeo). Solo las personas de ejemplo repiten fotos para llenar la pantalla.
    const vacio = (el, msg) => { el.innerHTML = '<p class="personas-vacio">' + msg + '</p>'; };
    document.querySelectorAll('[data-persona-carousel]').forEach((row) => {
      row.innerHTML = '';
      if (persona.dynamic && row.dataset.personaCarousel === 'videos') { vacio(row, 'Todavía no hay vídeos de esta persona.'); return; }
      persona.photos.forEach((file) => {
        const card = document.createElement('div');
        card.className = 'persona-group';
        card.innerHTML =
          '<div class="persona-group__photo photo-card"><img src="' + srcOfFoto(file) + '" alt="" /></div>' +
          '<p class="persona-group__name">' + (CAPTIONS_FOTO[file] || '') + '</p>';
        if (file === 'album-museo.webp') card.querySelector('img').className = 'persona-group__img--museo';
        row.appendChild(card);
      });
      row.scrollLeft = 0;
    });

    // Cuadrículas completas: se repiten las fotos de la persona hasta llenar 8 huecos (datos de ejemplo).
    document.querySelectorAll('[data-persona-grid]').forEach((grid) => {
      grid.innerHTML = '';
      if (!persona.photos.length) return; // sin fotos no hay nada que pintar (antes salía "assets/img/undefined": imagen rota)
      if (persona.dynamic && grid.dataset.personaGrid === 'videos') { vacio(grid, 'Todavía no hay vídeos de esta persona.'); return; }
      const huecos = persona.dynamic ? persona.photos.length : 8;
      for (let i = 0; i < huecos; i++) {
        const file = persona.photos[i % persona.photos.length];
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.innerHTML = '<img src="' + srcOfFoto(file) + '" alt="Foto de ' + persona.name + '" />';
        grid.appendChild(card);
      }
    });
  }

  // Pregunta por voz (765:6044) → confirmación. Ver el HTML de .persona-ask / .persona-confirm.
  const LISTEN_MS = 1800; // simula que "oye" el nombre; en el prototipo no hay reconocimiento de voz real
  let listenTimer = null;
  let albumListenTimer = null;

  // Persona no reconocida (mantener pulsado donde no hay contorno): mismo componente de voz con otro texto —
  // "No he reconocido a esta persona / Toca en el micrófono y dime quién es" — y el nombre que dice la persona
  // se usa para su ficha. En el prototipo el nombre "oído" rota (no hay reconocimiento de voz real).
  const NOMBRES_DESCONOCIDOS = ['Ainhoa', 'Clara', 'Pablo', 'Lucía'];
  let unknownMode = false;
  let unknownIdx = 0;

  function openAsk(unknown) {
    unknownMode = !!unknown;
    const ask = document.querySelector('[data-persona-ask]');
    const mic = ask.querySelector('.persona-ask__mic');
    ask.querySelector('.persona-ask__bubble--1').textContent = unknown ? 'No he reconocido a esta persona' : '¿Cómo se llama esta persona?';
    ask.querySelector('.persona-ask__bubble--2').textContent = unknown ? 'Toca en el micrófono y dime quién es.' : 'Toca en el micrófono y dímelo.';
    mic.classList.remove('is-listening');
    ask.classList.add('is-visible');
  }

  // Escucha un nombre con el reconocimiento de voz del navegador. Resuelve {name}, {error: "mensaje para la persona"} o
  // {fallback: true} si el navegador no tiene voz (entonces el prototipo usa un nombre de ejemplo, para poder enseñarlo).
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  function escuchar(onInterim) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || navigator.webdriver) return Promise.resolve({ fallback: true });
    return new Promise((resolve) => {
      let done = false;
      const end = (v) => { if (!done) { done = true; resolve(v); } };
      const sinOir = 'No he oído nada. Toca el micrófono y dímelo otra vez.';
      const rec = new SR();
      rec.lang = 'es-ES';
      rec.interimResults = true;
      rec.onresult = (e) => {
        const r = e.results[e.results.length - 1];
        const t = (r[0].transcript || '').trim();
        if (!r.isFinal) { if (onInterim) onInterim(t); return; }
        const limpio = t.replace(/^(es|se llama|mi (nieta|nieto|hija|hijo|madre|padre|abuela|abuelo|hermana|hermano)( es)?)\s+/i, '');
        end(limpio ? { name: cap(limpio) } : { error: 'No te he entendido. Toca el micrófono y dímelo otra vez.' });
      };
      rec.onerror = (e) => end({ error: {
        'not-allowed': 'No puedo usar el micrófono. Revisa sus permisos.',
        'service-not-allowed': 'Activa el dictado en los ajustes del teléfono.',
        'audio-capture': 'No encuentro el micrófono.',
        'network': 'Sin conexión no puedo escucharte bien.',
      }[e.error] || sinOir });
      rec.onend = () => end({ error: sinOir });
      setTimeout(() => { try { rec.abort(); } catch (e) {} end({ error: sinOir }); }, 10000);
      try { rec.start(); } catch (e) { end({ error: 'No he podido activar el micrófono.' }); }
    });
  }

  function showPersonConfirm(person) {
    document.querySelector('[data-persona-confirm-title]').textContent = '¿Quieres ver más fotos de ' + person.name + '?';
    document.querySelector('[data-persona-confirm]').classList.add('is-visible');
    refreshPersonPhotos(person.id); // busca a la persona en toda la biblioteca mientras se decide
  }

  function startListening() {
    const ask = document.querySelector('[data-persona-ask]');
    const mic = ask.querySelector('.persona-ask__mic');
    if (mic.classList.contains('is-listening')) return;
    mic.classList.add('is-listening');
    const zone = activeZone;
    const unknown = unknownMode;
    const nombrarReal = unknown && zone && zone.dynamic;
    const heard = nombrarReal
      ? escuchar().then((r) => (r.fallback ? { name: NOMBRES_DESCONOCIDOS[unknownIdx++ % NOMBRES_DESCONOCIDOS.length] } : r))
      : new Promise((r) => { listenTimer = setTimeout(() => r({}), LISTEN_MS); });
    heard.then((res) => {
      if (!ask.classList.contains('is-visible')) return; // se canceló mientras escuchaba
      mic.classList.remove('is-listening');
      if (res.error) { window.nidoToast('detalle-foto', res.error, null, null, 6000); return; } // se queda para reintentar
      ask.classList.remove('is-visible');
      if (nombrarReal) {
        let person = zone.known;
        if (person) {
          Reconocimiento.rename(person, res.name); // una persona que Nido ya había encontrado, sin nombre
          PERSONAS[person.id].name = res.name; PERSONAS[person.id].ask = res.name;
          addPersonaCircle(person);
        } else {
          person = Reconocimiento.addPerson(res.name, zone.descriptor, zone.avatar);
          zone.known = person;
          registerPerson(person);
        }
        showPersonConfirm(person);
        return;
      }
      let quien = 'esta persona';
      if (unknown) {
        quien = NOMBRES_DESCONOCIDOS[unknownIdx++ % NOMBRES_DESCONOCIDOS.length];
        fillPersonaScreen('sinnombre');
        document.querySelectorAll('[data-persona-name]').forEach((el) => { el.textContent = quien; });
      } else {
        const persona = zone && PERSONAS[zone.personId];
        if (persona) quien = persona.ask;
      }
      document.querySelector('[data-persona-confirm-title]').textContent = '¿Quieres ver más fotos de ' + quien + '?';
      document.querySelector('[data-persona-confirm]').classList.add('is-visible');
    });
  }

  // ---- Personas reconocidas de verdad: entran en PERSONAS (misma ficha que las de ejemplo) y en la lista Personas ----
  const nombreDe = (p) => p.name || 'Sin nombre';

  function registerPerson(person) {
    if (!PERSONAS[person.id]) PERSONAS[person.id] = { name: nombreDe(person), ask: nombreDe(person), photos: [], dynamic: true };
    PERSONAS[person.id].name = nombreDe(person);
    PERSONAS[person.id].ask = nombreDe(person);
    addPersonaCircle(person);
  }

  function libraryImages() {
    const seen = new Set();
    return Array.from(document.querySelectorAll(
      '[data-screen="album-detalle"] .album-grid .photo-card img, [data-screen="home"] .carousel .photo-card img, [data-screen="personas"] .persona-group__photo img'
    )).filter((img) => {
      const k = img.currentSrc || img.src;
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // Álbum "Fotos de X" de cada persona con nombre (se crea o se actualiza solo).
  function personAlbum(person, srcs) {
    if (!person.name || !srcs.length || !window.NidoAlbums) return;
    window.NidoAlbums.upsert('persona:' + person.id, 'Fotos de ' + person.name, srcs.map((src) => ({ src, tag: 'IMG' })));
  }

  // ---- Al añadir fotos: Nido busca a las personas, las agrupa y rehace la pantalla Personas con lo que hay de verdad ----
  function limpiarEjemplosPersonas() {
    const scr = document.querySelector('[data-screen="personas"]');
    scr.querySelectorAll('.persona-item:not([data-persona-open^="r"])').forEach((e) => e.remove());
    scr.querySelectorAll('.personas-grid:not(.personas-grid--lg)').forEach((e) => e.remove());
    scr.querySelectorAll('.persona-group').forEach((e) => e.remove());
  }

  function pintarGrupos(grupos) {
    const scr = document.querySelector('[data-screen="personas"]');
    const fila = scr.querySelector('.personas-groups');
    const titulo = fila.previousElementSibling;
    const next = scr.querySelector('.personas-next');
    fila.innerHTML = '';
    grupos = grupos.filter((g) => g.a.name && g.b.name); // "Sin nombre y Sin nombre" no dice nada: un grupo existe cuando se conoce a los dos
    grupos.forEach((g) => {
      const card = document.createElement('div');
      card.className = 'persona-group';
      card.innerHTML = '<div class="persona-group__photo photo-card"><img alt="" /></div><p class="persona-group__name"></p>';
      card.querySelector('img').src = g.imgs[0].currentSrc || g.imgs[0].src;
      card.querySelector('p').textContent = nombreDe(g.a) + ' y ' + nombreDe(g.b);
      fila.appendChild(card);
    });
    const hay = grupos.length > 0;
    [titulo, fila, next].forEach((e) => { if (e) e.style.display = hay ? '' : 'none'; });
  }

  function pintarVacio(vacio) {
    const grid = document.querySelector('[data-screen="personas"] .personas-grid--lg');
    let p = document.querySelector('[data-screen="personas"] .personas-vacio');
    if (vacio && !p) {
      p = document.createElement('p');
      p.className = 'personas-vacio';
      p.textContent = 'Aún no he encontrado a nadie que salga en varias fotos. Mantén pulsada la cara de alguien en una foto y dime quién es.';
      grid.after(p);
    }
    if (!vacio && p) p.remove();
  }

  let organizando = false;
  async function organizarBiblioteca() {
    if (organizando) return;
    const imgs = libraryImages();
    if (!imgs.length) return;
    organizando = true;
    try {
      // Sin avisos de progreso ni de resultado (24-sep, pedido): es trabajo interno de la app, a la
      // persona que la usa no le aporta nada saber "buscando... 7 de 39" ni "he encontrado 7
      // personas" — solo ruido. Sigue funcionando igual de bien en silencio.
      const res = await Reconocimiento.organize(imgs, () => {});
      res.personas.forEach((o) => {
        registerPerson(o.person);
        const e = PERSONAS[o.person.id];
        e.photos = o.imgs.map((i) => i.currentSrc || i.src);
        personAlbum(o.person, e.photos);
      });
      pintarGrupos(res.grupos);
      pintarVacio(res.personas.length === 0);
    } catch (err) {
      console.error('organizar biblioteca falló:', err);
    } finally { organizando = false; }
  }

  window.addEventListener('nido:gallery', () => { limpiarEjemplosPersonas(); organizarBiblioteca(); });

  const scanning = {};
  async function refreshPersonPhotos(id) {
    const person = Reconocimiento.byId(id);
    const entry = PERSONAS[id];
    if (!person || !entry || scanning[id]) return;
    scanning[id] = true;
    try {
      const imgs = await Reconocimiento.photosOf(person, libraryImages());
      // Si la búsqueda no encuentra nada (en un móvil justo de memoria puede fallar a medias) se conserva la lista de antes: vaciarla
      // dejaba la pantalla de la persona sin fotos.
      if (imgs.length) entry.photos = imgs.map((i) => i.currentSrc || i.src);
      // Si mientras buscaba se ha abierto la ficha de OTRA persona, no se le pinta encima esta (y tampoco se cambia la ficha abierta).
      const enFicha = /^persona-(fotos|imagenes|videos)$/.test(window.NidoNav.current());
      if (!enFicha || personaAbiertaId === id) fillPersonaScreen(id);
      if (entry.photos.length) personAlbum(person, entry.photos);
    } finally { scanning[id] = false; }
  }

  // Círculo de la persona en la pantalla Personas (recorta la cara con CSS: nada de <canvas>, Safari lo bloquea).
  function addPersonaCircle(person) {
    const grid = document.querySelector('[data-screen="personas"] .personas-grid--lg');
    if (!grid) return;
    const previo = grid.querySelector('[data-persona-open="' + person.id + '"]');
    if (previo) previo.remove(); // se repinta (nombre o avatar nuevos)
    const btn = document.createElement('button');
    btn.className = 'persona-item';
    btn.dataset.nav = 'persona-fotos';
    btn.dataset.personaOpen = person.id;
    const av = person.avatar;
    let style = 'background:#d9d9d9';
    if (av) {
      const cs = Math.min(av.nw, av.nh, Math.max(av.w, av.h) * 2.2);
      const cx = Math.max(0, Math.min(av.nw - cs, av.x + av.w / 2 - cs / 2));
      const cy = Math.max(0, Math.min(av.nh - cs, av.y + av.h / 2 - cs / 2));
      const px = av.nw - cs ? (cx / (av.nw - cs)) * 100 : 50;
      const py = av.nh - cs ? (cy / (av.nh - cs)) * 100 : 50;
      style = 'background:#d9d9d9 url(' + av.src + ') no-repeat;background-size:' + (av.nw / cs) * 100 + '% auto;background-position:' + px + '% ' + py + '%';
    }
    btn.innerHTML = '<div class="persona-item__photo" style="' + style + '"></div><p class="persona-item__name"></p>';
    btn.querySelector('.persona-item__name').textContent = nombreDe(person);
    grid.prepend(btn);
  }

  // Personas guardadas de sesiones anteriores.
  Reconocimiento.people.forEach(registerPerson);

  function closeSelection() {
    clearTimeout(listenTimer);
    const ask = document.querySelector('[data-persona-ask]');
    if (ask) {
      ask.classList.remove('is-visible');
      ask.querySelector('.persona-ask__mic').classList.remove('is-listening');
    }
    const confirm = document.querySelector('[data-persona-confirm]');
    if (confirm) confirm.classList.remove('is-visible');
    const layer = document.querySelector('.persona-select-layer');
    if (layer) layer.classList.remove('is-visible');
    cancelHold();
    resetAll();
    setStep('menu'); // por si se cierra a mitad de "crear algo", que la próxima vez empiece en el menú
  }

  // ---------------------------------------------------------------
  // "Crear algo con esta persona" — de verdad, no un no-op: llama a
  // netlify/functions/crear-imagen.js (Cloudflare Workers AI, gratis) con
  // la foto completa que se está viendo. Tres pasos dentro de la misma
  // tarjeta (menu → estilo → cargando) más una vista de resultado a toda
  // pantalla — ver el HTML de .persona-select-panel / .persona-create-result.
  // ---------------------------------------------------------------
  const CREATE_ENDPOINT = '/.netlify/functions/crear-imagen';

  function setStep(step) {
    document.querySelectorAll('.persona-select-panel [data-persona-step]').forEach((el) => {
      el.hidden = el.dataset.personaStep !== step;
    });
    const panel = document.querySelector('.persona-select-panel');
    const result = document.querySelector('.persona-create-result');
    if (panel) panel.hidden = step === 'resultado';
    if (result) {
      result.hidden = step !== 'resultado';
      if (step === 'resultado') {
        requestAnimationFrame(() => result.classList.add('is-visible'));
      } else {
        result.classList.remove('is-visible');
      }
    }
  }

  // La foto vive como <img src="assets/...">, no como base64 — hay que
  // convertirla para mandarla al servidor en el body JSON.
  //
  // NO usar <canvas>.toBlob()/toDataURL() para esto: Safari lo bloquea con
  // "SecurityError: The operation is insecure" por su protección
  // anti-fingerprinting de canvas, incluso con una imagen del mismo origen
  // (confirmado — el usuario lo vio en Safari, headless Chrome no lo
  // reproducía). Mejor no tocar canvas en absoluto: volver a pedir el
  // propio archivo con fetch() y leerlo como blob directamente evita el
  // problema entero y de paso no recomprime la imagen.
  // Vídeo: se toma el fotograma actual con un canvas (mismo origen, sin tainting). Si el navegador lo
  // bloquea (Safari con su protección anti-fingerprinting) salta al catch de createWithPerson.
  function videoFrameToBase64(video) {
    const c = document.createElement('canvas');
    c.width = video.videoWidth || 720;
    c.height = video.videoHeight || 1280;
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  }

  async function imageElementToBase64(imgEl) {
    const response = await fetch(imgEl.currentSrc || imgEl.src);
    if (!response.ok) throw new Error('No se pudo leer la foto (' + response.status + ')');
    let blob = await response.blob();
    // Fotos reales de la galería (blob:) pesan varios MB: se reducen a 1280px para que quepan en la petición.
    if ((imgEl.currentSrc || imgEl.src).startsWith('blob:')) {
      try {
        const bmp = await createImageBitmap(blob);
        const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas');
        c.width = Math.round(bmp.width * k);
        c.height = Math.round(bmp.height * k);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
      } catch (e) { /* si falla, se manda el original */ }
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Un data: URI con la imagen entera en base64 (varios cientos de KB de texto, una foto 1024×1024)
  // hacía que Safari en iPhone recargara la pestaña entera (o cortara la propia petición con "Load
  // failed") por presión de memoria justo al ponerlo en el <img> — reportado el 24-sep, reproducible
  // al 100%, INDEPENDIENTE del híbrido botones+voz (ya pasaba en esta versión de antes). Un blob:
  // URL es mucho más ligero para el navegador (no duplica los datos como texto en el DOM).
  function base64AUrlObjeto(base64, tipo) {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: tipo || 'image/jpeg' }));
  }

  // Texto real, nunca pedido a la IA — ver la nota en crear-imagen.js sobre
  // por qué (tildes/ñ mal escritas, letras solapadas). "retrato" no lleva
  // pie: no es festivo, no necesita un titular encima.
  const CAPTIONS = {
    cumpleanos: '¡Feliz cumpleaños!',
    aniversario: 'Feliz aniversario',
    navidad: '¡Feliz Navidad!',
    anonuevo: '¡Feliz Año Nuevo!',
  };

  let lastStyle = null; // para "Volver a intentarlo" sin obligar a elegir otra vez

  // Felicitación (botón de la pantalla de detalle): abre directamente el selector de estilo sobre la
  // foto que se está viendo — no hace falta haber seleccionado a nadie. Usa el mismo flujo de IA
  // (crear-imagen.js) y la misma UI de estilo/cargando/resultado que ya existían.
  let createSource = null;

  function currentPhotoEl() {
    const media = document.getElementById('detalle-foto-media');
    const items = media ? media.querySelectorAll('.detail-media__item') : [];
    if (!items.length) return null;
    const i = Math.min(items.length - 1, Math.max(0, Math.round(media.scrollLeft / media.clientWidth)));
    return items[i].querySelector('img, video');
  }

  // El botón "Felicitación" navega a la pantalla de estilos (733:2997, data-nav) y aquí solo se
  // recuerda qué foto se estaba viendo; al elegir un estilo se vuelve al detalle y se crea.
  let felicitacionStyle = null;

  function openFelicitacion(fromYo) {
    // Desde Yo (687:8356) no hay una foto abierta: se usa la primera de "Todas tus fotos".
    window.felicitacionOrigin = fromYo ? 'yo' : 'detalle';
    const img = fromYo ? document.querySelector('[data-screen="album-detalle"] .album-grid .photo-card img') : currentPhotoEl();
    if (img) createSource = img;
    // Cada vez que se abre la pantalla de estilos empieza sin nada elegido y sin "Continuar".
    felicitacionStyle = null;
    document.querySelectorAll('[data-felicitacion-card]').forEach((c) => c.classList.remove('is-selected'));
    const cont = document.querySelector('[data-persona-action="felicitacion-continuar"]');
    if (cont) cont.hidden = true;
  }

  function chooseFelicitacionStyle(card) {
    felicitacionStyle = card.dataset.felicitacionCard;
    document.querySelectorAll('[data-felicitacion-card]').forEach((c) => c.classList.toggle('is-selected', c === card));
    const cont = document.querySelector('[data-persona-action="felicitacion-continuar"]');
    if (cont) cont.hidden = false;
  }

  // Devuelve { ok, ms } o { ok: false, error } (lo usa el asistente de voz para contarle a la persona qué ha pasado; los botones lo ignoran).
  // opciones (solo el asistente): source = foto que usar en vez de la abierta; volverA = pantalla a la que volver si falla (con aviso).
  const CREAR_TOPE_MS = 90000; // sin respuesta en 90 s se da por fallida: nunca quedarse para siempre en «Creando imagen»
  async function createWithPerson(style, opciones) {
    opciones = opciones || {};
    if (opciones.source) createSource = opciones.source; // así «Volver a intentarlo» repite con la misma foto
    const source = createSource || (activeZone && activeZone.sourceEl);
    if (!source) return { ok: false, error: 'No hay ninguna foto para la felicitación.' };
    lastStyle = style;
    // Pantalla completa "Creando imagen" (759:5110) mientras trabaja la IA; el resultado (o el error)
    // se enseña después en el detalle. Mínimo 1,2s para que no parpadee si falla al instante.
    window.NidoNav.show('felicitacion-cargando');
    const started = Date.now();
    const finish = async (step) => {
      const wait = 1200 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (window.felicitacionOrigin === 'yo' && step === 'error') {
        window.NidoNav.show('yo');
        toastOn('yo', 'No se ha podido crear la felicitación. Inténtalo de nuevo.');
        return;
      }
      document.querySelector('.persona-select-layer').classList.add('is-visible');
      setStep(step);
      window.NidoNav.show('detalle-foto');
    };

    try {
      const imageBase64 = source.tagName === 'VIDEO' ? videoFrameToBase64(source) : await imageElementToBase64(source);
      const res = await fetch(CREATE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, style }),
        signal: window.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(CREAR_TOPE_MS) : undefined,
      });
      const data = await res.json().catch(() => ({ error: 'respuesta no válida del servidor (' + res.status + ')' }));
      if (!res.ok || !data.imageBase64) throw new Error(data.error || 'fallo al generar');
      document.querySelector('[data-felicitacion-img]').src = base64AUrlObjeto(data.imageBase64);
      const caption = document.querySelector('[data-felicitacion-caption]');
      caption.textContent = CAPTIONS[style] || '';
      // Una tipografía por tipo de creación — ver las reglas --cumpleanos/etc. en persona.css.
      caption.className = 'persona-create-result__caption persona-create-result__caption--' + style;
      const wait = 1200 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      // La felicitación creada pasa a ser la primera de "Mis felicitaciones" en Yo.
      const yoGrid = document.querySelector('[data-screen="yo"] .grid-2');
      const done = document.createElement('div');
      done.className = 'photo-card photo-card--square-2col';
      done.innerHTML = '<img alt="Felicitación creada con IA" />';
      done.querySelector('img').src = base64AUrlObjeto(data.imageBase64);
      done.dataset.caption = CAPTIONS[style] || '';
      const first = yoGrid.querySelector('.yo-generar-wrap');
      first.insertAdjacentElement('afterend', done);
      window.NidoNav.show('felicitacion-generada'); // el resultado ya es pantalla propia (763:5138)
      return { ok: true, ms: Date.now() - started };
    } catch (err) {
      // Nunca dejar al usuario colgado en "Creando..." sin explicación — antes
      // esto volvía al menú en silencio y parecía que "no había hecho nada".
      console.error('crear-imagen falló:', err);
      const error = err && err.name === 'TimeoutError' ? 'tardó demasiado' : String((err && err.message) || err);
      const detail = document.querySelector('[data-persona-step="error"] [data-persona-error-detail]');
      if (detail) detail.textContent = error;
      if (opciones.volverA) {
        // Pedida por el asistente desde fuera del detalle (p. ej. la ficha de alguien): se vuelve a donde estaba, no a una foto cualquiera.
        const wait = 1200 - (Date.now() - started);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        window.NidoNav.show(opciones.volverA);
        if (window.nidoToast) window.nidoToast(opciones.volverA, 'No se ha podido crear la felicitación.', null, null, 5000);
      } else await finish('error');
      return { ok: false, error };
    }
  }

  // ---------------------------------------------------------------
  // Compartir la felicitación por WhatsApp. Un enlace wa.me solo lleva texto, así que la foto va por
  // el share sheet nativo (móvil: aparece WhatsApp con la imagen adjunta). En ordenador, donde eso no
  // existe, se copia la imagen al portapapeles y se abre WhatsApp para pegarla. El pie de foto es HTML,
  // no forma parte de la imagen de la IA: se dibuja encima con un canvas para que llegue completo.
  // ---------------------------------------------------------------
  const SHARE_TEXT = 'Mira la felicitación que he creado con Nido'; // sin emoji: llegaba como ◆ en WhatsApp
  const CAPTION_STYLES = {
    cumpleanos: { font: "700 44px 'Fredoka'", rot: -3, fill: 'rainbow', stroke: '#fff', sw: 3 },
    aniversario: { font: "italic 700 44px 'Playfair Display'", rot: 0, fill: '#f4d58d', stroke: '#7a4f1a', sw: 1, glow: 'rgba(244,213,141,0.5)' },
    navidad: { font: "700 52px 'Mountains of Christmas'", rot: -2, fill: '#d6483a', stroke: '#fff', sw: 4, drop: '#2f6b45' },
    anonuevo: { font: "400 36px 'Bungee'", rot: -1.5, fill: '#ffd166', stroke: '#7a3ea1', sw: 2, glow: 'rgba(255,209,102,0.85)' },
  };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function composeFelicitacionBlob() {
    const imgEl = document.querySelector('[data-felicitacion-img]');
    const capEl = document.querySelector('[data-felicitacion-caption]');
    const img = await loadImage(imgEl.src);
    const style = (capEl.className.match(/caption--(\w+)/) || [])[1];
    const cfg = CAPTION_STYLES[style];
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const text = capEl.textContent.trim();
    if (cfg && text) {
      const k = canvas.width / 393; // la pantalla mide 393px: se escala el pie a la resolución de la imagen
      const px = parseFloat(cfg.font.match(/(\d+)px/)[1]) * k;
      ctx.font = cfg.font.replace(/\d+px/, px + 'px');
      await document.fonts.load(ctx.font).catch(() => {});
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineJoin = 'round';
      const maxW = canvas.width - 32 * k;
      const lines = [];
      let cur = '';
      text.split(' ').forEach((w) => {
        const t = cur ? cur + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
      });
      lines.push(cur);
      ctx.save();
      ctx.translate(canvas.width / 2, 8 * k + px * 0.6);
      ctx.rotate((cfg.rot * Math.PI) / 180);
      lines.forEach((line, i) => {
        const y = i * px * 1.2 - px * 0.6;
        if (cfg.fill === 'rainbow') {
          const w = ctx.measureText(line).width;
          const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
          ['#ff5f6d', '#ffc371', '#6ee7b7', '#38bdf8', '#a78bfa', '#f472b6'].forEach((c, n, arr) => g.addColorStop(n / (arr.length - 1), c));
          ctx.fillStyle = g;
        } else ctx.fillStyle = cfg.fill;
        ctx.shadowColor = 'rgba(26,29,44,0.35)';
        ctx.shadowBlur = 10 * k;
        ctx.shadowOffsetY = 4 * k;
        if (cfg.glow) { ctx.shadowColor = cfg.glow; ctx.shadowBlur = 18 * k; ctx.shadowOffsetY = 0; }
        if (cfg.drop) { ctx.shadowColor = cfg.drop; ctx.shadowBlur = 0; ctx.shadowOffsetY = 3 * k; }
        ctx.strokeStyle = cfg.stroke;
        ctx.lineWidth = cfg.sw * k;
        ctx.strokeText(line, 0, y);
        ctx.shadowColor = 'transparent';
        ctx.fillText(line, 0, y);
      });
      ctx.restore();
    }
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas vacío'))), 'image/png'));
  }

  function toast(msg) { toastOn('felicitacion-generada', msg); }

  function toastOn(screen, msg) {
    const host = document.querySelector('[data-screen="' + screen + '"]');
    let t = host.querySelector('.share-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'share-toast';
      host.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-visible');
    setTimeout(() => t.classList.remove('is-visible'), 12000);
  }

  async function shareToWhatsApp() {
    const wa = (withText = true) => window.open('https://wa.me/' + (withText ? '?text=' + encodeURIComponent(SHARE_TEXT) : ''), '_blank', 'noopener');
    let blob;
    try {
      blob = await composeFelicitacionBlob();
    } catch (err) {
      console.error('no se pudo preparar la imagen:', err);
      wa(); // sin imagen al menos abre WhatsApp con el mensaje
      return;
    }
    const file = new File([blob], 'felicitacion.png', { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: SHARE_TEXT });
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return; // cerró el menú de compartir
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Imagen copiada. En WhatsApp abre un chat y pégala con Cmd+V (Ctrl+V)');
      wa(false); // sin texto: si no, al pegar la imagen sobre un mensaje escrito se pierde la vista previa
      return;
    } catch (err) {
      // último recurso: descargarla para adjuntarla a mano
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'felicitacion.png';
      a.click();
      toast('Imagen descargada. Adjúntala en WhatsApp');
    }
    wa();
  }

  // ---- Crear álbum por voz ----
  // Lo que "oye" el prototipo (no hay reconocimiento de voz real): el 1º es el de Figma; los siguientes rotan
  // para poder distinguir varios álbumes creados.
  const ALBUM_NOMBRES_DEMO = ['Calle concordia', 'Vacaciones en Venecia', 'Cumpleaños de Clara', 'Domingo en familia'];
  let albumNombreIdx = 0;
  let albumFallos = 0; // intentos seguidos en los que no se ha podido oír un nombre

  function resetAlbumAsk(ask) {
    clearTimeout(albumListenTimer);
    ask.classList.remove('is-visible', 'is-confirming');
    ask.querySelector('.persona-ask__mic').classList.remove('is-listening');
    const reply = ask.querySelector('[data-album-reply]');
    reply.hidden = true;
    reply.textContent = '....';
    ask.querySelector('[data-album-mic-img]').src = 'assets/icons/mic-escuchar.svg';
    ask.querySelectorAll('[data-album-confirm]').forEach((el) => { el.hidden = true; });
  }

  // El álbum nuevo aparece el primero de "Mis álbumes" con el nombre elegido (sin foto de portada real
  // todavía: usa la de ejemplo). Falta el diseño de qué pasa después de crearlo.
  function createAlbum(name, photos) {
    // Cada vez se crea un álbum más (ver NidoAlbums en app.js); la 1ª vez, con el onboarding (765:5185).
    const album = window.NidoAlbums.create(name, photos && photos.length ? { photos } : undefined);
    window.NidoAlbums.open(album.id);
    window.nidoToast('album-nuevo', 'Álbum «' + album.name + '» creado', null, null, 3500);
    // Con Nidi hablando no sale el tour de primera vez: taparía lo que Nidi acaba de anunciar y pediría un toque que Nidi no conoce.
    // No se da por visto: saldrá la primera vez que la persona cree un álbum ella sola.
    if (!albumNuevoOnboardingSeen && !(window.NidoAgente && window.NidoAgente.activa)) {
      albumNuevoOnboardingSeen = true;
      document.querySelector('.ob-album-nuevo').classList.add('is-visible');
      window.Mascota.enterOnboardingPollito(document.querySelector('.ob-album-nuevo'));
    }
    return album;
  }
  let albumNuevoOnboardingSeen = false;

  // Mantener pulsado donde no hay silueta hecha a mano: reconocimiento real. Busca la cara tocada, dibuja su
  // contorno y sigue el mismo flujo (contorno → reconocer o preguntar el nombre). Si no hay cara, avisa.
  function buscando(on) {
    const host = document.querySelector('[data-screen="detalle-foto"]');
    let t = host.querySelector('.share-toast--buscando');
    if (!t) { t = document.createElement('div'); t.className = 'share-toast share-toast--buscando'; t.textContent = 'Buscando a la persona…'; host.appendChild(t); }
    t.classList.toggle('is-visible', on);
  }

  async function recognizeAt(imgEl, pct) {
    buscando(true);
    try {
      const faces = await Reconocimiento.detect(imgEl);
      const face = Reconocimiento.faceAt(faces, pct[0], pct[1]);
      if (!face) { buscando(false); activeZone = null; openAsk(true); return; }
      const item = imgEl.closest('.detail-media__item');
      const zone = makeZone(item, imgEl, { name: 'esta persona', personId: null, face: Reconocimiento.faceBox(face), points: Reconocimiento.bustPolygon(face) });
      zone.dynamic = true;
      zone.descriptor = face.descriptor;
      zone.known = Reconocimiento.match(face.descriptor);
      zone.avatar = { src: imgEl.currentSrc || imgEl.src, nw: face.natural.w, nh: face.natural.h, x: face.box.x, y: face.box.y, w: face.box.w, h: face.box.h };
      buscando(false);
      startHold(zone);
    } catch (err) {
      console.error('reconocimiento falló:', err);
      buscando(false);
      activeZone = null;
      openAsk(true);
    }
  }

  function zoneAtPoint(event) {
    const item = event.target.closest('.detail-media__item');
    if (!item || !item._personaZones) return null;
    const r = item.getBoundingClientRect();
    const x = ((event.clientX - r.left) / r.width) * 100;
    const y = ((event.clientY - r.top) / r.height) * 100;
    return item._personaZones.find((z) => pointInPolygon(x, y, z.points)) || null;
  }

  function init() {
    const mediaWrap = document.getElementById('detalle-foto-media');
    if (!mediaWrap) return;

    // Mantener pulsado donde NO hay ninguna persona con contorno (fotos reales, o fuera de la silueta): en vez
    // de no hacer nada, el pollito lo dice y deja nombrar a la persona. Se cancela si el dedo se mueve
    // (deslizar entre fotos) o entra un segundo dedo (pellizcar).
    let missTimer = null;
    let missStart = null;
    const cancelMiss = () => { clearTimeout(missTimer); missTimer = null; };
    mediaWrap.addEventListener('pointermove', (e) => {
      if (missStart && Math.hypot(e.clientX - missStart.x, e.clientY - missStart.y) > 10) cancelMiss();
    });
    mediaWrap.addEventListener('pointerdown', (event) => {
      const zone = zoneAtPoint(event);
      if (zone) { startHold(zone); return; }
      if (isOverlayVisible() || !event.target.closest('.detail-media__item img')) return;
      cancelMiss();
      missStart = { x: event.clientX, y: event.clientY };
      const imgEl = event.target.closest('.detail-media__item img');
      const rect = imgEl.closest('.detail-media__item').getBoundingClientRect();
      const pct = [((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100];
      missTimer = setTimeout(() => { missTimer = null; recognizeAt(imgEl, pct); }, HOLD_MS);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => mediaWrap.addEventListener(type, cancelMiss));
    mediaWrap.addEventListener('pointerdown', (e) => { if (!e.isPrimary) cancelMiss(); });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
      mediaWrap.addEventListener(type, () => {
        // Las zonas del reconocimiento real ya esperaron su pulsación larga antes de aparecer: soltar no las cancela.
        if (activeZone && !activeZone.dynamic && activeZone.wrap.classList.contains('is-holding')) cancelHold();
      });
    });

    // "Salir y seguir viendo imágenes" cierra sin navegar. "Ver recuerdos de
    // esta persona" lleva data-nav="persona-fotos" y ya lo gestiona el manejador
    // de clics genérico de app.js.
    document.addEventListener('click', (event) => {
      const open = event.target.closest('[data-persona-open]');
      if (open) {
        fillPersonaScreen(open.dataset.personaOpen);
        return;
      }
      if (event.target.closest('[data-persona-action="felicitacion"]')) {
        openFelicitacion(false);
        return;
      }
      if (event.target.closest('[data-persona-action="felicitacion-yo"]')) {
        openFelicitacion(true);
        return;
      }
      const fcard = event.target.closest('[data-felicitacion-card]');
      if (fcard) {
        chooseFelicitacionStyle(fcard);
        return;
      }
      if (event.target.closest('[data-persona-action="felicitacion-continuar"]')) {
        if (felicitacionStyle) createWithPerson(felicitacionStyle); // el data-nav vuelve al detalle mientras se crea
        return;
      }
      // Crear álbum: pide el nombre por voz (757:3993). El siguiente paso llegará con su diseño.
      const albumBtn = event.target.closest('[data-album-action]');
      if (albumBtn) {
        const ask = document.querySelector('[data-album-ask]');
        const mic = ask.querySelector('.persona-ask__mic');
        const act = albumBtn.dataset.albumAction;
        if (act === 'nuevo') ask.classList.add('is-visible');
        else if (act === 'mic') {
          // Escuchando (757:4072) → tras oír el nombre, pide confirmar (757:4223). Voz real del navegador; sin voz
          // disponible usa un nombre de ejemplo. Si no oye nada, lo dice y deja reintentar (antes inventaba el nombre).
          if (mic.classList.contains('is-listening')) return;
          mic.classList.add('is-listening');
          const reply = ask.querySelector('[data-album-reply]');
          reply.hidden = false;
          reply.textContent = 'Te escucho…';
          ask.querySelector('[data-album-mic-img]').src = 'assets/icons/mic-escuchando.svg';
          const confirmar = (nombre) => {
            mic.classList.remove('is-listening');
            reply.textContent = nombre;
            ask.classList.add('is-confirming');
            ask.querySelectorAll('[data-album-confirm]').forEach((el) => { el.hidden = false; });
          };
          escuchar((parcial) => { reply.textContent = parcial; }).then((res) => {
            if (!ask.classList.contains('is-visible')) return;
            if (res.fallback) { albumListenTimer = setTimeout(() => confirmar(ALBUM_NOMBRES_DEMO[albumNombreIdx % ALBUM_NOMBRES_DEMO.length]), LISTEN_MS); return; }
            if (res.error) {
              mic.classList.remove('is-listening');
              reply.textContent = res.error;
              // Sin permiso de micrófono o tras varios intentos sin oír nada: no se vuelve a empezar el flujo. El álbum se crea con un
              // nombre provisional y se abre; el nombre se puede cambiar después hablando con Nidi.
              albumFallos++;
              const sinMic = /permisos|dictado|micrófono/i.test(res.error);
              if (sinMic || albumFallos >= 2) {
                albumFallos = 0;
                setTimeout(() => {
                  if (!ask.classList.contains('is-visible')) return;
                  const n = window.NidoAlbums.list.filter((a) => !a.auto).length + 1;
                  resetAlbumAsk(ask);
                  createAlbum('Álbum ' + n);
                  window.nidoToast('album-nuevo', 'No he podido oírte. Se llama «Álbum ' + n + '»; dile a Nidi cómo llamarlo.', null, null, 7000);
                }, 1800);
              }
              return;
            }
            albumFallos = 0;
            confirmar(res.name);
          });
        } else if (act === 'crear') {
          createAlbum(ask.querySelector('[data-album-reply]').textContent);
          albumNombreIdx++;
          resetAlbumAsk(ask);
        } else if (act === 'cancelar') {
          resetAlbumAsk(ask);
        }
        return;
      }
      if (event.target.closest('[data-persona-action="compartir-whatsapp"]')) {
        shareToWhatsApp();
        return;
      }
      if (event.target.closest('[data-persona-action="mic"]')) {
        startListening();
        return;
      }
      if (event.target.closest('[data-persona-action="cancelar"]') || event.target.closest('[data-persona-action="otro-momento"]')) {
        closeSelection();
        return;
      }
      if (event.target.closest('[data-persona-action="salir"]')) {
        closeSelection();
        return;
      }
      if (event.target.closest('[data-persona-action="crear"]')) {
        setStep('estilo');
        return;
      }
      if (event.target.closest('[data-persona-action="volver-menu"]')) {
        closeSelection(); // el menú antiguo ya no se usa: tras ver el resultado se vuelve a la foto
        return;
      }
      if (event.target.closest('[data-persona-action="reintentar"]')) {
        if (lastStyle) createWithPerson(lastStyle);
        return;
      }
      const styleBtn = event.target.closest('[data-persona-style]');
      // «Crear algo con esta persona»: la foto es la de la persona elegida, no la que se usó en una felicitación anterior (createSource
      // se queda con la última, también con la que eligió Nidi).
      if (styleBtn) { if (activeZone && activeZone.sourceEl) createSource = activeZone.sourceEl; createWithPerson(styleBtn.dataset.personaStyle); }
    });
  }

  init(); // los listeners se cuelgan una sola vez; el script se carga al final del body

  // ---- Órdenes por voz (las usa la ayuda del pollito, en app.js) ----
  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Persona (de ejemplo o reconocida) cuyo nombre aparece en lo que se ha dicho; la de nombre más largo gana.
  // Cuando ya hay personas reconocidas de verdad, las de ejemplo (Clara, Ainhoa nieta…) dejan de contar: si no, "fotos de Clara"
  // abriría la persona de ejemplo, que no tiene ninguna de las fotos reales.
  const hayReales = () => Object.keys(PERSONAS).some((id) => PERSONAS[id].dynamic);
  // Si lo dicho es EXACTAMENTE el nombre completo de alguien, gana esa persona: con «Ana» y «Ana nieta» en la lista, «Ana» abre
  // a «Ana» (antes ganaba la primera que empezaba por Ana, y la ficha nueva no se podía abrir por su nombre).
  function personIdByName(texto) {
    const t = ' ' + norm(texto) + ' ';
    const cuentan = Object.keys(PERSONAS).filter((id) => id !== 'sinnombre' && PERSONAS[id].name && (!hayReales() || PERSONAS[id].dynamic));
    const exacta = cuentan.find((id) => ' ' + norm(PERSONAS[id].name) + ' ' === t);
    if (exacta) return exacta;
    let best = null, bestLen = 0;
    cuentan.forEach((id) => {
      const nombres = [norm(PERSONAS[id].name), norm(PERSONAS[id].name).split(' ')[0]];
      nombres.forEach((n) => { if (n.length > 2 && t.includes(' ' + n + ' ') && n.length > bestLen) { best = id; bestLen = n.length; } });
    });
    return best;
  }

  function openPerson(id) {
    fillPersonaScreen(id);
    if (PERSONAS[id] && PERSONAS[id].dynamic) refreshPersonPhotos(id);
    window.NidoNav.show('persona-fotos');
  }

  // Nombres de las personas que Nido conoce (para dárselos como contexto al asistente de voz).
  const nombres = () => Object.keys(PERSONAS).filter((id) => id !== 'sinnombre' && PERSONAS[id].name && (!hayReales() || PERSONAS[id].dynamic)).map((id) => PERSONAS[id].name);

  // Fotos (direcciones) de una persona reconocida; sirve al asistente para armar álbumes por persona.
  const fotosDePersona = (id) => ((PERSONAS[id] && PERSONAS[id].photos) || []).map(srcOfFoto);

  // ---------------------------------------------------------------
  // Para el asistente de voz (js/agente-acciones.js): qué ficha o foto hay abierta, guardar el nombre que dice la persona
  // y sacar la foto (reducida y sin metadatos) para que Nidi pueda «verla». Todo devuelve datos sencillos, nunca toca el DOM
  // más de lo que ya haría la persona con los dedos.
  // ---------------------------------------------------------------
  const esFicha = () => /^persona-(fotos|imagenes|videos)$/.test(window.NidoNav.current());
  // Nombre de una persona; null si aún no lo tiene (las de ejemplo cuentan con el suyo).
  function nombreReal(id) {
    const r = window.Reconocimiento && Reconocimiento.byId(id);
    if (r) return r.name || null;
    return PERSONAS[id] && !PERSONAS[id].dynamic && id !== 'sinnombre' ? PERSONAS[id].name : null;
  }
  function personasParaAgente() {
    return Object.keys(PERSONAS)
      .filter((id) => id !== 'sinnombre' && (!hayReales() || PERSONAS[id].dynamic))
      .map((id) => ({ id, nombre: nombreReal(id), nFotos: (PERSONAS[id].photos || []).length, real: !!PERSONAS[id].dynamic }));
  }
  function fichaAbierta() {
    const id = personaAbiertaId;
    if (!esFicha() || !id || id === 'sinnombre' || !PERSONAS[id]) return null;
    return { id, nombre: nombreReal(id), nFotos: (PERSONAS[id].photos || []).length, real: !!PERSONAS[id].dynamic };
  }
  function fechaDeFoto(el) {
    const src = el && (el.currentSrc || el.src);
    const it = ((window.NidoGaleria && window.NidoGaleria.items) || []).find((x) => x.src === src);
    const d = it && it.date instanceof Date ? it.date : null;
    return d && !isNaN(d) ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  }
  function fotoAbiertaInfo() {
    if (window.NidoNav.current() !== 'detalle-foto') return null;
    const el = currentPhotoEl();
    return el ? { tipo: el.tagName === 'VIDEO' ? 'vídeo' : 'foto', fecha: fechaDeFoto(el) } : null;
  }

  // Deletreado tal cual lo oye Nidi («J-O-S-É», «j o s é», «J. O. S. É.»): si todas las partes son letras sueltas, se juntan.
  const juntarDeletreo = (t) => {
    const partes = t.trim().split(/[\s.\-]+/).filter(Boolean);
    return partes.length > 1 && partes.every((x) => x.length === 1) ? partes.join('').toLowerCase() : t;
  };
  // Mayúscula en cada palabra del nombre, salvo las partículas («María de la Luz») y el parentesco que va detrás («Maite cuñada»,
  // igual que «Clara nieta» en la biblioteca).
  const PARENTESCO = /^(niet[oa]s?|hij[oa]s?|prim[oa]s?|t[ií][oa]s?|herman[oa]s?|cuñad[oa]s?|sobrin[oa]s?|abuel[oa]s?|madre|padre|mam[aá]|pap[aá]|suegr[oa]|yerno|nuera|amig[oa]|vecin[oa]|espos[oa]|marido|mujer|novi[oa]|bisniet[oa])$/i;
  const capNombre = (t) => t.trim().replace(/\s+/g, ' ').split(' ')
    .map((w, i) => (i > 0 && (/^(de|del|la|las|los|y|e|van|von)$/i.test(w) || PARENTESCO.test(w)) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');

  // Comprueba el nombre que ha oído Nidi para la ficha (la abierta, o la del id que se diga) SIN guardarlo.
  // Devuelve {ok:false, mensaje} (lo que Nidi le cuenta a la persona) o {ok:true, id, person, nombre}.
  function validarNombre(p) {
    p = p || {};
    // Sin id, SOLO la ficha que se ve ahora (la misma que ver_contexto le dice a Nidi). personaAbiertaId se queda con la última ficha
    // aunque la persona ya esté en Home o viendo una foto: usarlo a secas renombraba en silencio a alguien que no estaba en pantalla.
    const ficha = fichaAbierta();
    const id = p.id || (ficha && ficha.id);
    if (!id || id === 'sinnombre' || !PERSONAS[id]) return { ok: false, mensaje: 'No hay ninguna ficha de persona abierta. Abre primero la ficha de esa persona (abrir_persona) y vuelve a intentarlo.' };
    const person = window.Reconocimiento && Reconocimiento.byId(id);
    if (!person) return { ok: false, mensaje: 'Esta ficha es de ejemplo y no se le puede cambiar el nombre.' };
    const nombre = capNombre(juntarDeletreo(String(p.nombre || '').replace(/[^\p{L}\p{M}\s'’.-]/gu, '')));
    if (!nombre || nombre.length > 40) return { ok: false, mensaje: 'No he podido quedarme con ese nombre. Pídele que lo repita o que lo deletree letra a letra.' };
    const otra = Reconocimiento.people.find((x) => x !== person && x.name && norm(x.name) === norm(nombre));
    if (otra) return { ok: false, duplicado: true, mensaje: 'Ya existe otra ficha que se llama «' + otra.name + '». Pregúntale si es la misma persona o si quiere distinguirlas (por ejemplo con el apellido o «mi nieta Clara»).' };
    // «Ana» con «Ana nieta» ya en la lista (o al revés): al decir «Ana» no se sabría a cuál de las dos se refiere.
    const pal = (x) => norm(x).split(' ');
    const casi = Reconocimiento.people.find((x) => x !== person && x.name && pal(x.name)[0] === pal(nombre)[0] && (pal(x.name).length === 1 || pal(nombre).length === 1));
    if (casi) return { ok: false, duplicado: true, mensaje: 'Ya conozco a «' + casi.name + '». Si es otra persona, pregúntale cómo distinguirlas (por ejemplo «' + nombre.split(' ')[0] + ' prima» o con el apellido) y guarda ese nombre; si es la misma, díselo.' };
    if (person.name && norm(person.name) !== norm(nombre) && !p.sobrescribir) return { ok: false, yaTiene: true, mensaje: 'Esta ficha ya se llama «' + person.name + '». Si quiere llamarla «' + nombre + '», pídele que lo confirme y repite con sobrescribir=true.' };
    return { ok: true, id, person, nombre };
  }

  // ---------------------------------------------------------------
  // Guardar al momento y dejar corregir (25-sep, decidido con la usuaria). Antes Nidi pedía un «sí» antes de guardar, pero una
  // persona mayor puede decir el nombre, creer que ya está y no contestar nunca: el nombre se perdía sin que lo supiera. Ahora lo
  // que cree y lo que pasa coinciden siempre: se guarda en cuanto lo dice, Nidi se lo lee («Ya lo he guardado como José, ¿está
  // bien?») y sale «Guardado: José · Deshacer». Un nombre mal oído se ve y se arregla; uno perdido, no.
  // ---------------------------------------------------------------
  const DESHACER_MS = 8000;
  let ultimoGuardado = null; // { id, nombre, antes }: el último nombre que ha puesto Nidi, para corregirlo sin pedir permiso otra vez
  const avisarNidi = (texto) => { if (window.NidoAgente && window.NidoAgente.activa) window.NidoAgente.decir('[Aviso de la app, no lo ha dicho la persona] ' + texto); };

  // Pone el nombre en todas partes: Personas, cabecera de la ficha, álbum «Fotos de …» y grupos. Con nombre null la ficha vuelve a
  // quedarse sin nombre (y su álbum automático desaparece).
  function aplicarNombre(person, nombre) {
    const id = person.id;
    Reconocimiento.rename(person, nombre);
    registerPerson(person); // vuelve a pintar el círculo en Personas
    if (id === personaAbiertaId) document.querySelectorAll('[data-persona-name]').forEach((el) => { el.textContent = nombreDe(person); });
    const fotos = PERSONAS[id].photos || [];
    if (nombre) personAlbum(person, fotos); // «Fotos de …» con el nombre nuevo
    else if (window.NidoAlbums && window.NidoAlbums.removeKey) window.NidoAlbums.removeKey('persona:' + id);
    setTimeout(() => organizarBiblioteca(), 400); // los grupos («Clara y Ana») se rehacen con lo nuevo
    return fotos.length;
  }

  function deshacerNombre() {
    const u = ultimoGuardado;
    if (!u) return null;
    const person = Reconocimiento.byId(u.id);
    if (!person || person.name !== u.nombre) { ultimoGuardado = null; return null; }
    aplicarNombre(person, u.antes);
    ultimoGuardado = null;
    return u;
  }

  function guardarNombre(v) {
    const { id, person, nombre } = v;
    const corrige = ultimoGuardado && ultimoGuardado.id === id && person.name === ultimoGuardado.nombre;
    const antes = corrige ? ultimoGuardado.antes : person.name; // al corregir, «Deshacer» vuelve a como estaba ANTES de Nidi
    const n = aplicarNombre(person, nombre);
    ultimoGuardado = { id, nombre, antes: antes || null };
    if (window.nidoToast) {
      window.nidoToast(window.NidoNav.current(), 'Guardado: ' + nombre, 'Deshacer', () => {
        const u = deshacerNombre();
        if (!u) return;
        window.nidoToast(window.NidoNav.current(), u.antes ? 'Vuelve a llamarse ' + u.antes : 'Nombre quitado', null, null, 3000);
        avisarNidi('Ha tocado «Deshacer»: el nombre «' + u.nombre + '» se ha quitado' + (u.antes ? ' y vuelve a llamarse «' + u.antes + '»' : ' y la ficha vuelve a estar sin nombre') + '. Pregúntale cómo se llama.');
      }, DESHACER_MS);
    }
    return { ok: true, id, nombre, antes: antes || null, nFotos: n,
      mensaje: 'Hecho: guardado como «' + nombre + '»' + (n ? ' (' + n + (n === 1 ? ' foto).' : ' fotos).') : '.') +
        ' Díselo y compruébalo con ella en una sola frase: «Ya lo he guardado como ' + nombre + '. ¿Está bien?». Si te corrige, vuelve a llamar con el nombre bueno (se cambia solo). Si no quería guardarlo, llama con deshacer=true.' };
  }

  // p: { nombre, sobrescribir, deshacer, id }
  function nombrarPersonaAgente(p) {
    p = p || {};
    if (p.deshacer) {
      const u = deshacerNombre();
      return u ? { ok: true, mensaje: 'Hecho: he quitado «' + u.nombre + '»' + (u.antes ? '; vuelve a llamarse «' + u.antes + '».' : '; la ficha vuelve a estar sin nombre.') + ' Pregúntale cómo se llama.' }
        : { ok: false, mensaje: 'No hay ningún nombre recién guardado que quitar.' };
    }
    // Corregir el nombre que acaba de poner Nidi («no, es Josefa») no necesita sobrescribir: es el mismo momento.
    const f = fichaAbierta();
    const id = p.id || (f && f.id);
    const r = id && window.Reconocimiento && Reconocimiento.byId(id);
    if (r && ultimoGuardado && ultimoGuardado.id === id && r.name === ultimoGuardado.nombre) p = Object.assign({}, p, { sobrescribir: true });
    const v = validarNombre(p);
    return v.ok ? guardarNombre(v) : v;
  }

  // Abre la primera ficha sin nombre (con más fotos primero), para que Nidi pregunte quién es.
  function abrirFichaSinNombre() {
    const sin = personasParaAgente().filter((x) => x.real && !x.nombre).sort((a, b) => b.nFotos - a.nFotos)[0];
    if (!sin) return null;
    openPerson(sin.id);
    return sin;
  }

  // La foto o el fotograma que se está viendo, listo para enviar: máx. 896 px y recomprimida en un canvas (eso quita el EXIF y el GPS).
  const MAX_VER = 896;
  async function reducirParaVer(el) {
    const w0 = el.videoWidth || el.naturalWidth, h0 = el.videoHeight || el.naturalHeight;
    if (!w0 || !h0) throw new Error('sin_datos');
    const k = Math.min(1, MAX_VER / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.round(w0 * k);
    c.height = Math.round(h0 * k);
    c.getContext('2d').drawImage(el, 0, 0, c.width, c.height);
    let url = c.toDataURL('image/jpeg', 0.82);
    if (url.length < 3000 && el.tagName === 'IMG') { // Safari puede devolver el canvas en blanco: se lee el archivo y se vuelve a intentar
      const blob = await (await fetch(el.currentSrc || el.src)).blob();
      const bmp = await createImageBitmap(blob);
      const k2 = Math.min(1, MAX_VER / Math.max(bmp.width, bmp.height));
      c.width = Math.round(bmp.width * k2);
      c.height = Math.round(bmp.height * k2);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      url = c.toDataURL('image/jpeg', 0.82);
    }
    return url.split(',')[1];
  }
  // Quién sale, según el reconocimiento DEL DISPOSITIVO (de izquierda a derecha). El modelo de visión nunca identifica a nadie por la cara.
  async function personasEnFoto(el) {
    if (el.tagName === 'VIDEO' || !window.Reconocimiento) return [];
    try {
      const caras = await Promise.race([Reconocimiento.detect(el), new Promise((_, ko) => setTimeout(() => ko(new Error('tiempo')), 6000))]);
      // Con cada nombre va DÓNDE está esa cara (izquierda / centro / derecha, y delante si es grande): con solo el orden, el modelo
      // de visión le ponía el nombre a quien le parecía (a veces a alguien de otro sexo).
      // Con 3 o más caras, además el puesto («la 2.ª empezando por la izquierda»): dos pueden caer a la vez «en el centro».
      const orden = caras.slice().sort((a, b) => a.box.x - b.box.x);
      return orden.map((f, i) => {
        const q = Reconocimiento.match(f.descriptor);
        const cx = (f.box.x + f.box.w / 2) / (f.natural.w || 1);
        const lado = cx < 0.36 ? 'a la izquierda' : cx > 0.64 ? 'a la derecha' : 'en el centro';
        const puesto = orden.length > 2 ? ', la ' + (i + 1) + '.ª de ' + orden.length + ' empezando por la izquierda' : '';
        return { nombre: q && q.name ? q.name : null, posicion: lado + (f.box.w / (f.natural.w || 1) >= 0.22 ? ', delante' : '') + puesto };
      });
    } catch (e) { return []; }
  }
  async function fotoParaVer() {
    if (window.NidoNav.current() !== 'detalle-foto') return null;
    const el = currentPhotoEl();
    if (!el) return null;
    const [imageBase64, personas] = await Promise.all([reducirParaVer(el), personasEnFoto(el)]);
    return { imageBase64, tipo: el.tagName === 'VIDEO' ? 'video' : 'foto', personas, fecha: fechaDeFoto(el) };
  }

  // ---- Felicitación hecha por Nidi de principio a fin (herramienta crear_felicitacion) ----
  // Es el mismo camino que con los dedos (createWithPerson: «Creando imagen» → «Felicitación» con su pie y su botón Compartir,
  // y se guarda en «Mis felicitaciones»); solo cambia de dónde sale la foto:
  //   1. usarFotoAbierta → la foto (o el fotograma del vídeo) que tiene abierta; si no hay ninguna, no se inventa otra.
  //   2. personaId → una buena foto de esa persona: la de su cara más grande (la misma que eligió el reconocimiento para su
  //      círculo en Personas), o si no, la primera suya.
  //   3. sin nada → la foto abierta; si tampoco, la persona de la ficha abierta; si tampoco, se devuelve sinFoto para que Nidi pregunte.
  // Devuelve siempre { ok, mensaje-base… }; el texto final lo compone agente-acciones.js.
  let felicitacionEnCurso = null;
  const cargarImagen = (src) => new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ko(new Error('No se ha podido abrir la foto de esa persona'));
    img.src = src;
  });
  function mejorFotoDe(id) {
    const fotos = fotosDePersona(id);
    const person = window.Reconocimiento && Reconocimiento.byId(id);
    const cara = person && person.avatar && person.avatar.src;
    return cara && fotos.includes(cara) ? cara : fotos[0] || null;
  }
  async function crearFelicitacionAgente(p) {
    p = p || {};
    if (felicitacionEnCurso) return { ok: false, ocupado: true };
    if (!CAPTIONS[p.estilo]) return { ok: false, error: 'estilo desconocido: ' + p.estilo };
    const enDetalle = window.NidoNav.current() === 'detalle-foto';
    const ficha = fichaAbierta();
    let source = null, origen = 'yo', volverA = null, personaId = p.personaId || null;
    if (p.usarFotoAbierta || (!personaId && enDetalle)) {
      source = enDetalle ? currentPhotoEl() : null;
      if (!source) return { ok: false, sinFotoAbierta: true };
      origen = 'detalle';
    } else {
      if (!personaId && ficha) personaId = ficha.id;
      if (!personaId) return { ok: false, sinFoto: true };
      const src = mejorFotoDe(personaId);
      if (!src) return { ok: false, personaSinFotos: true, nombre: nombreReal(personaId) };
      source = await cargarImagen(src);
      // «Volver» de la felicitación lleva a Yo, donde queda guardada (felicitacion-back en app.js); si falla, se vuelve a donde estaba.
      volverA = window.NidoNav.current();
    }
    // Mismo estado que dejaría el botón «Felicitación»: la pantalla de estilos empieza sin nada elegido la próxima vez.
    window.felicitacionOrigin = origen;
    felicitacionStyle = null;
    document.querySelectorAll('[data-felicitacion-card]').forEach((c) => c.classList.remove('is-selected'));
    felicitacionEnCurso = createWithPerson(p.estilo, { source, volverA });
    try {
      const r = await felicitacionEnCurso;
      return Object.assign(r, { estilo: p.estilo, titulo: CAPTIONS[p.estilo], persona: personaId ? nombreReal(personaId) : null, conFotoAbierta: origen === 'detalle' });
    } finally { felicitacionEnCurso = null; }
  }

  const agente = {
    estado: () => ({ ficha: fichaAbierta(), personas: personasParaAgente(), foto: fotoAbiertaInfo() }),
    nombrarPersona: nombrarPersonaAgente,
    abrirFichaSinNombre,
    fotoParaVer,
    crearFelicitacion: crearFelicitacionAgente,
    estilosFelicitacion: () => Object.keys(CAPTIONS),
    creandoFelicitacion: () => !!felicitacionEnCurso,
  };

  return { buildHotspots, closeSelection, composeFelicitacionBlob, personIdByName, nombres, fotosDePersona, crearAlbum: createAlbum, openPerson, openFelicitacionDesdeYo: () => openFelicitacion(true), agente };
})();
