/* ==========================================================================
   NIDO v2 · Datos de ejemplo
   Los nombres y las agrupaciones son los de vuestros wireframes.
   Las "fotos" son degradados deterministas: cuando haya fotos reales se
   sustituye solo esta capa.
   ========================================================================== */

const NIDO = (() => {

  function bg(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
    return `radial-gradient(120% 90% at 26% 16%, hsl(${h} 74% 86%), transparent 62%),
            linear-gradient(148deg, hsl(${h} 60% 74%), hsl(${(h + 44) % 360} 54% 56%))`;
  }
  const it = (label, meta) => ({ label, meta, bg: bg(label) });

  /* Personas del círculo cercano. `tel` es el contacto de la agenda con el
     que la app enlaza el nombre — ver el README sobre qué parte de esto es
     construible de verdad. */
  const personas = [
    { id: 'lucia', nombre: 'Lucía', rel: 'Tu nieta',  ini: 'L', fotos: 58, contacto: 'Lucía Nieta', tel: '+34 611 22 33 44' },
    { id: 'mario', nombre: 'Mario', rel: 'Tu hijo',   ini: 'M', fotos: 73, contacto: 'Mario Hijo',  tel: '+34 622 33 44 55' },
    { id: 'pilar', nombre: 'Abuela Pilar', rel: 'Tú', ini: 'P', fotos: 120, contacto: null, tel: null }
  ];

  const hoyHace2 = [it('Playa 2023', '9 fotos'), it('Cumple Sofía', '14 fotos'), it('Navidad', '22 fotos')];
  const grupos   = [it('Familia García', '186 fotos'), it('Los nietos', '94 fotos'), it('Amigas del barrio', '41 fotos')];

  const albumes = [
    it('Viaje a la playa 2023', '9 fotos · agosto de 2023'),
    it('Cumple de Sofía',       '14 fotos · mayo de 2024'),
    it('Navidad 2024',          '22 fotos · diciembre de 2024'),
    it('Comida del domingo',    '11 fotos · el domingo pasado'),
    it('Los nietos en el parque','17 fotos · marzo'),
    it('Boda de Marta',         '63 fotos · junio de 2022')
  ];

  const delAlbum   = Array.from({ length: 9 }, (_, i) => it(`Playa ${i + 1}`, 'Agosto de 2023'));
  const dePersona  = Array.from({ length: 8 }, (_, i) => it(`Lucía ${i + 1}`, '2024'));
  const creaciones = [it('Vídeo de la playa', 'hace 2 días'), it('Álbum de Navidad', 'en enero')];

  /* "A mano": lo que la gente revisa a diario y hoy resuelve haciendo capturas
     de pantalla para que la foto vuelva arriba del carrete. No son recuerdos,
     son cosas de uso — por eso se ven como fichas y no como fotos. */
  const aMano = [
    { icon: 'i-id',     label: 'DNI · delante',      meta: 'Guardado en marzo' },
    { icon: 'i-id',     label: 'DNI · detrás',       meta: 'Guardado en marzo' },
    { icon: 'i-bus',    label: 'Horario del bus 42', meta: 'Lo miras casi todos los días' },
    { icon: 'i-health', label: 'Tarjeta sanitaria',  meta: 'Guardado en enero' },
    { icon: 'i-wifi',   label: 'Wifi de casa',       meta: 'La contraseña larga' },
    { icon: 'i-pill',   label: 'Pastillas de la mañana', meta: 'Foto de la caja' }
  ];

  const guiones = {
    buscar: ['Las fotos de la Navidad', 'Fotos de Lucía', 'Las de la comida del domingo'],
    crear: ['Un vídeo con las fotos de la playa', 'Una felicitación para Sofía'],
    'persona-nueva': ['Es mi vecina Carmen', 'Es mi nieta Lucía'],
    'perfil-foto': ['Pilar', 'Me llamo Pilar'],
    'nombrar-album': ['Verano en Denia', 'La comida del domingo'],
    'guardar-mano': ['El horario del médico', 'La receta de las pastillas', 'El número de la vecina']
  };

  return { bg, personas, hoyHace2, grupos, albumes, delAlbum, dePersona, creaciones, aMano, guiones };
})();
