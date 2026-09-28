# Nidi · herramientas cliente para ElevenLabs

Son las herramientas que la app ejecuta en el navegador cuando Nidi las pide. Hay **10** y no hay más: 2 en `js/agente.js` (`abrir_en_la_app`, `gestionar_albumes`) y 8 en `js/agente-acciones.js`. Los nombres tienen que ser **exactamente** estos: si el nombre del panel no coincide con el del código, Nidi la llama y no pasa nada.

**Cómo darlas de alta en el panel** (Agent → Tools → Add tool → *Client*), para cada una:
- **Name**: el nombre exacto de la ficha.
- **Description**: el texto de «Descripción para Nidi», tal cual.
- **Parameters**: uno por fila de la tabla, con su tipo, si es obligatorio (*Required*) y su descripción. Si lleva valores fijos, se ponen como *enum*.
- **Wait for response**: **activado** en todas. Nidi necesita la frase que devuelven para saber si se ha hecho.
- **Response timeout**: el de la ficha.

Al final está el mismo contenido en JSON, en el formato de *client tools* de ElevenLabs, por si se prefiere crearlas por API.

---

## 1. `ver_contexto`

**Descripción para Nidi**

> Te dice dónde está la persona ahora mismo: en qué pantalla, qué ficha de persona o qué foto tiene abierta, en qué álbum está, a quién conoce Nido por su nombre (con cuántas fotos), cuántas fichas hay sin nombre y qué álbumes hay (los suyos y los que pone Nido solo). Úsala cuando dudes de dónde está o de qué tiene delante, antes de guiarla paso a paso y antes de guardar un nombre con nombrar_persona si no estás segura de que la ficha sigue abierta. No cambia nada.

**Parámetros**: ninguno.

**Ajustes del panel**: Wait for response = activado · Response timeout = **10 s**.

**Qué devuelve**: Un párrafo: «Ahora la persona está en la pantalla «detalle-foto». <frase de ayuda de esa pantalla> Tiene abierta la ficha de «Clara nieta» (9 fotos). Está dentro del álbum «Casa» (18). Tiene abierta una foto del 24 de diciembre de 2024: puedes mirarla con ver_foto. Personas que Nido conoce por su nombre: Clara nieta (9), Ana nieta (9)… Fichas de personas SIN nombre: 2. Álbumes creados por la persona: … Álbumes que hizo Nido por fechas (se pueden cambiar igual que los suyos: añadir, quitar, pasar fotos y renombrar): Navidad 2024 (4), …». Es el mismo texto que la app manda sola con `sendContextualUpdate` al empezar y en cada cambio de pantalla.

**Dónde está en el código**: `js/agente-acciones.js` → `verContexto()` → `window.NidoAgenteContexto('Ahora')` (`js/app.js`).

---

## 2. `abrir_en_la_app`

**Descripción para Nidi**

> Mueve la app a donde la persona quiere ir. Sirve para: el inicio, Álbumes, Personas, Yo, Mis documentos, Ajustes, «todas mis fotos» («Todas tus fotos»: todas las fotos que hay en Nido), un álbum por su nombre («el álbum Viaje»), «felicitación» (abre la pantalla para que la haga ella misma), «vuelve a la felicitación» (vuelve a enseñar la última que habéis hecho, sin repetirla), «mis felicitaciones» (Yo, donde se guardan), «mis documentos» o un papel de Mis documentos por su nombre o por lo que es («el horario del autobús», «mi tarjeta sanitaria»; se abre en grande para que lo leas con ver_foto) y «atrás» (pulsa el botón Volver de la pantalla). Para ver a una persona usa abrir_persona; para crear o cambiar álbumes usa gestionar_albumes (si le pides «crear un álbum» sin nombre, te dirá que preguntes el nombre); para que tú hagas la felicitación usa crear_felicitacion. Devuelve «Hecho: …» si lo ha abierto o «No he encontrado eso en la app.».

**Parámetros**

| Nombre | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `pedido` | string | sí | Adónde quiere ir, en pocas palabras y en español, como lo diría la persona: «el inicio», «álbumes», «personas», «yo», «mis documentos», «ajustes», «todas mis fotos», «el álbum Navidad 2024», «felicitación», «vuelve a la felicitación», «mis felicitaciones», «el horario del autobús», «atrás». |

**Ajustes del panel**: Wait for response = activado · Response timeout = **10 s**.

**Qué devuelve**: «Hecho: he abierto lo que pedía.» · «No he encontrado eso en la app.» · Si el pedido era una frase de álbumes («pasa esta foto al álbum X», «crea un álbum llamado X con…»), la frase real de gestionar_albumes. · «crea un álbum» sin nombre: «Todavía no he creado nada: falta el nombre. Pregúntale cómo quiere llamar el álbum… y créalo con gestionar_albumes, accion=crear.».

**Dónde está en el código**: `js/agente.js` (clientTools) → `hooks.abrir(pedido)` → `ayudaEntender(pedido)` en `js/app.js` (el mismo entendimiento de frases que el modo sin conexión). Acepta también `request` como nombre del parámetro.

**Ojo**: Con Nidi hablando, un pedido «crea un álbum» SIN nombre ya no abre el flujo manual (que pedía tocar otro micrófono): devuelve la frase de arriba para que Nidi pregunte el nombre. Con Nidi hablando tampoco salen los tours de primera vez (Personas, Yo, detalle de foto, álbum nuevo). El nombre de una persona gana a un álbum: «las fotos de Clara nieta» abre su ficha (desde el 25-sep ya no hay álbumes «Fotos de …»).

---

## 3. `gestionar_albumes`

