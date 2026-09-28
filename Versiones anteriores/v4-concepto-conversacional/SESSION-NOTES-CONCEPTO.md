# Nido · concepto conversacional — notas

Carpeta duplicada de `prototipo-v3` (22-sep) para explorar, sin tocar el original ni Netlify, el
feedback del tutor David: app puramente conversacional, sin controles deterministas ("crear álbum"
con botones). El archivo `SESSION-NOTES.md` de esta carpeta es el histórico heredado de v3 — las
notas de ESTE concepto van aquí, aparte, para no mezclarlas.

## Qué hay

- **`concepto-conversacional.html`** — el flujo completo: inicio (foto + frase, sin menú) → tocar
  foto (explorar) o tocar texto/mascota (hablar) → conversación real con Nidi → historia armada
  (el propio asistente escribe el resumen) → seguir mirando. También publicado como Artifact de
  Claude (privado): https://claude.ai/artifact/77iyMHFCkzX4c9XnxQdEDJ — **ojo:** esa versión publicada
  es de antes de añadir la biblioteca real y la búsqueda por persona; si se quiere esa parte también
  ahí, hay que volver a publicar (no se hace sola).
- **`js/agente-concepto.js`** — conversación real con ElevenLabs (agente NUEVO, no el "Nidi" de la
  app de botones — llevan prompts distintos). Tres herramientas de cliente:
  - `guardar_recuerdo(quien, que)` — cada cosa que la persona cuenta.
  - `cerrar_historia(resumen)` — el asistente ESCRIBE él mismo el resumen final (no se cose a mano
    en el cliente): así "cómo se transforma la conversación en datos" tiene una respuesta concreta.
  - `buscar_persona(nombre)` — ver más abajo.
- **`js/biblioteca-concepto.js`** — carga las 38 fotos reales + reconocimiento (reutiliza
  `js/reconocimiento.js` del prototipo-v3 tal cual). Dos velocidades a propósito: la lista de fotos
  carga rápido (arranca la app), el reconocimiento de caras corre detrás sin bloquear nada y solo se
  espera de verdad cuando alguien pregunta por un nombre.
- **`servidor-concepto.mjs`** — servidor SOLO LOCAL (nada de Netlify). Necesita `.env.concepto`
  (no existe todavía, hay que crearlo — ver pendientes) con `ELEVENLABS_API_KEY` y
  `ELEVENLABS_AGENT_ID` del agente nuevo. Arrancar: `node servidor-concepto.mjs`; también sirve por
  wifi en la IP que imprime, para probar en el móvil.
- **Modo simulado** (red de seguridad): si el asistente real no conecta (falta `.env.concepto`,
  sin internet…), el concepto sigue funcionando con preguntas de guion, nunca se queda mudo.

## Navegar por personas sin hacer nada (22-sep, noche)

Petición: "quiero ver fotos de mi nieta Laura" aunque Nido no sepa quién es Laura — que enseñe
candidatas y, al tocar la que es, aprenda el nombre para siempre, sin que la persona tenga que
hacer nada más que seguir hablando y tocando.

**Importante — `assets/biblioteca-personas.json` (Clara nieta, Ana nieta, Carlos hijo, Joaquín,
Sergio hijo) es una chuleta de pruebas de ESTA sesión, con las fotos de la familia de la usuaria.
NO es parte de la app real: alguien nuevo que meta sus propias fotos no tiene ese archivo, y
`Reconocimiento.people` empieza en 0.** Probado explícitamente así (ver abajo).

Cómo funciona `buscar_persona`:
1. Limpia el nombre pedido ("mi nieta Laura" → "Laura", mismo criterio que ya usaba `persona.js`
   en el prototipo-v3).
2. Si ya hay alguien con ese nombre → le enseña sus fotos reales dentro del propio chat (una
   burbuja más, no una pantalla nueva) y el asistente dice cuántas ha enseñado.
3. Si no → le enseña hasta 6 personas sin nombre que salen en 2+ fotos, con la pregunta "¿es alguna
   de estas?". Tocar una: `Reconocimiento.rename()` (ya persiste solo, vía localStorage
   `nido-personas-v1`) + se abre una conversación sobre una de sus fotos. Un solo toque confirma
   identidad y sigue navegando.

