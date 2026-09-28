// Nido · concepto conversacional — biblioteca real + reconocimiento de personas.
//
// Reutiliza TAL CUAL el motor de reconocimiento del prototipo-v3 (js/reconocimiento.js) — no se
// reescribe esa parte, ya está probada. Dos velocidades a propósito:
//   1) cargarFotos()      — rápido: lee assets/biblioteca.json y las fechas. La app arranca con esto.
//   2) reconocimientoListo — lento (repasa las 38 fotos buscando caras): corre en segundo plano y
//      solo se espera de verdad cuando alguien pregunta por una persona ("buscar_persona").
// En un móvil esto puede tardar bastante la primera vez — ver el aviso que se le da al asistente.

window.NidoBibliotecaConcepto = (function () {
  let fotos = []; // { src, fecha, imgEl }
  let cargaFotos = null;
  let reconocimientoListo = null;

  async function cargarFotos() {
    if (cargaFotos) return cargaFotos;
    cargaFotos = (async () => {
      const lista = await (await fetch('assets/biblioteca.json')).json();
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
      document.body.appendChild(host);
      const pendientes = [];
      lista.filter((m) => m.tipo === 'imagen').forEach((m) => {
        const el = document.createElement('img');
        el.crossOrigin = 'anonymous';
        el.src = m.src;
        host.appendChild(el);
        const entrada = { src: m.src, fecha: m.fecha, imgEl: el, absSrc: '' };
        fotos.push(entrada);
        // El avatar que guarda el reconocimiento usa currentSrc (la URL absoluta que resuelve el navegador,
        // no la ruta relativa del JSON) — hay que guardar la misma para poder emparejar avatar → foto real.
        pendientes.push(new Promise((ok) => { el.onload = () => { entrada.absSrc = el.currentSrc || el.src; ok(); }; el.onerror = ok; }));
      });
      await Promise.all(pendientes);
    })();
    return cargaFotos;
  }

  // Repasa toda la biblioteca buscando caras: agrupa las que se repiten y las cruza con los nombres ya
  // conocidos (assets/biblioteca-personas.json). Se lanza sola nada más arrancar, en segundo plano.
  function iniciarReconocimiento() {
    if (reconocimientoListo) return reconocimientoListo;
    reconocimientoListo = (async () => {
      await cargarFotos();
      try {
        const semillas = await (await fetch('assets/biblioteca-personas.json')).json();
        window.Reconocimiento.sembrar(semillas);
      } catch (e) { /* sin nombres previos: todo el mundo empieza "sin nombre" */ }
      await window.Reconocimiento.organize(fotos.map((f) => f.imgEl));
    })();
    return reconocimientoListo;
  }

  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  // "mi nieta Laura" → "Laura": si el asistente pasa la frase entera en vez de solo el nombre, se limpia
  // igual que ya hace persona.js en el prototipo-v3, para no guardar "mi nieta Laura" como nombre de verdad.
  const limpiarNombre = (t) => (t || '').replace(/^(es|se llama|mi (nieta|nieto|hija|hijo|madre|padre|abuela|abuelo|hermana|hermano)( es)?)\s+/i, '').trim();

  // Recorre la biblioteca buscando en qué fotos sale esta persona (mismo criterio que persona.js del prototipo-v3).
  async function fotosDePersona(person) {
    const out = [];
    for (const f of fotos) {
      try {
        const caras = await window.Reconocimiento.detect(f.imgEl);
        if (caras.some((c) => window.Reconocimiento.match(c.descriptor) === person)) out.push(f);
      } catch (e) { /* una foto que falle no para las demás */ }
    }
    return out;
  }

  // Personas SIN nombre que salen en 2+ fotos: candidatas cuando se pregunta por alguien que Nido no conoce.
  function candidatosSinNombre(maxN) {
    return window.Reconocimiento.people.filter((p) => !p.name).slice(0, maxN || 6);
  }

  async function buscarPorNombre(nombre) {
    await iniciarReconocimiento();
    const t = norm(limpiarNombre(nombre));
    const conocida = window.Reconocimiento.people.find((p) => p.name && (norm(p.name).includes(t) || t.includes(norm(p.name).split(' ')[0])));
    if (conocida) {
      const suyas = await fotosDePersona(conocida);
      return { conocida: true, nombre: conocida.name, fotos: suyas };
    }
    const candidatos = candidatosSinNombre(6)
      .map((p) => ({ id: p.id, foto: fotos.find((f) => p.avatar && f.absSrc === p.avatar.src) }))
      .filter((c) => c.foto); // si algún avatar no se pudo emparejar, mejor no enseñar una foto al azar
    return { conocida: false, candidatos };
  }

  function nombrar(personId, nombre) {
    const p = window.Reconocimiento.byId(personId);
    if (p) window.Reconocimiento.rename(p, limpiarNombre(nombre));
    return p;
  }

  return {
    cargarFotos,
    iniciarReconocimiento,
    get fotos() { return fotos; },
    buscarPorNombre,
    nombrar,
  };
})();