**Descripción para Nidi**

> Crea álbumes, les añade fotos, pasa fotos de un álbum a otro, quita fotos de un álbum o le cambia el nombre, para que la persona no tenga que hacerlo a mano. Úsala solo cuando la persona lo pida. Antes de quitar TODAS las fotos de un álbum, confírmalo con ella. «Quitar» no borra la foto del teléfono: sigue en «Todas tus fotos». Los álbumes que pone Nido solo (por año, Navidad o verano) se cambian igual que los suyos: añadir, quitar, pasar fotos y renombrar. Al pasar fotos DESDE uno de ellos se copian (siguen también allí, porque son de esa fecha). Si la herramienta dice que el álbum de destino no existe, pregúntale si quiere crearlo y, si dice que sí, repite la llamada con crear_si_no_existe=true. Usa el nombre del álbum tal como es (el contexto te da la lista): un nombre parecido no vale y te devolverá la lista para que preguntes. Cuenta con tus palabras la frase que devuelve: si empieza por «Hecho:» se ha hecho; si no, dice qué falta o qué preguntar.

**Parámetros**

| Nombre | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `accion` | string (uno de: `crear`, `anadir`, `mover`, `quitar`, `renombrar`) | sí | Qué hacer: crear un álbum (con fotos o vacío), anadir fotos a uno que ya existe, mover fotos de un álbum a otro, quitar fotos de un álbum (no se borran) o renombrar un álbum. |
| `nombre` | string | no | Álbum afectado. En crear es el nombre del álbum nuevo; en anadir y renombrar, el álbum que ya existe; en mover, el álbum de DESTINO; en quitar, el álbum del que se quitan (si no se da, el que la persona tiene abierto). Obligatorio en crear, anadir, mover y renombrar. |
| `origen` | string | no | Solo en mover: álbum del que salen las fotos. Si no se da, el que la persona tiene abierto o del que viene la foto abierta. «Todas tus fotos» vale como origen (entonces se copian, no se quitan de allí). |
| `criterio` | string | no | Qué fotos, en palabras: «esta foto» o «la foto abierta» (la que se ve ahora), el nombre de una persona («las de Clara»; con dos nombres, las fotos en que salen juntas), un año («2025»), «Navidad», «verano», «vídeos», «fotos» (solo imágenes), «todas» o «estas fotos» (todo lo del álbum o la persona que se está viendo). Se pueden combinar («las de Clara de 2025»). Obligatorio en anadir, mover y quitar; opcional en crear (sin criterio, el álbum se crea vacío). Si no se entiende qué fotos son, no se crea ni se cambia nada y te dice qué preguntar. |
| `nuevo_nombre` | string | no | Solo en renombrar (y ahí obligatorio): el nombre nuevo del álbum. |
| `crear_si_no_existe` | boolean | no | Solo en mover: true únicamente después de que la persona haya dicho que sí a crear el álbum de destino que no existía. |

**Ajustes del panel**: Wait for response = activado · Response timeout = **10 s**.

**Qué devuelve**: Una frase corta, verdadera y con números reales. Los nombres de álbum se buscan estrictos: el exacto o uno solo que lo contenga («cas» → «Casa»); «Casa de verano» ya no cae en «Casa». Renombrar a un nombre que ya existe se rechaza. Si se ha hecho empieza por «Hecho:»: «Hecho: he pasado 6 fotos de «Casa» a «Cumpleaños». Ahora «Casa» tiene 0 fotos y «Cumpleaños» tiene 6 fotos. Ya lo tiene abierto.» · «Hecho: he quitado 4 vídeos del álbum «Viaje», que ahora tiene 17 fotos. No he borrado ninguno: siguen en «Todas tus fotos».». Si no, el motivo y qué preguntar: álbum inexistente (con la lista), falta el criterio, criterio que no entiende («las de la playa»), no hay foto abierta, «Todas tus fotos», álbum vacío, ya estaban. Tras mover o quitar sale en pantalla un aviso con «Deshacer» durante 7 s.

**Dónde está en el código**: `js/agente.js` (clientTools) → `hooks.gestionar(p)` → `gestionarAlbumes()` / `gestionarAlbumesSinRegistro()` en `js/app.js`.

---

## 4. `abrir_persona`

**Descripción para Nidi**

> Abre las fotos de una persona. Cuando quiera VER o BUSCAR fotos de alguien («enséñame las fotos de Clara», «quiero ver a mi nieta», «todas las de Carlos»), usa todas=true: se abre la cuadrícula con TODAS sus fotos, que es lo que espera ver. No abras la primera foto en su lugar. Sin todas, abre su ficha (un resumen con una fila de fotos y otra de vídeos). Con sin_nombre=true abre la ficha sin nombre que tiene más fotos, para preguntarle quién es. Si no conoce a quien se nombra, te devuelve la lista de personas que Nido conoce: ofrécele dos o tres, no inventes.

**Parámetros**

| Nombre | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | no | Nombre de la persona tal como lo conoce Nido o como lo dice ella («Clara», «Clara nieta», «Carlos»). Obligatorio salvo con sin_nombre=true. |
| `sin_nombre` | boolean | no | true para abrir una ficha de alguien que Nido aún no sabe quién es (y luego preguntárselo). Si es true, no hace falta nombre. |
| `todas` | boolean | no | true cuando quiera ver sus fotos: abre la cuadrícula con todas las fotos de esa persona. |

**Ajustes del panel**: Wait for response = activado · Response timeout = **10 s**.