**Probado con Chrome headless, simulando al agente (sin credenciales todavía):**
- Con la chuleta puesta: "Clara" → 13 fotos en <1s. "Laura" (no existía) → candidatas → al tocar,
  aprendida; sesión nueva (recarga de página) → "Laura" ya reconocida al instante → confirma que el
  vínculo persiste entre visitas (localStorage).
- **Desde cero de verdad** (localStorage borrado + `biblioteca-personas.json` interceptado a `[]`
  antes de cargar la página, para que sobreviva a la recarga): `Reconocimiento.people.length` = 0 al
  arrancar; "mi nieta Laura" → desconocida → candidatas de caras genéricas (sin ningún nombre previo
  de nadie) → al tocar, aprendida como "Laura" (nombre limpio, no "mi nieta Laura").

**Bugs encontrados y arreglados en esta prueba:**
- Las candidatas comparaban `foto.src` (ruta relativa del JSON) contra `persona.avatar.src` (URL
  absoluta que resuelve el navegador) → nunca coincidían → todas las candidatas mostraban la
  primera foto de la biblioteca por error (una fotografía de un gato). Arreglado guardando también
  `absSrc` (el `currentSrc` real del `<img>`) en cada entrada de la biblioteca.
- El nombre se guardaba tal cual lo decía la persona ("mi nieta Laura") en vez de solo "Laura" →
  añadida la misma limpieza de parentesco que ya usaba persona.js en v3.
- El aviso `.marco-nota` (encima del marco del teléfono) empujaba el contenido hacia abajo en
  pantallas de móvil real, pudiendo tapar la parte de abajo del chat → oculto con
  `@media (max-width:440px)`.

**Limitación conocida, no resuelta:** con MUCHAS personas sin nombre (una biblioteca grande, muchos
familiares), enseñar hasta 6 candidatas al azar puede ser poco preciso a esa escala — vale para una
familia normal, pero convendría revisarlo si la biblioteca crece mucho.

**Aún no probado:** tiempo real de reconocimiento en un móvil (aquí, en portátil, tarda pocos
segundos con 38 fotos); la conversación de verdad por voz (falta el agente en ElevenLabs).

## Pendiente (cosa de la usuaria)

1. Crear un agente NUEVO en ElevenLabs (no reutilizar "Nidi", que tiene otro comportamiento) con:
   - Mensaje del sistema: cálido, en español, nunca describe la foto (no la ve), hace preguntas
     cortas, usa `guardar_recuerdo` con lo que le cuenten, cierra con `cerrar_historia` escribiendo
     ella misma el resumen, y usa `buscar_persona` si le piden ver fotos de alguien por su nombre.
   - Tres herramientas de cliente, todas "Esperar respuesta" activado, parámetros tipo String /
     LLM Prompt:
     - `guardar_recuerdo`: `quien` (no requerido), `que` (requerido).
     - `cerrar_historia`: `resumen` (requerido) — "Escribe tú misma 2-3 frases cálidas resumiendo lo
       que te ha contado la persona sobre esta foto, en segunda persona, sin inventar nada más."
     - `buscar_persona`: `nombre` (requerido) — "Solo el nombre de la persona que se busca, sin
       palabras de parentesco delante (por ejemplo, de 'mi nieta Laura' extrae solo 'Laura')."
2. Pasar el `agent_id` (no es secreto) y una clave de API nueva (copiada, nunca pegada en el chat)
   para crear `.env.concepto` y probarlo de verdad.

## Mascota nueva de Masko Studio (22-sep, mediodía)

Primera pose real sustituyendo al pollito de IA: `pollito_cheerful.gif` (960×960, transparencia real,
225 fotogramas, 30 MB) → comprimido a `assets/img/concepto/pollito-cheerful.webp` (0,6 MB, 75 fotogramas,
360×360) + `pollito-cheerful-quieto.webp` (9 KB, último fotograma, para el estado en reposo).

Cambio de mecanismo: un WebP animado no se controla con `.play()/.pause()` como un vídeo — se anima solo
en cuanto carga. `estadoConv()` ahora cambia el propio `src` de la imagen: `POLLITO_HABLANDO + '?t=' +
Date.now()` mientras habla (el `?t=` fuerza que arranque desde el primer fotograma cada vez, si no el
navegador reutilizaría la versión ya cargada), y `POLLITO_QUIETO` el resto del tiempo. `<video>` → `<img>`.

