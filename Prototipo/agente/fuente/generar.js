// Genera agente/HERRAMIENTAS.md a partir de herramientas.json (una sola fuente: las fichas y el JSON final no se contradicen).
// Uso, desde la raíz del proyecto: node agente/fuente/generar.js agente/HERRAMIENTAS.md
const fs = require('fs');
const t = require('./herramientas.json');
const extra = {
  ver_contexto: {
    codigo: '`js/agente-acciones.js` → `verContexto()` → `window.NidoAgenteContexto(\'Ahora\')` (`js/app.js`).',
    devuelve: 'Un párrafo: «Ahora la persona está en la pantalla «detalle-foto». <frase de ayuda de esa pantalla> Tiene abierta la ficha de «Clara nieta» (9 fotos). Está dentro del álbum «Casa» (18). Tiene abierta una foto del 24 de diciembre de 2024: puedes mirarla con ver_foto. Personas que Nido conoce por su nombre: Clara nieta (9), Ana nieta (9)… Fichas de personas SIN nombre: 2. Álbumes creados por la persona: … Álbumes que pone Nido solo (se pueden abrir y copiar sus fotos, no cambiar): Navidad 2024 (4), …». Es el mismo texto que la app manda sola con `sendContextualUpdate` al empezar y en cada cambio de pantalla.',
  },
  abrir_en_la_app: {
    codigo: '`js/agente.js` (clientTools) → `hooks.abrir(pedido)` → `ayudaEntender(pedido)` en `js/app.js` (el mismo entendimiento de frases que el modo sin conexión). Acepta también `request` como nombre del parámetro.',
    devuelve: '«Hecho: he abierto lo que pedía.» · «No he encontrado eso en la app.» · Si el pedido era una frase de álbumes («pasa esta foto al álbum X», «crea un álbum llamado X con…»), la frase real de gestionar_albumes. · «crea un álbum» sin nombre: «Todavía no he creado nada: falta el nombre. Pregúntale cómo quiere llamar el álbum… y créalo con gestionar_albumes, accion=crear.».',
    ojo: 'Con Nidi hablando, un pedido «crea un álbum» SIN nombre ya no abre el flujo manual (que pedía tocar otro micrófono): devuelve la frase de arriba para que Nidi pregunte el nombre. Con Nidi hablando tampoco salen los tours de primera vez (Personas, Yo, detalle de foto, álbum nuevo). El nombre de una persona gana a un álbum: «las fotos de Clara nieta» abre su ficha (desde el 25-sep ya no hay álbumes «Fotos de …»).',
  },
  gestionar_albumes: {
    codigo: '`js/agente.js` (clientTools) → `hooks.gestionar(p)` → `gestionarAlbumes()` / `gestionarAlbumesSinRegistro()` en `js/app.js`.',
    devuelve: 'Una frase corta, verdadera y con números reales. Los nombres de álbum se buscan estrictos: el exacto o uno solo que lo contenga («cas» → «Casa»); «Casa de verano» ya no cae en «Casa». Renombrar a un nombre que ya existe se rechaza. Si se ha hecho empieza por «Hecho:»: «Hecho: he pasado 6 fotos de «Casa» a «Cumpleaños». Ahora «Casa» tiene 0 fotos y «Cumpleaños» tiene 6 fotos. Ya lo tiene abierto.» · «Hecho: he quitado 4 vídeos del álbum «Viaje», que ahora tiene 17 fotos. No he borrado ninguno: siguen en «Todas tus fotos».». Si no, el motivo y qué preguntar: álbum inexistente (con la lista), falta el criterio, criterio que no entiende («las de la playa»), no hay foto abierta, álbum automático, «Todas tus fotos», álbum vacío, ya estaban. Tras mover o quitar sale en pantalla un aviso con «Deshacer» durante 7 s.',
  },
  abrir_persona: {
    codigo: '`js/agente-acciones.js` → `abrirPersona()` → `PersonaSelect.personIdByName` / `openPerson` y `PersonaSelect.agente.abrirFichaSinNombre()` (`js/persona.js`).',
    devuelve: '«He abierto la ficha de Clara nieta (9 fotos).» · «He abierto una ficha sin nombre (4 fotos). Pregúntale quién es…» · «No hay ninguna ficha sin nombre…» · «No conozco a «Pepe». Nido conoce a: Clara nieta, Ana nieta, … Pregúntale si se refiere a alguien de esa lista…» · «Falta el nombre de la persona.».',
    ojo: 'Cierra la capa de ayuda antes de abrir (si no, la ficha quedaba detrás del velo). Cuando la persona abre SOLA una ficha sin nombre con Nidi activo, la app le manda el aviso «[Aviso de la app…] Acaba de abrir la ficha de alguien que Nido todavía no sabe quién es…» (app.js, `agenteAvisoFicha`); si la abre Nidi con esta herramienta, ese aviso no se manda (la respuesta ya dice que pregunte). Si «Ana» y «Ana nieta» existen, el nombre completo exacto gana.',
  },
  nombrar_persona: {
    codigo: '`js/agente-acciones.js` → `nombrarPersona()` → `PersonaSelect.agente.nombrarPersona()` (`nombrarPersonaAgente` en `js/persona.js`).',
    devuelve: '«Hecho: guardado como «Maite cuñada» (4 fotos). Díselo y compruébalo con ella en una sola frase…» (y sale «Guardado: … · Deshacer» 8 s en pantalla) · con deshacer=true: «Hecho: he quitado «…»; la ficha vuelve a estar sin nombre…» · «Ya existe otra ficha que se llama «…». Pregúntale si es la misma persona…» · «Esta ficha ya se llama «…». Si quiere llamarla «…», pídele que lo confirme y repite con sobrescribir=true.» · «Ya conozco a «Ana nieta». Si es otra persona, pregúntale cómo distinguirlas (por ejemplo «Ana prima»…)» · «No hay ninguna ficha de persona abierta. Abre primero la ficha de esa persona (abrir_persona)…» (solo guarda en la ficha que se ve AHORA en pantalla) · «Esta ficha es de ejemplo y no se le puede cambiar el nombre.» · «No he podido quedarme con ese nombre. Pídele que lo repita o que lo deletree letra a letra.».',
    ojo: 'El código acepta también `persona_id`, pero Nidi no conoce los ids internos (el contexto no los da), así que no se da de alta en el panel. El nombre se guarda con cada palabra en mayúscula salvo de/del/la/y… y el parentesco que va detrás: «maite cuñada» queda «Maite cuñada», como «Clara nieta» en la biblioteca. Un deletreo («J-O-S-É», «j o s é») se junta: «José». Al guardar cierra la capa de ayuda para que se vea el nombre nuevo. Corregir el nombre que acaba de poner Nidi no pide sobrescribir; «Deshacer» (botón o deshacer=true) devuelve la ficha a como estaba antes de Nidi.',
  },
  abrir_foto: {
    codigo: '`js/agente-acciones.js` → `abrirFoto()`: cierra la capa de ayuda, hace clic en la tarjeta `.photo-card` número N visible en la pantalla activa y espera (hasta 1 s) a que la foto esté abierta, para que un ver_foto justo después la encuentre. Acepta también `numero`.',
    devuelve: '«He abierto la foto 3 de 18.» · «En esta pantalla no hay fotos que abrir.» · «No veo ninguna pantalla con fotos.».',
  },
  ver_foto: {
    codigo: '`js/agente-acciones.js` → `verFoto()` → `PersonaSelect.agente.fotoParaVer()` (foto reducida a 896 px en un canvas, sin EXIF/GPS, más los nombres del reconocimiento del dispositivo) → `POST /.netlify/functions/ver-foto` (Claude si hay `ANTHROPIC_API_KEY`, si no Gemini con `GEMINI_API_KEY`). Mientras, sale en pantalla «Nidi está mirando esta foto…».',
    devuelve: '«Lo que se ve: <2-3 frases>. (Foto del 24 de diciembre de 2024.) Nido reconoce a: Clara nieta, y a 1 persona que aún no sabe quién es.» · Sin foto abierta: «No hay ninguna foto abierta. Ábrela con abrir_foto…» · Sin proveedor: «Ahora mismo no puedo mirar fotos…» · Sin conexión o lento: «No he conseguido ver la foto (sin conexión o tardó demasiado)…».',
    tiempo: 'Detectar caras en el móvil (hasta 6 s) + la función, que corta a los 18 s (`PLAZO_MS` en ver-foto.js); el navegador corta a los 20 s. Con Gemma primero suele tardar 2-5 s. Por eso 30 s en el panel.',
  },
  senalar: {
    codigo: '`js/agente-acciones.js` → `senalar()`: busca entre los botones visibles el que tenga ese texto (exacto, o que alguna de sus palabras empiece por él, con al menos 3 letras) y le pone la clase `.nido-senal` (`css/base.css`). Acepta también `elemento` o `boton`.',
    devuelve: '«Lo estoy marcando en la pantalla (brilla): «Compartir». Dile que lo pulse.» · «No he encontrado «X» en esta pantalla. Botones que hay: «Volver», «Felicitación»…» · «Falta decir qué botón marcar…».',
  },
  crear_felicitacion: {
    codigo: '`js/agente-acciones.js` → `crearFelicitacion()` → `PersonaSelect.agente.crearFelicitacion()` (`js/persona.js`, mismo camino que los botones: «Creando imagen» → felicitación → «Mis felicitaciones») → `/.netlify/functions/crear-imagen` (Cloudflare). Acepta también `tipo` en vez de `estilo`, y sinónimos hablados.',
    devuelve: '«Hecho: ya tiene en pantalla la felicitación de cumpleaños con una foto de Clara nieta («¡Feliz cumpleaños!»; ha tardado 9 s). Queda guardada en «Mis felicitaciones», en Yo. Para enviarla puede compartirla con el botón «Compartir»… (lo estoy marcando, brilla)…» · falta el tipo · otra ocasión sin título o decoración («bautizo»): te pide proponerlos y llamar con estilo=otra · «No conozco a X. Nido conoce a: …» · falta la foto · no hay foto abierta · ya se está creando otra · sin conexión · «No se ha podido crear la felicitación: <motivo sencillo> (detalle técnico: …)…». Si pasan 18 s: «La felicitación se está creando…», y cuando acaba llega a Nidi «[Aviso de la app, no lo ha dicho la persona] Hecho: …».',
    tiempo: 'La herramienta contesta como tarde a los 18 s (`ESPERA_MAX_MS`); pintar tarda 7-10 s en local. Con 30 s en el panel hay margen.',
  },
  subir_fotos: {
    codigo: '`js/agente-acciones.js` → `subirFotos()`: va a «Todas tus fotos» (`album-detalle`), añade el botón temporal «Elegir fotos» (`data-pick-gallery`, `.nido-subir-fotos` en `css/base.css`) y lo hace brillar. Escucha `change`/`cancel` de `#gallery-input` para avisar a Nidi.',
    devuelve: 'Los pasos: pulsar «Elegir fotos», tocar «Fototeca» si sale un menú, tocar las fotos, pulsar «Añadir»; y el aviso «Se añadirán a las que ya tiene». Después llega a Nidi, sin que lo pida, «[Aviso de la app, no lo ha dicho la persona] Acaba de subir N fotos a Nido…» o «…Ha cerrado las fotos del móvil sin elegir ninguna…».',
    ojo: 'Subir fotos SUMA a las que ya hay (listener `change` de `#gallery-input` en app.js; tope de 60 en total, las nuevas primero). La pastilla «Nidi te escucha» va arriba, sobre la barra de estado, para no tapar «Elegir fotos». Si cierra sin elegir, solo se entera Nidi (no sale el aviso de «fotos de ejemplo»).',
  },
};
const tipo = (v) => v.type + (v.enum ? ' (uno de: ' + v.enum.map((e) => '`' + e + '`').join(', ') + ')' : '');
let md = `# Nidi · herramientas cliente para ElevenLabs

Son las herramientas que la app ejecuta en el navegador cuando Nidi las pide. Hay **10** y no hay más: 2 en \`js/agente.js\` (\`abrir_en_la_app\`, \`gestionar_albumes\`) y 8 en \`js/agente-acciones.js\`. Los nombres tienen que ser **exactamente** estos: si el nombre del panel no coincide con el del código, Nidi la llama y no pasa nada.

**Cómo darlas de alta en el panel** (Agent → Tools → Add tool → *Client*), para cada una:
- **Name**: el nombre exacto de la ficha.
- **Description**: el texto de «Descripción para Nidi», tal cual.
- **Parameters**: uno por fila de la tabla, con su tipo, si es obligatorio (*Required*) y su descripción. Si lleva valores fijos, se ponen como *enum*.
- **Wait for response**: **activado** en todas. Nidi necesita la frase que devuelven para saber si se ha hecho.
- **Response timeout**: el de la ficha.

Al final está el mismo contenido en JSON, en el formato de *client tools* de ElevenLabs, por si se prefiere crearlas por API.

`;
t.forEach((x, i) => {
  const e = extra[x.name] || {};
  md += `---\n\n## ${i + 1}. \`${x.name}\`\n\n**Descripción para Nidi**\n\n> ${x.description}\n\n`;
  const props = Object.entries(x.parameters.properties);
  if (!props.length) md += '**Parámetros**: ninguno.\n\n';
  else {
    md += '**Parámetros**\n\n| Nombre | Tipo | Obligatorio | Descripción |\n|---|---|---|---|\n';
    props.forEach(([k, v]) => { md += `| \`${k}\` | ${tipo(v)} | ${x.parameters.required.includes(k) ? 'sí' : 'no'} | ${v.description.replace(/\|/g, '\\|')} |\n`; });
    md += '\n';
  }
  md += `**Ajustes del panel**: Wait for response = activado · Response timeout = **${x.response_timeout_secs} s**${e.tiempo ? ' (' + e.tiempo + ')' : ''}.\n\n`;
  if (e.devuelve) md += `**Qué devuelve**: ${e.devuelve}\n\n`;
  if (e.codigo) md += `**Dónde está en el código**: ${e.codigo}\n\n`;
  if (e.ojo) md += `**Ojo**: ${e.ojo}\n\n`;
});
md += `---

## JSON para crearlas por API

Cada objeto es un \`tool_config\` de tipo \`client\`. Por API se crean una a una (\`POST https://api.elevenlabs.io/v1/convai/tools\` con el cuerpo \`{"tool_config": <objeto>}\` y la cabecera \`xi-api-key\`), y los \`id\` que devuelve se añaden al agente en \`conversation_config.agent.prompt.tool_ids\`. Antes de usarlo, comprueba estos nombres de campo en la documentación actual de la API de ElevenLabs: los formatos cambian. La clave nunca se pega en un archivo del proyecto.

\`\`\`json
${JSON.stringify(t, null, 2)}
\`\`\`
`;
fs.writeFileSync(process.argv[2], md);
console.log('ok', md.length);