**Qué devuelve**: «He abierto la ficha de Clara nieta (9 fotos).» · «He abierto una ficha sin nombre (4 fotos). Pregúntale quién es…» · «No hay ninguna ficha sin nombre…» · «No conozco a «Pepe». Nido conoce a: Clara nieta, Ana nieta, … Pregúntale si se refiere a alguien de esa lista…» · «Falta el nombre de la persona.».

**Dónde está en el código**: `js/agente-acciones.js` → `abrirPersona()` → `PersonaSelect.personIdByName` / `openPerson` y `PersonaSelect.agente.abrirFichaSinNombre()` (`js/persona.js`).

**Ojo**: Cierra la capa de ayuda antes de abrir (si no, la ficha quedaba detrás del velo). Cuando la persona abre SOLA una ficha sin nombre con Nidi activo, la app le manda el aviso «[Aviso de la app…] Acaba de abrir la ficha de alguien que Nido todavía no sabe quién es…» (app.js, `agenteAvisoFicha`); si la abre Nidi con esta herramienta, ese aviso no se manda (la respuesta ya dice que pregunte). Si «Ana» y «Ana nieta» existen, el nombre completo exacto gana.

---

## 5. `nombrar_persona`

**Descripción para Nidi**

> Guarda al momento el nombre de la persona de la ficha abierta. Úsala solo con la ficha de esa persona abierta (el contexto dice «Tiene abierta la ficha…» o «Tiene abierta una ficha SIN NOMBRE»). En cuanto te diga el nombre (deletreado antes si era dudoso), llámala: se guarda y en pantalla sale «Guardado: … · Deshacer». Después díselo y compruébalo: «Ya lo he guardado como José. ¿Está bien?». Si te corrige, vuelve a llamarla con el nombre bueno: se cambia solo. Si no quería guardarlo, llama con deshacer=true. Si el nombre ya lo tiene otra ficha, o si uno de los dos es solo un nombre de pila que coincide con el otro («Ana» cuando ya existe «Ana nieta»), no lo guarda y te pide que preguntes si es la misma persona: si dice que sí, repite con unir=true y las dos fichas se juntan en una (con «Deshacer» en pantalla); si es otra, pregúntale cómo distinguirlas. Si la ficha ya tenía otro nombre de antes, no lo cambia salvo con sobrescribir=true, que solo se usa si ella lo confirma.

**Parámetros**

| Nombre | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | no | El nombre que ha dicho, con el parentesco detrás si lo dijo («Maite cuñada», «Clara nieta»). Si lo ha deletreado, puedes pasar las letras tal cual («J-O-S-É»): se juntan solas. Sin comas ni símbolos; máximo 40 letras. No hace falta con deshacer=true. |
| `sobrescribir` | boolean | no | true solo si la ficha ya tenía otro nombre y la persona ha confirmado que quiere cambiarlo. |
| `unir` | boolean | no | true solo si la herramienta te ha dicho que ya hay otra ficha con ese nombre y la persona confirma que es LA MISMA persona: junta las dos fichas en una. |
| `deshacer` | boolean | no | true solo si no quería guardar el nombre que acabas de poner y no te da otro: lo quita y la ficha vuelve a como estaba. |

**Ajustes del panel**: Wait for response = activado · Response timeout = **10 s**.

**Qué devuelve**: «Hecho: guardado como «Maite cuñada» (4 fotos). Díselo y compruébalo con ella en una sola frase…» (y sale «Guardado: … · Deshacer» 8 s en pantalla) · con deshacer=true: «Hecho: he quitado «…»; la ficha vuelve a estar sin nombre…» · «Ya existe otra ficha que se llama «…». Pregúntale si es la misma persona…» · «Esta ficha ya se llama «…». Si quiere llamarla «…», pídele que lo confirme y repite con sobrescribir=true.» · «Ya conozco a «Ana nieta». Si es otra persona, pregúntale cómo distinguirlas (por ejemplo «Ana prima»…)» · «No hay ninguna ficha de persona abierta. Abre primero la ficha de esa persona (abrir_persona)…» (solo guarda en la ficha que se ve AHORA en pantalla) · «Esta ficha es de ejemplo y no se le puede cambiar el nombre.» · «No he podido quedarme con ese nombre. Pídele que lo repita o que lo deletree letra a letra.».

**Dónde está en el código**: `js/agente-acciones.js` → `nombrarPersona()` → `PersonaSelect.agente.nombrarPersona()` (`nombrarPersonaAgente` en `js/persona.js`).

**Ojo**: El código acepta también `persona_id`, pero Nidi no conoce los ids internos (el contexto no los da), así que no se da de alta en el panel. El nombre se guarda con cada palabra en mayúscula salvo de/del/la/y… y el parentesco que va detrás: «maite cuñada» queda «Maite cuñada», como «Clara nieta» en la biblioteca. Un deletreo («J-O-S-É», «j o s é») se junta: «José». Al guardar cierra la capa de ayuda para que se vea el nombre nuevo. Corregir el nombre que acaba de poner Nidi no pide sobrescribir; «Deshacer» (botón o deshacer=true) devuelve la ficha a como estaba antes de Nidi.

---

## 6. `abrir_foto`

**Descripción para Nidi**

> Abre fotos en grande y pasa de una a otra. En una pantalla con fotos (cuadrícula, álbum, ficha), abre en grande la número N (posicion; la primera es la 1). Con una foto ya abierta en grande, pasa a la siguiente o a la anterior (direccion) o salta a la número N (posicion). Úsala cuando diga «abre la primera», «la tercera», «pasa a la siguiente», «la de antes». Para volver a la cuadrícula usa abrir_en_la_app «atrás».

**Parámetros**