Pendiente: la usuaria va a exportar con "Animate" en Masko Studio otras poses — "Curious Tilt" (escuchando),
"Thoughtful Ponder" (encaja literal con el aviso "Repasando tus fotos…" de buscar_persona), "Happy Wave"
(saludo inicial). Mismo proceso de compresión en cuanto lleguen los archivos.

Evaluado y descartado por ahora (no por esta noche, no por gratis): **MascotBot** (mascot.bot) — usa Rive,
compatible confirmado con ElevenLabs (infiere visemas del audio, sin tocar el pipeline de voz), pero de
pago (49 $/mes mínimo, sin plan gratis) y pensado para integrarse vía React. Revisar más adelante si el
proyecto sigue, no para el concepto de esta noche.

## Reparto final de poses (22-sep, tarde) — probado de punta a punta

- **Cheerful Chirp** → hablando.
- **Pensativo** (ojos grandes, mirada atenta) → escuchando. Antes escuchar y estar en reposo se veían
  igual; ya no.
- **Sonrojado** → reacción breve (2,6 s) en dos momentos, y luego vuelve sola a lo que estuviera
  pasando antes (`ultimoEstado`):
  1. Al aprender el nombre de la persona (`guardar_nombre_usuario`).
  2. Cuando lo que cuenta en `guardar_recuerdo` menciona pareja/marido/esposo/esposa/novio/novia/
     bebé/recién nacido (`esMomentoTierno`, busca esas palabras en `quien`+`que`, sin acentos).
- Un recuerdo normal (sin esas palabras) no dispara nada — probado explícitamente para evitar falsos
  positivos.

Las tres poses ya como WebP en `assets/img/concepto/` (animada + quieta cada una, ~0,5 MB / ~9 KB).

## Cuarta pose: Happy Wave = saludo (22-sep, tarde)

`pollito-saludando.webp` (254→85 fotogramas, 0,69 MB). Solo se ve en el PRIMER "hablando" de cada
conversación nueva (`primerHablando`, se reinicia en `abrirConversacion`); a partir del segundo turno
pasa a la pose normal de hablar (Cheerful Chirp). Probado: saluda al abrir, cambia a la normal en el
2º turno, y vuelve a saludar al abrir una conversación distinta sobre otra foto.

Reparto final: Cheerful Chirp = hablar (turnos 2+), Happy Wave = primer saludo, Pensativo = escuchar,
Sonrojado = reacción (nombre / pareja / bebé).

## Registro al principio, como en prototipo-v3 (22-sep, noche)

Petición: que la app no empiece directamente en la foto+frase, sino con el mismo arranque de
prototipo-v3 (crear la cuenta), y que al terminar el permiso de galería entre directamente en la
conversación — Nidi presentándose y preguntando el nombre hace de "onboarding", no hace falta
inventar una pantalla nueva para eso.

