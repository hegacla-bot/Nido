/* ==========================================================================
   NIDO · Datos de ejemplo
   Los wireframes no traen fotos: los recuadros azules son marcadores.
   Aquí se generan "fotos" con degradados deterministas, para que cada
   momento se distinga del de al lado sin depender de imágenes externas.
   Los nombres y grupos son los que aparecen en los wireframes.
   ========================================================================== */

const NIDO = (() => {

  /* Degradado determinista a partir de una semilla de texto. */
  function photo(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
    const h2 = (h + 42) % 360;
    return `radial-gradient(120% 90% at 28% 18%, hsl(${h} 72% 84%) 0%, transparent 60%),
            linear-gradient(150deg, hsl(${h} 58% 72%), hsl(${h2} 52% 58%))`;
  }

  const item = (label, meta) => ({ id: label, label, meta, bg: photo(label) });

  const momentos = [
    item('Playa 2023',   '9 fotos · agosto de 2023'),
    item('Cumple Sofía', '14 fotos · mayo de 2024'),
    item('Navidad',      '22 fotos · diciembre de 2024')
  ];

  const grupos = [
    item('Familia García',   '186 fotos'),
    item('Los nietos',       '94 fotos'),
    item('Amigas del barrio','41 fotos')
  ];

  const personas = [
    { id: 'lucia',  nombre: 'Lucía',       rel: 'Tu nieta', inicial: 'L', meta: '58 fotos' },
    { id: 'mario',  nombre: 'Mario',       rel: 'Tu hijo',  inicial: 'M', meta: '73 fotos' },
    { id: 'pilar',  nombre: 'Abuela Pilar',rel: 'Tú',       inicial: 'P', meta: '120 fotos' }
  ];

  const albumes = [
    item('Viaje a la playa 2023', '9 fotos'),
    item('Cumple de Sofía',       '14 fotos'),
    item('Navidad 2024',          '22 fotos'),
    item('Comida del domingo',    '11 fotos'),
    item('Los nietos en el parque','17 fotos'),
    item('Boda de Marta',         '63 fotos')
  ];

  const fotosAlbum = Array.from({ length: 9 }, (_, i) =>
    item(`Playa · foto ${i + 1}`, 'Agosto de 2023'));

  const fotosPersona = Array.from({ length: 9 }, (_, i) =>
    item(`Lucía · foto ${i + 1}`, '2024'));

  const creaciones = [
    item('Vídeo de la playa', 'creado hace 2 días'),
    item('Álbum de Navidad',  'creado en enero')
  ];

  /* Respuestas guionizadas del asistente. El prototipo no llama a ninguna
     API: simula la escucha para poder enseñar el flujo sin conexión. */
  const guiones = {
    crear: [
      'Un vídeo con las fotos de la playa',
      'Un álbum con las fotos de Lucía',
      'Una felicitación para el cumple de Sofía'
    ],
    buscar: [
      'Las fotos de la Navidad pasada',
      'Fotos de Lucía en la playa',
      'Lo que subió Mario el domingo'
    ],
    'nombrar-persona': ['Es mi nieta Lucía', 'Es mi vecina Carmen', 'Es mi hijo Mario'],
    'nombrar-album':   ['Verano en Denia', 'La comida del domingo', 'Los nietos en el parque']
  };

  return { photo, momentos, grupos, personas, albumes, fotosAlbum, fotosPersona, creaciones, guiones };
})();