| Nombre | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `posicion` | integer | no | Número de la foto, empezando en 1 (en la pantalla que tiene delante, o dentro de las fotos en grande). |
| `direccion` | string (uno de: `siguiente`, `anterior`) | no | Con una foto abierta en grande: siguiente o anterior. |

**Ajustes del panel**: Wait for response = activado · Response timeout = **10 s**.

**Qué devuelve**: «He abierto la foto 3 de 18.» · «En esta pantalla no hay fotos que abrir.» · «No veo ninguna pantalla con fotos.».

**Dónde está en el código**: `js/agente-acciones.js` → `abrirFoto()`: cierra la capa de ayuda, hace clic en la tarjeta `.photo-card` número N visible en la pantalla activa y espera (hasta 1 s) a que la foto esté abierta, para que un ver_foto justo después la encuentre. Acepta también `numero`.

---

## 7. `ver_foto`

**Descripción para Nidi**

> Mira la foto (o el vídeo) que la persona tiene abierta en grande y te cuenta lo que se ve, junto con los nombres de quienes reconoce Nido en el propio móvil. Solo funciona con una foto abierta: si no la hay, ábrela antes con abrir_foto. Úsala solo cuando te pida que la mires, cuando pregunte algo que solo se sabe viéndola (qué hay, qué pone, dónde es) o para leerle un papel de Mis documentos (pasa su pregunta: «¿a qué hora pasa el autobús a la playa?»). Para empezar a charlar de una foto no la uses: la foto saldría del móvil; empieza con lo que te cuenta la app (quién sale y la fecha). Antes, di «Déjame que la mire» (tarda unos segundos). No leas la descripción: coméntala y haz una pregunta. Nunca digas quién es alguien por su cara: los nombres solo los da la app.

**Parámetros**

| Nombre | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `pregunta` | string | no | Opcional: lo que la persona quiere saber de la foto, con sus palabras («¿qué pone en el cartel?», «¿es de noche?»). Si no pregunta nada concreto, déjalo vacío. |

**Ajustes del panel**: Wait for response = activado · Response timeout = **30 s** (Detectar caras en el móvil (hasta 6 s) + la función, que corta a los 18 s (`PLAZO_MS` en ver-foto.js); el navegador corta a los 20 s. Con Gemma primero suele tardar 2-5 s. Por eso 30 s en el panel.).

**Qué devuelve**: «Lo que se ve: <2-3 frases>. (Foto del 24 de diciembre de 2024.) Nido reconoce a: Clara nieta, y a 1 persona que aún no sabe quién es.» · Sin foto abierta: «No hay ninguna foto abierta. Ábrela con abrir_foto…» · Sin proveedor: «Ahora mismo no puedo mirar fotos…» · Sin conexión o lento: «No he conseguido ver la foto (sin conexión o tardó demasiado)…».

**Dónde está en el código**: `js/agente-acciones.js` → `verFoto()` → `PersonaSelect.agente.fotoParaVer()` (foto reducida a 896 px en un canvas, sin EXIF/GPS, más los nombres del reconocimiento del dispositivo) → `POST /.netlify/functions/ver-foto` (Claude si hay `ANTHROPIC_API_KEY`, si no Gemini con `GEMINI_API_KEY`). Mientras, sale en pantalla «Nidi está mirando esta foto…».

---

## 8. `senalar`

**Descripción para Nidi**

> Hace brillar en la pantalla un botón para que la persona sepa cuál pulsar (brilla unos segundos o hasta que toque algo). Úsala cuando prefiera hacerlo ella misma y la estás guiando paso a paso, o cuando algo solo lo puede pulsar ella, como «Compartir» o «Elegir fotos». Si no encuentra el botón, te dice cuáles hay en la pantalla.

**Parámetros**

| Nombre | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `texto` | string | sí | Lo que pone el botón, tal cual o su principio (al menos 3 letras): «Añadir», «Volver», «Compartir», «Felicitación», «Eliminar», «Continuar»… «ayuda» marca el pollito de arriba. |

**Ajustes del panel**: Wait for response = activado · Response timeout = **10 s**.

**Qué devuelve**: «Lo estoy marcando en la pantalla (brilla): «Compartir». Dile que lo pulse.» · «No he encontrado «X» en esta pantalla. Botones que hay: «Volver», «Felicitación»…» · «Falta decir qué botón marcar…».

**Dónde está en el código**: `js/agente-acciones.js` → `senalar()`: busca entre los botones visibles el que tenga ese texto (exacto, o que alguna de sus palabras empiece por él, con al menos 3 letras) y le pone la clase `.nido-senal` (`css/base.css`). Acepta también `elemento` o `boton`.

---

## 9. `crear_felicitacion`

**Descripción para Nidi**

> Crea una felicitación de principio a fin sin que la persona toque nada: elige la foto, la pinta y la deja en pantalla con su título. Úsala cuando pida una felicitación. Hay cuatro tipos listos (cumpleanos, aniversario, navidad, anonuevo) y cualquier otra ocasión que quiera (santo, jubilación, bautizo, graduación, ánimo, gracias…) con estilo=otra: entonces tú le propones el título que irá encima y ella lo confirma, y pasas en decoracion cómo decorarla, solo con cosas que se ven. Si pide algo concreto para el título, como una edad o un nombre («un 37», «para Carmen»), pásalo en titulo («¡Feliz 37 cumpleaños!»), también en los cuatro tipos. Si no sabes la ocasión, pregúntala; si no sabes con qué foto o de quién, pregúntalo también. De qué foto sale: si dices una persona, una buena foto suya; si no, la foto que tiene abierta en grande; si no hay ninguna, la de la ficha de persona que tenga abierta. Si nombra a alguien pero quiere usar la foto que está viendo, pasa usar_foto_abierta=true. Tarda unos 10 segundos: avísale de que espere. Al terminar, el botón «Compartir» brilla y tiene que pulsarlo ella (tú no puedes enviarla). Si tarda más de la cuenta te dirá «se está creando» y la app te avisará cuando esté. Si luego se sale sin querer, vuelve a enseñársela con abrir_en_la_app «vuelve a la felicitación», no la hagas otra vez.