Flujo añadido delante de todo lo demás: **bienvenida** (vídeo del pollito naciendo) → **pre-registro**
(vídeo de las fotos) → **registro-1** (valor + "Entrar") → **registro-2** (teléfono, autorrelleno) →
**registro-3** (código, autorrelleno) → modal **"Ayúdanos"**. Al tocar **"Permitir"** (o "Quiero saber
más", que en v3 iba al mismo sitio) ya NO hay `registro-nidi`/`registro-4` con botones: se llama
directamente a `abrirConversacion(pick(FOTOS))` — la conversación real de este concepto, que ya
saluda y pregunta el nombre por su cuenta (`saludoInicial`). Se espera a que la biblioteca de fotos
esté cargada (`fotosListoPromise`) antes de arrancar, para no lanzar la conversación sin ninguna foto
real que enseñar.

HTML/CSS portados tal cual de `index.html`/`css/registro.css`/`pre-registro.css`/`bienvenida.css`/
`components.css` de este mismo prototipo-v4 (copia de v3), **no** enlazando esas hojas de estilo
completas (traen su propio sistema de `body`/`.screen-canvas-wrap` pensado para otro layout) sino
copiando el CSS necesario dentro del `<style>` del propio `concepto-conversacional.html`, con dos
salvedades:
- `.status-bar`/`.home-bar` de v3 se renombran a `.reg-status-bar`/`.reg-home-bar`: esos nombres ya
  existían en este concepto con otro diseño (la píldora de las vistas de foto/conversación/historia)
  y pisarlos las habría roto.
- El resto de nombres (`.btn`, `.registro-*`, `.screen--bienvenida`...) no existían aquí, se mantienen
  igual que en v3.

**Bug real encontrado y arreglado en la propia prueba:** el reset de estilo nativo de los botones
(`.reg-flow button{...background:none...}`) tenía MÁS especificidad CSS que `.btn--type2` (elemento+
clase gana a una sola clase), así que tapaba el azul del botón "Permitir" — salía en blanco, sin texto
visible. Arreglado envolviendo esos resets en `:where(...)` (especificidad cero a propósito), sin
tocar nada más.

**Imágenes nuevas del pollito** (las 6 que mandó la usuaria, fotos de producto estilo Masko/3D sobre
fondo blanco, distintas de los WebP animados con transparencia que ya llevaba la mascota) guardadas en
`assets/img/concepto/registro/pollito-ref-{pensativo,saludo,abrazo,guino,timido,alegre}.webp`. De
momento en uso: **alegre** (brazos abiertos) como foto hero de registro-1, en vez de la ilustración
ancha de "pollitos en el sofá" de v3 (esa imagen bebía de un sangrado lateral pensado para ese arte
concreto; con una foto de producto cuadrada se recentró y contuvo en vez de reusar esa geometría).
**saludo** (agitando la mano) como foto del modal "Ayúdanos", en vez del collage de polaroids de v3 —
encaja mejor pidiendo permiso que enseñando fotos que la persona aún no ha subido.

Probado de punta a punta con Chrome headless simulando los toques: bienvenida → pre-registro →
registro-1 → registro-2 (teléfono autorrellenado) → registro-3 (código autorrellenado, modal aparece
solo) → Permitir → conversación real con una foto de la biblioteca y a Nidi ya hablando. No se ha
tocado `prototipo-v3` ni desplegado nada — todo dentro de esta carpeta duplicada, como ya venía siendo
la norma de esta sesión.

**Bug real en móvil, encontrado por la usuaria (22-sep, tarde):** en iPhone, el vídeo de bienvenida
(pollito saliendo del cascarón) se quedaba en blanco, sin arrancar ni avanzar. Causa: `servidor-
concepto.mjs` servía los vídeos enteros de golpe, sin soportar peticiones `Range` — Safari de iPhone
exige `206 Partial Content` de verdad para reproducir `<video>`, si no se queda muda sin ningún aviso
visible. Arreglado añadiendo soporte real de `Range`/`Accept-Ranges` al servidor (probado con `curl -H
"Range: ..."`, ahora responde 206 correctamente).

De paso, se corrigió también el texto en pantalla ("Concepto interno...") y el comentario de cabecera
del archivo: decían "no es una IA libre todavía", una frase que se quedó de antes de tener el agente
de ElevenLabs conectado — el `.env.concepto` ya está configurado y Nidi habla de verdad, el modo con
frases de guion es solo un plan B si falla la conexión, no el comportamiento normal.

## Pantalla "Hola, soy Nidi" (22-sep, tarde) — pedida tal cual el Figma (node 765:5974)

Tras el modal "Ayúdanos" ya no se entra directo en la conversación: primero se enseña esta pantalla
estática (wordmark, "Hola, soy Nidi." + subtítulo, el pollito nuevo saludando), igual que en
prototipo-v3. Sin botón: avanza sola a los 3,5s (`REGISTRO_NIDI_MS`, mismo tiempo que v3) o al tocar
en cualquier sitio de la pantalla — desde ahí sí se entra en la conversación real, que es quien hace
la pregunta "¿cómo te llamas?" de verdad (por voz, `saludoInicial`).

Mismo criterio que en registro-1: la ilustración alta de v3 (346×424) se sustituye por la foto
cuadrada nueva (`pollito-ref-saludo.webp`, la misma del modal), centrada y contenida en vez de forzar
esa proporción — geometría distinta porque el asset ya no es el mismo tipo de arte, contenido igual.

## Pantalla "Cuéntame un poco de ti" (22-sep, tarde) — Figma 814:13870, siguiente tras "Hola, soy Nidi"

Nueva pantalla `vista-nidi-mic` entre "Hola, soy Nidi" y la conversación real: dos burbujas fijas
("¡Hola! Cuéntame un poco de ti." / "Pulsa en el micrófono y dime cómo te llamas."), el mismo pollito
saludando y un botón de micrófono grande, todo sobre una foto real de la biblioteca con velo oscuro
(`rgba(41,41,41,.6)` + blur, igual que el modal "Ayúdanos"). Assets traídos tal cual de Figma mientras
el servidor de dev-mode seguía accesible: el SVG del botón de micrófono (3 círculos concéntricos +
icono, `assets/icons/icon-mic-boton-grande.svg`) y se confirmó que la "foto" que Figma llamaba
internamente "quita el interrogante 1" es, de hecho, la misma `pollito-ref-saludo.webp` que ya
habíamos subido nosotros — mismo asset, sin nada nuevo que traer ahí.

La foto de fondo se elige UNA vez, al salir de "Hola, soy Nidi" (no al tocar el micrófono), para que
no haya un salto de imagen entre esta pantalla y la conversación real que empieza justo después sobre
la misma foto. Al tocar el micrófono grande, arranca `abrirConversacion` de verdad — a partir de ahí
es la propia Nidi, hablando, quien pregunta el nombre (`saludoInicial`); las dos burbujas de esta
pantalla son texto fijo de instrucción, no algo que diga el agente.

Además, por petición explícita, el pollito de "Hola, soy Nidi" pasó de la foto fija a el GIF animado
de verdad (`pollito-saludando.webp`, el mismo que ya usaba la conversación para el primer saludo) —
el del modal "Ayúdanos" se queda igual, fijo (no se pidió cambiarlo).

**Nota sobre una falsa alarma en la propia prueba:** un primer screenshot automatizado (tomado a los
200ms de tocar "Permitir", con la transición CSS de 450ms aún a mitad) mostraba el texto del modal
"Ayúdanos" fantasma por debajo de "Hola, soy Nidi" — parecía un bug de pantallas superpuestas. Repetido
esperando a que la transición termine del todo: `opacity` de la pantalla vieja da 0 limpio, no hay tal
bug, era solo el cross-fade de 450ms (el mismo que ya usa toda la app) capturado a mitad de camino.

## Nidi propone la foto + fotos relacionadas + "generar recuerdo" (22-sep, noche) — Figma 814:13964

Tras tocar el micrófono ya no se entra directo en la conversación: primero un momento breve y sin
texto (`vista-nidi-propone`, Figma 814:13964) — la foto en un polaroid con borde punteado, y el
pollito pensativo al lado, rotado -4.97° como en el diseño. Avanza sola a los 2,6s o al tocar, mismo
patrón que el resto de este flujo. Curiosidad: la imagen que Figma llamaba internamente "quita el
interrogante 1" resultó ser, comprobado descargándola, la misma `pollito-ref-pensativo` que ya
teníamos subida nosotros — no hubo que traer ningún asset nuevo.

**Flechas de fotos relacionadas**, dentro de la conversación (`vista-conversacion`): botones
izquierda/derecha, alternativa táctil a "deslizar" (principio de la sección 6 del CLAUDE.md: nunca
depender solo de un gesto). "Relacionada" = misma fecha exacta que la foto actual y, si no hay
bastantes, se completa con las cronológicamente más próximas — es la única señal real que hay en
`biblioteca.json` (solo trae `src`/`tipo`/`fecha`, nada de personas ni eventos), así que no se inventa
ningún criterio que no se pueda sostener. Cada toque abre una conversación nueva sobre esa foto
(recicla `abrirConversacion`, misma lógica que ya usaba "otra_foto" por voz).

**"Crear un recuerdo nuevo" — de momento SIMULADO.** Botón nuevo en la pantalla de historia (borde
punteado azul, estilo "añadir" ya usado en v3). No hay ninguna IA de generación de imágenes conectada
en este proyecto todavía — al tocarlo, el propio botón lo dice con honestidad ("esto es una maqueta")
en vez de fingir un resultado. Pendiente de la usuaria: qué herramienta de generación quiere usar de
verdad si se conecta esto en serio.

## Nidi se presenta sola, sin esperar el toque del micrófono (22-sep, noche)

Petición: que si no se toca el micrófono, la propia Nidi (voz real) se presente sola; y si aun así no
hay respuesta al cabo de un rato, que recuerde con calidez que hay que pulsar el micrófono — para que
sea la persona quien decide cuándo habla (sensación de control), no un micrófono que ya escucha desde
el principio.

Implementado en `vista-nidi-mic`: al entrar, arranca ya una sesión real de ElevenLabs con
`{{saludo}}` = "preséntate como Nidi, cálida, en una frase, e invita a pulsar el micrófono" —
Nidi puede HABLAR (la salida de voz no depende del micrófono) pero no puede ESCUCHAR todavía: se
añadió un hook nuevo, `microForzadoMudo`, en `js/agente-concepto.js` (`onModeChange` fuerza el mudo
si esa función devuelve `true`, sin importar si tocaría escuchar) y un `setMicMuted` público para
poder desmutear al instante en el momento exacto del toque, sin esperar al próximo cambio de turno.
Si pasan 7s sin tocar el micrófono, el texto de la segunda burbuja cambia solo a "Cuando quieras,
pulsa el micrófono para contarme algo" — de momento un aviso local (texto, no vuelto a decir en voz),
no una nueva llamada al agente; lo digo explícitamente porque es una simplificación consciente, no
un descuido.

Al tocar el micrófono: se desmutea, se para esa sesión de "presentación" (si no, la siguiente
conversación real no arrancaría — `agente-concepto.js` no deja abrir una sesión nueva mientras haya
una activa) y se sigue con la pantalla de "Nidi propone la foto" de siempre.

**No verificable del todo en este entorno:** la parte de voz real (que Nidi hable sola sin tocar nada)
necesita el `.env.concepto` con credenciales e internet de verdad — el entorno donde pruebo con Chrome
headless no tiene salida a internet, así que solo pude confirmar que el código no rompe nada y cae
limpio en las burbujas fijas de siempre si la conexión falla. **Falta probarlo en el móvil de verdad**
para confirmar que se oye a Nidi presentándose sin tocar nada.

## Tres bugs reales de la prueba en el móvil (22-sep, noche) — feedback directo de la usuaria

1. **"Da por sentado que soy yo la de la foto".** `contextoParaFoto` decía literalmente "una foto
   SUYA" en su primera frase, contradiciendo la frase siguiente ("no supongas quién sale") — el
   propio texto que le mandamos al agente ya llevaba el bug, no era el agente "portándose mal". Se
   veía en la voz real: "tengo aquí una foto TUYA...". Arreglado: ahora dice "una foto de la
   biblioteca familiar" y añade explícito "NO SABES si la persona sale en ella o no, nunca digas
   'esta foto tuya'".

2. **"No me ha dejado pulsar el micrófono, ha saltado directamente a una imagen y a eso".** Al tocar
   el micrófono (pantalla de explicación, Figma 814:13870) se metía primero la pantalla de "Nidi
   propone la foto" (polaroid, Figma 814:13964) — 2,6s sin poder tocar nada antes de entrar en la
   conversación de verdad. Quitado ese paso intermedio de ESTE punto del flujo: tocar el micrófono
   entra ya directo en la conversación real, con el micrófono de verdad. La pantalla/función del
   polaroid (`vista-nidi-propone`, `mostrarPropuesta`) se queda montada por si se quiere usar en
   otro momento (no se ha borrado), pero ya no se interpone aquí.

3. **"Se ralla, se corta y se pone a decir otra cosa".** Encontrado mirando el propio SDK de
   ElevenLabs (`js/vendor/elevenlabs-client.js`, no documentado en ningún sitio nuestro): cuando la
   persona interrumpe a Nidi a media frase, el servidor manda un evento aparte,
   `agent_response_correction`, con lo que de verdad llegó a decir (recortado) — un evento DISTINTO
   de los mensajes normales (`onMessage`), con su propio callback (`onAgentResponseCorrection`) que
   `js/agente-concepto.js` no escuchaba en absoluto. Sin escucharlo, el bocadillo se quedaba con la
   frase larga original mientras la voz ya iba por otra cosa — de ahí la sensación de que "va a su
   bola". Conectado ahora: al llegar una corrección, el bocadillo se actualiza con el texto real.

**Sin verificar todavía (necesita el móvil):** si el problema de "no hace caso a lo que le digo" era
solo por esto, o si hay además un problema de que el micrófono se corta mientras ella habla (turno
de la sección de voz — el mic se muta mientras Nidi "habla" para que no se autointerrumpa; si ella
empieza a hablar ANTES de que Nidi termine, esa parte de la frase se pierde). Pendiente de repetir la
prueba tras estos tres arreglos.

**Voz:** la usuaria va a cambiarla ella misma en el panel de ElevenLabs (no es algo que se toque aquí).

Redesplegado en Netlify con los tres arreglos.

## Interrupción real (22-sep, noche) — "si le hablo mientras ella habla no debería cortarse"

Se quitó el mudo forzado del micrófono mientras Nidi está "hablando" (`onModeChange` en
`js/agente-concepto.js`): antes se mutaba de verdad para evitar que se autointerrumpiera, pero eso
también le impedía a la PERSONA cortarla, que es justo cómo funciona una conversación real. El propio
SDK de ElevenLabs ya sabe interrumpirse solo (evento "interruption", visto en el propio código del
SDK) y el micrófono ya pide cancelación de eco al arrancar (`echoCancellation:true`), así que el mudo
forzado no hacía falta para eso. Ahora el único mudo que queda es el explícito de antes de tocar el
micrófono la primera vez (`microForzadoMudo`, pantalla "Nidi se presenta"). También se quitó el
efecto visual de "apagado" (opacity) del botón de micrófono mientras Nidi habla, porque ya no es
verdad que esté apagado en ese momento — habría sido engañoso dejarlo así.

**Sin verificar en el móvil todavía** (necesita audio real): que de verdad se pueda interrumpir a
Nidi hablando y que siga sonando bien (sin eco raro) al dejar el mic siempre abierto.

## Desplegado en Netlify (22-sep, noche) — pedido explícito de la usuaria ("pasalo a netlify")

Sitio NUEVO, separado del de prototipo-v3 (`nido-0921-22084`, que sigue intacto): **`nido-concepto-
conversacional`** → https://nido-concepto-conversacional.netlify.app — decisión deliberada, para no
arriesgar el despliegue real de v3 con algo que sigue siendo un concepto en revisión.

Lo que hizo falta para que funcionara desplegado (no solo en el servidor local):
- **`netlify/functions/agente-concepto.js`** — versión Netlify del proxy `servidor-concepto.mjs`
  (mismo patrón que ya usaba `agente-voz.js` para el agente de botones): la clave de ElevenLabs vive
  como variable de entorno del sitio, nunca en el navegador.
- **`netlify.toml`** — redirect de `/api/agente-concepto` a esa función, para que el `fetch` del
  cliente no tenga que cambiar según corra en local o en Netlify.
- Variables de entorno puestas con `netlify env:set ... --secret --context production` (la clave
  nunca se ha visto en ninguna salida de terminal ni de chat): `ELEVENLABS_API_KEY`,
  `ELEVENLABS_AGENT_ID`. Con `--secret`, Netlify ni siquiera las devuelve por `env:list`/API — se
  verificó que de verdad estaban puestas llamando al endpoint ya desplegado y comprobando que devuelve
  una `signedUrl` real, no un error de "faltan variables".
- El vídeo (`pollito-huevo.mp4`) sirve `Range`/`206 Partial Content` de forma nativa en Netlify — el
  arreglo que hizo falta en `servidor-concepto.mjs` para el servidor local NO hace falta aquí.
- `netlify/functions/crear-imagen.js` (la IA de generación de imágenes de v3, Cloudflare Workers AI —
  ver más abajo) y `agente-voz.js` (el agente de la app de botones) viajan también al desplegar porque
  comparten `netlify/functions/`, pero esta página no los usa todavía — inofensivo, no exponen nada
  sin sus propias variables de entorno (`CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN`), que no están
  puestas en este sitio nuevo.

**Hallazgo importante para la conversación anterior sobre "generar un recuerdo":** v3 YA TIENE una IA
de generación de imágenes real y funcionando — `crear-imagen.js`, Cloudflare Workers AI
(`@cf/black-forest-labs/flux-2-klein-4b`, nivel gratuito, 10.000 "neuronas"/día), con prompts ya
afinados por estilo (cumpleaños/aniversario/Navidad/Año Nuevo) para mantener reconocibles caras/pelo/
ropa. Con eso, el botón "Crear un recuerdo nuevo" de esta página (por ahora simulado, ver más arriba)
sí podría conectarse a algo real reusando esa misma función — pendiente de decidir con la usuaria.