**Parámetros**

| Nombre | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `estilo` | string (uno de: `cumpleanos`, `aniversario`, `navidad`, `anonuevo`, `otra`) | sí | Tipo de felicitación. cumpleanos (también «cumple»), aniversario (también boda, bodas de oro), navidad (también Nochebuena, Reyes), anonuevo (también Nochevieja, fin de año) u otra (cualquier otra ocasión: entonces titulo y decoracion son obligatorios). |
| `titulo` | string | no | El texto que irá encima de la imagen, corto (máximo 40 letras) y confirmado con ella. Obligatorio con estilo=otra. En los otros cuatro tipos es opcional: úsalo para personalizarlo con lo que pida, como una edad o un nombre («¡Feliz 37 cumpleaños!», «¡Feliz cumpleaños, Carmen!»); sin él, sale el título de siempre. Números y nombres van SIEMPRE aquí, nunca en decoracion. |
| `decoracion` | string | no | Cómo decorarla, solo con cosas que se ven y sin palabras ni números (la IA los escribe mal). Obligatoria con estilo=otra («flores de primavera, mariposas y colores suaves»). En los otros tipos, opcional: un detalle extra que pida («globos dorados»). |
| `persona` | string | no | Opcional: nombre de la persona cuya foto usar, tal como lo conoce Nido («Clara», «Carlos hijo»); se usa una buena foto suya. «esta» = la de la ficha abierta. |
| `usar_foto_abierta` | boolean | no | Opcional: true para usar exactamente la foto que tiene abierta en grande, aunque hayas dicho una persona. |

**Ajustes del panel**: Wait for response = activado · Response timeout = **30 s** (La herramienta contesta como tarde a los 18 s (`ESPERA_MAX_MS`); pintar tarda 7-10 s en local. Con 30 s en el panel hay margen.).

**Qué devuelve**: «Hecho: ya tiene en pantalla la felicitación de cumpleaños con una foto de Clara nieta («¡Feliz cumpleaños!»; ha tardado 9 s). Queda guardada en «Mis felicitaciones», en Yo. Para enviarla puede compartirla con el botón «Compartir»… (lo estoy marcando, brilla)…» · falta el tipo · otra ocasión sin título o decoración («bautizo»): te pide proponerlos y llamar con estilo=otra · «No conozco a X. Nido conoce a: …» · falta la foto · no hay foto abierta · ya se está creando otra · sin conexión · «No se ha podido crear la felicitación: <motivo sencillo> (detalle técnico: …)…». Si pasan 18 s: «La felicitación se está creando…», y cuando acaba llega a Nidi «[Aviso de la app, no lo ha dicho la persona] Hecho: …».

**Dónde está en el código**: `js/agente-acciones.js` → `crearFelicitacion()` → `PersonaSelect.agente.crearFelicitacion()` (`js/persona.js`, mismo camino que los botones: «Creando imagen» → felicitación → «Mis felicitaciones») → `/.netlify/functions/crear-imagen` (Cloudflare). Acepta también `tipo` en vez de `estilo`, y sinónimos hablados.

---

## 10. `subir_fotos`

**Descripción para Nidi**

> Ayuda a subir fotos del móvil a Nido. Lleva a «Todas tus fotos», pone un botón «Elegir fotos» que brilla y te devuelve los pasos para guiar a la persona de uno en uno. Tú no puedes abrir sus fotos: el móvil exige que la persona pulse el botón. Cuando termine de elegir (o si cierra sin elegir), la app te avisará sola.

**Parámetros**: ninguno.

**Ajustes del panel**: Wait for response = activado · Response timeout = **10 s**.

**Qué devuelve**: Los pasos: pulsar «Elegir fotos», tocar «Fototeca» si sale un menú, tocar las fotos, pulsar «Añadir»; y el aviso «Se añadirán a las que ya tiene». Después llega a Nidi, sin que lo pida, «[Aviso de la app, no lo ha dicho la persona] Acaba de subir N fotos a Nido…» o «…Ha cerrado las fotos del móvil sin elegir ninguna…».

**Dónde está en el código**: `js/agente-acciones.js` → `subirFotos()`: va a «Todas tus fotos» (`album-detalle`), añade el botón temporal «Elegir fotos» (`data-pick-gallery`, `.nido-subir-fotos` en `css/base.css`) y lo hace brillar. Escucha `change`/`cancel` de `#gallery-input` para avisar a Nidi.

**Ojo**: Subir fotos SUMA a las que ya hay (listener `change` de `#gallery-input` en app.js; tope de 60 en total, las nuevas primero). La pastilla «Nidi te escucha» va arriba, sobre la barra de estado, para no tapar «Elegir fotos». Si cierra sin elegir, solo se entera Nidi (no sale el aviso de «fotos de ejemplo»).

---

## JSON para crearlas por API

Cada objeto es un `tool_config` de tipo `client`. Por API se crean una a una (`POST https://api.elevenlabs.io/v1/convai/tools` con el cuerpo `{"tool_config": <objeto>}` y la cabecera `xi-api-key`), y los `id` que devuelve se añaden al agente en `conversation_config.agent.prompt.tool_ids`. Antes de usarlo, comprueba estos nombres de campo en la documentación actual de la API de ElevenLabs: los formatos cambian. La clave nunca se pega en un archivo del proyecto.

```json
[
  {
    "type": "client",
    "name": "ver_contexto",
    "description": "Te dice dónde está la persona ahora mismo: en qué pantalla, qué ficha de persona o qué foto tiene abierta, en qué álbum está, a quién conoce Nido por su nombre (con cuántas fotos), cuántas fichas hay sin nombre y qué álbumes hay (los suyos y los que pone Nido solo). Úsala cuando dudes de dónde está o de qué tiene delante, antes de guiarla paso a paso y antes de guardar un nombre con nombrar_persona si no estás segura de que la ficha sigue abierta. No cambia nada.",
    "parameters": {
      "type": "object",
      "properties": {},
      "required": []
    },
    "expects_response": true,
    "response_timeout_secs": 10
  },
  {
    "type": "client",
    "name": "abrir_en_la_app",
    "description": "Mueve la app a donde la persona quiere ir. Sirve para: el inicio, Álbumes, Personas, Yo, Mis documentos, Ajustes, «todas mis fotos» («Todas tus fotos»: todas las fotos que hay en Nido), un álbum por su nombre («el álbum Viaje»), «felicitación» (abre la pantalla para que la haga ella misma), «vuelve a la felicitación» (vuelve a enseñar la última que habéis hecho, sin repetirla), «mis felicitaciones» (Yo, donde se guardan), «mis documentos» o un papel de Mis documentos por su nombre o por lo que es («el horario del autobús», «mi tarjeta sanitaria»; se abre en grande para que lo leas con ver_foto) y «atrás» (pulsa el botón Volver de la pantalla). Para ver a una persona usa abrir_persona; para crear o cambiar álbumes usa gestionar_albumes (si le pides «crear un álbum» sin nombre, te dirá que preguntes el nombre); para que tú hagas la felicitación usa crear_felicitacion. Devuelve «Hecho: …» si lo ha abierto o «No he encontrado eso en la app.».",
    "parameters": {
      "type": "object",
      "properties": {
        "pedido": {
          "type": "string",
          "description": "Adónde quiere ir, en pocas palabras y en español, como lo diría la persona: «el inicio», «álbumes», «personas», «yo», «mis documentos», «ajustes», «todas mis fotos», «el álbum Navidad 2024», «felicitación», «vuelve a la felicitación», «mis felicitaciones», «el horario del autobús», «atrás»."
        }
      },
      "required": [
        "pedido"
      ]
    },
    "expects_response": true,
    "response_timeout_secs": 10
  },
  {
    "type": "client",
    "name": "gestionar_albumes",
    "description": "Crea álbumes, les añade fotos, pasa fotos de un álbum a otro, quita fotos de un álbum o le cambia el nombre, para que la persona no tenga que hacerlo a mano. Úsala solo cuando la persona lo pida. Antes de quitar TODAS las fotos de un álbum, confírmalo con ella. «Quitar» no borra la foto del teléfono: sigue en «Todas tus fotos». Los álbumes que pone Nido solo (por año, Navidad o verano) se cambian igual que los suyos: añadir, quitar, pasar fotos y renombrar. Al pasar fotos DESDE uno de ellos se copian (siguen también allí, porque son de esa fecha). Si la herramienta dice que el álbum de destino no existe, pregúntale si quiere crearlo y, si dice que sí, repite la llamada con crear_si_no_existe=true. Usa el nombre del álbum tal como es (el contexto te da la lista): un nombre parecido no vale y te devolverá la lista para que preguntes. Cuenta con tus palabras la frase que devuelve: si empieza por «Hecho:» se ha hecho; si no, dice qué falta o qué preguntar.",
    "parameters": {
      "type": "object",
      "properties": {
        "accion": {
          "type": "string",
          "enum": [
            "crear",
            "anadir",
            "mover",
            "quitar",
            "renombrar"
          ],
          "description": "Qué hacer: crear un álbum (con fotos o vacío), anadir fotos a uno que ya existe, mover fotos de un álbum a otro, quitar fotos de un álbum (no se borran) o renombrar un álbum."
        },
        "nombre": {
          "type": "string",
          "description": "Álbum afectado. En crear es el nombre del álbum nuevo; en anadir y renombrar, el álbum que ya existe; en mover, el álbum de DESTINO; en quitar, el álbum del que se quitan (si no se da, el que la persona tiene abierto). Obligatorio en crear, anadir, mover y renombrar."
        },
        "origen": {
          "type": "string",
          "description": "Solo en mover: álbum del que salen las fotos. Si no se da, el que la persona tiene abierto o del que viene la foto abierta. «Todas tus fotos» vale como origen (entonces se copian, no se quitan de allí)."
        },
        "criterio": {
          "type": "string",
          "description": "Qué fotos, en palabras: «esta foto» o «la foto abierta» (la que se ve ahora), el nombre de una persona («las de Clara»; con dos nombres, las fotos en que salen juntas), un año («2025»), «Navidad», «verano», «vídeos», «fotos» (solo imágenes), «todas» o «estas fotos» (todo lo del álbum o la persona que se está viendo). Se pueden combinar («las de Clara de 2025»). Obligatorio en anadir, mover y quitar; opcional en crear (sin criterio, el álbum se crea vacío). Si no se entiende qué fotos son, no se crea ni se cambia nada y te dice qué preguntar."
        },
        "nuevo_nombre": {
          "type": "string",
          "description": "Solo en renombrar (y ahí obligatorio): el nombre nuevo del álbum."
        },
        "crear_si_no_existe": {
          "type": "boolean",
          "description": "Solo en mover: true únicamente después de que la persona haya dicho que sí a crear el álbum de destino que no existía."
        }
      },
      "required": [
        "accion"
      ]
    },
    "expects_response": true,
    "response_timeout_secs": 10
  },
  {
    "type": "client",
    "name": "abrir_persona",
    "description": "Abre las fotos de una persona. Cuando quiera VER o BUSCAR fotos de alguien («enséñame las fotos de Clara», «quiero ver a mi nieta», «todas las de Carlos»), usa todas=true: se abre la cuadrícula con TODAS sus fotos, que es lo que espera ver. No abras la primera foto en su lugar. Sin todas, abre su ficha (un resumen con una fila de fotos y otra de vídeos). Con sin_nombre=true abre la ficha sin nombre que tiene más fotos, para preguntarle quién es. Si no conoce a quien se nombra, te devuelve la lista de personas que Nido conoce: ofrécele dos o tres, no inventes.",
    "parameters": {
      "type": "object",
      "properties": {
        "nombre": {
          "type": "string",
          "description": "Nombre de la persona tal como lo conoce Nido o como lo dice ella («Clara», «Clara nieta», «Carlos»). Obligatorio salvo con sin_nombre=true."
        },
        "sin_nombre": {
          "type": "boolean",
          "description": "true para abrir una ficha de alguien que Nido aún no sabe quién es (y luego preguntárselo). Si es true, no hace falta nombre."
        },
        "todas": {
          "type": "boolean",
          "description": "true cuando quiera ver sus fotos: abre la cuadrícula con todas las fotos de esa persona."
        }
      },
      "required": []
    },
    "expects_response": true,
    "response_timeout_secs": 10
  },
  {
    "type": "client",
    "name": "nombrar_persona",
    "description": "Guarda al momento el nombre de la persona de la ficha abierta. Úsala solo con la ficha de esa persona abierta (el contexto dice «Tiene abierta la ficha…» o «Tiene abierta una ficha SIN NOMBRE»). En cuanto te diga el nombre (deletreado antes si era dudoso), llámala: se guarda y en pantalla sale «Guardado: … · Deshacer». Después díselo y compruébalo: «Ya lo he guardado como José. ¿Está bien?». Si te corrige, vuelve a llamarla con el nombre bueno: se cambia solo. Si no quería guardarlo, llama con deshacer=true. Si el nombre ya lo tiene otra ficha, o si uno de los dos es solo un nombre de pila que coincide con el otro («Ana» cuando ya existe «Ana nieta»), no lo guarda y te pide que preguntes si es la misma persona: si dice que sí, repite con unir=true y las dos fichas se juntan en una (con «Deshacer» en pantalla); si es otra, pregúntale cómo distinguirlas. Si la ficha ya tenía otro nombre de antes, no lo cambia salvo con sobrescribir=true, que solo se usa si ella lo confirma.",
    "parameters": {
      "type": "object",
      "properties": {
        "nombre": {
          "type": "string",
          "description": "El nombre que ha dicho, con el parentesco detrás si lo dijo («Maite cuñada», «Clara nieta»). Si lo ha deletreado, puedes pasar las letras tal cual («J-O-S-É»): se juntan solas. Sin comas ni símbolos; máximo 40 letras. No hace falta con deshacer=true."
        },
        "sobrescribir": {
          "type": "boolean",
          "description": "true solo si la ficha ya tenía otro nombre y la persona ha confirmado que quiere cambiarlo."
        },
        "unir": {
          "type": "boolean",
          "description": "true solo si la herramienta te ha dicho que ya hay otra ficha con ese nombre y la persona confirma que es LA MISMA persona: junta las dos fichas en una."
        },
        "deshacer": {
          "type": "boolean",
          "description": "true solo si no quería guardar el nombre que acabas de poner y no te da otro: lo quita y la ficha vuelve a como estaba."
        }
      },
      "required": []
    },
    "expects_response": true,
    "response_timeout_secs": 10
  },
  {
    "type": "client",
    "name": "abrir_foto",
    "description": "Abre fotos en grande y pasa de una a otra. En una pantalla con fotos (cuadrícula, álbum, ficha), abre en grande la número N (posicion; la primera es la 1). Con una foto ya abierta en grande, pasa a la siguiente o a la anterior (direccion) o salta a la número N (posicion). Úsala cuando diga «abre la primera», «la tercera», «pasa a la siguiente», «la de antes». Para volver a la cuadrícula usa abrir_en_la_app «atrás».",
    "parameters": {
      "type": "object",
      "properties": {
        "posicion": {
          "type": "integer",
          "description": "Número de la foto, empezando en 1 (en la pantalla que tiene delante, o dentro de las fotos en grande)."
        },
        "direccion": {
          "type": "string",
          "enum": [
            "siguiente",
            "anterior"
          ],
          "description": "Con una foto abierta en grande: siguiente o anterior."
        }
      },
      "required": []
    },
    "expects_response": true,
    "response_timeout_secs": 10
  },
  {
    "type": "client",
    "name": "ver_foto",
    "description": "Mira la foto (o el vídeo) que la persona tiene abierta en grande y te cuenta lo que se ve, junto con los nombres de quienes reconoce Nido en el propio móvil. Solo funciona con una foto abierta: si no la hay, ábrela antes con abrir_foto. Úsala solo cuando te pida que la mires, cuando pregunte algo que solo se sabe viéndola (qué hay, qué pone, dónde es) o para leerle un papel de Mis documentos (pasa su pregunta: «¿a qué hora pasa el autobús a la playa?»). Para empezar a charlar de una foto no la uses: la foto saldría del móvil; empieza con lo que te cuenta la app (quién sale y la fecha). Antes, di «Déjame que la mire» (tarda unos segundos). No leas la descripción: coméntala y haz una pregunta. Nunca digas quién es alguien por su cara: los nombres solo los da la app.",
    "parameters": {
      "type": "object",
      "properties": {
        "pregunta": {
          "type": "string",
          "description": "Opcional: lo que la persona quiere saber de la foto, con sus palabras («¿qué pone en el cartel?», «¿es de noche?»). Si no pregunta nada concreto, déjalo vacío."
        }
      },
      "required": []
    },
    "expects_response": true,
    "response_timeout_secs": 30
  },
  {
    "type": "client",
    "name": "senalar",
    "description": "Hace brillar en la pantalla un botón para que la persona sepa cuál pulsar (brilla unos segundos o hasta que toque algo). Úsala cuando prefiera hacerlo ella misma y la estás guiando paso a paso, o cuando algo solo lo puede pulsar ella, como «Compartir» o «Elegir fotos». Si no encuentra el botón, te dice cuáles hay en la pantalla.",
    "parameters": {
      "type": "object",
      "properties": {
        "texto": {
          "type": "string",
          "description": "Lo que pone el botón, tal cual o su principio (al menos 3 letras): «Añadir», «Volver», «Compartir», «Felicitación», «Eliminar», «Continuar»… «ayuda» marca el pollito de arriba."
        }
      },
      "required": [
        "texto"
      ]
    },
    "expects_response": true,
    "response_timeout_secs": 10
  },
  {
    "type": "client",
    "name": "crear_felicitacion",
    "description": "Crea una felicitación de principio a fin sin que la persona toque nada: elige la foto, la pinta y la deja en pantalla con su título. Úsala cuando pida una felicitación. Hay cuatro tipos listos (cumpleanos, aniversario, navidad, anonuevo) y cualquier otra ocasión que quiera (santo, jubilación, bautizo, graduación, ánimo, gracias…) con estilo=otra: entonces tú le propones el título que irá encima y ella lo confirma, y pasas en decoracion cómo decorarla, solo con cosas que se ven. Si pide algo concreto para el título, como una edad o un nombre («un 37», «para Carmen»), pásalo en titulo («¡Feliz 37 cumpleaños!»), también en los cuatro tipos. Si no sabes la ocasión, pregúntala; si no sabes con qué foto o de quién, pregúntalo también. De qué foto sale: si dices una persona, una buena foto suya; si no, la foto que tiene abierta en grande; si no hay ninguna, la de la ficha de persona que tenga abierta. Si nombra a alguien pero quiere usar la foto que está viendo, pasa usar_foto_abierta=true. Tarda unos 10 segundos: avísale de que espere. Al terminar, el botón «Compartir» brilla y tiene que pulsarlo ella (tú no puedes enviarla). Si tarda más de la cuenta te dirá «se está creando» y la app te avisará cuando esté. Si luego se sale sin querer, vuelve a enseñársela con abrir_en_la_app «vuelve a la felicitación», no la hagas otra vez.",
    "parameters": {
      "type": "object",
      "properties": {
        "estilo": {
          "type": "string",
          "enum": [
            "cumpleanos",
            "aniversario",
            "navidad",
            "anonuevo",
            "otra"
          ],
          "description": "Tipo de felicitación. cumpleanos (también «cumple»), aniversario (también boda, bodas de oro), navidad (también Nochebuena, Reyes), anonuevo (también Nochevieja, fin de año) u otra (cualquier otra ocasión: entonces titulo y decoracion son obligatorios)."
        },
        "titulo": {
          "type": "string",
          "description": "El texto que irá encima de la imagen, corto (máximo 40 letras) y confirmado con ella. Obligatorio con estilo=otra. En los otros cuatro tipos es opcional: úsalo para personalizarlo con lo que pida, como una edad o un nombre («¡Feliz 37 cumpleaños!», «¡Feliz cumpleaños, Carmen!»); sin él, sale el título de siempre. Números y nombres van SIEMPRE aquí, nunca en decoracion."
        },
        "decoracion": {
          "type": "string",
          "description": "Cómo decorarla, solo con cosas que se ven y sin palabras ni números (la IA los escribe mal). Obligatoria con estilo=otra («flores de primavera, mariposas y colores suaves»). En los otros tipos, opcional: un detalle extra que pida («globos dorados»)."
        },
        "persona": {
          "type": "string",
          "description": "Opcional: nombre de la persona cuya foto usar, tal como lo conoce Nido («Clara», «Carlos hijo»); se usa una buena foto suya. «esta» = la de la ficha abierta."
        },
        "usar_foto_abierta": {
          "type": "boolean",
          "description": "Opcional: true para usar exactamente la foto que tiene abierta en grande, aunque hayas dicho una persona."
        }
      },
      "required": [
        "estilo"
      ]
    },
    "expects_response": true,
    "response_timeout_secs": 30
  },
  {
    "type": "client",
    "name": "subir_fotos",
    "description": "Ayuda a subir fotos del móvil a Nido. Lleva a «Todas tus fotos», pone un botón «Elegir fotos» que brilla y te devuelve los pasos para guiar a la persona de uno en uno. Tú no puedes abrir sus fotos: el móvil exige que la persona pulse el botón. Cuando termine de elegir (o si cierra sin elegir), la app te avisará sola.",
    "parameters": {
      "type": "object",
      "properties": {},
      "required": []
    },
    "expects_response": true,
    "response_timeout_secs": 10
  }
]
```
