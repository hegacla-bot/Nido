# Nidi · cómo crear el agente de voz nuevo en ElevenLabs

Esta carpeta tiene todo lo necesario para crear **a mano**, en el panel de ElevenLabs, el agente nuevo de Nidi. Nidi guía por la app, mira la foto abierta y charla sobre ella, pregunta quién es alguien y guarda su nombre, y hace cosas por la persona: buscar fotos, abrir álbumes, subir fotos, pasarlas de álbum y crear felicitaciones.

| Archivo | Qué es |
|---|---|
| `PROMPT.md` | El prompt de sistema, listo para pegar. |
| `HERRAMIENTAS.md` | Las 10 herramientas cliente: nombre, descripción, parámetros y ajustes del panel. Al final lleva el mismo contenido en JSON, para crearlas por API. |
| `LEEME.md` | Este archivo: los pasos, las claves, la privacidad y las pruebas. |

> **Regla de oro de Netlify:** aquí no se despliega nada. Solo se despliega cuando la usuaria lo pide expresamente, porque los créditos del mes se agotaron una vez. Cambiar una variable de entorno en Netlify tampoco sirve hasta el siguiente despliegue, así que ese paso también espera a que ella lo decida.

---

## 1. Crear el agente en el panel

1. Entra en ElevenLabs → **ElevenAgents** (Agents) → **New agent** → **Blank template**. Ponle de nombre, por ejemplo, **Nidi · Nido v2**. El agente de siempre (`agent_6001m325cmttf4ns277mgny82k4d`) no se toca: sigue funcionando hasta que se cambie el id (paso 2).
2. **Idioma** (*Agent language*): **Español**. No añadas más idiomas: si se detecta otro idioma, la conversación puede cambiar de idioma sola.
3. **Voz**: **Jessica**, la voz predeterminada. Es la misma decisión de la sesión 8: no se clona la voz de nadie. En **modelo de voz** (*TTS model*) elige el **multilingüe de menor latencia** que ofrezca el panel (Flash v2.5 o el que lo sustituya). Los modelos «English only» no sirven para español.
4. **LLM**: **Claude Haiku 4.5**. Si el panel ofrece una versión más nueva de Haiku, esa. Por qué:
   - **Latencia**: es el que ya se midió en este proyecto (unos 0,7 s en la sesión 8). En una conversación de voz, cada décima cuenta.
   - **Herramientas fiables**: Nidi tiene 10 herramientas, con valores fijos (enum) y pasos de confirmación, como `gestionar_albumes` con `crear_si_no_existe=true` o `nombrar_persona` con `sobrescribir=true`. Haiku ya llamó bien a `gestionar_albumes` en la prueba del 22-sep. Los modelos «lite» o «nano» son algo más rápidos, pero se saltan más a menudo las confirmaciones y se inventan parámetros. Aquí eso es peor que medio segundo de espera.
   - **Español natural y buen seguimiento de reglas largas**, como no leer en voz alta las instrucciones que devuelven las herramientas o no identificar caras.
   - Si en el iPhone se nota lento, prueba **Gemini 2.5 Flash** (o el Flash vigente, no el «lite») y repite las pruebas del apartado 6.
   - **Temperatura**: baja, entre 0,3 y 0,5 si el panel la ofrece. Queremos que siga las reglas, no que improvise.
   - **Llamada paralela de herramientas**: **desactivada**. Varias herramientas van en orden (abrir_foto → ver_foto, abrir_persona → nombrar_persona); en paralelo, ver_foto podría ejecutarse antes de que la foto esté abierta.
   - **LLM de respaldo**: *Predeterminado*. **Límite de tokens**: -1 (un límite puede cortar una frase o una llamada a medias). **Resumen del razonamiento** y **tiempo de espera suave**: desactivados.
5. **Primer mensaje** (*First message*):
   > ¡Hola! Soy Nidi. ¿Qué te apetece que hagamos? Podemos mirar tus fotos o te ayudo con lo que necesites.

   La app no usa variables dinámicas ni *overrides* (`js/agente.js` solo pasa `signedUrl`, `connectionType: 'websocket'` y `clientTools`). Por eso el primer mensaje es fijo y no puede llevar `{{…}}`. Lo que Nidi sabe de la pantalla le llega justo después, en silencio, por `sendContextualUpdate`.
6. **Prompt de sistema** (*System prompt*): pega todo lo que va debajo de la línea en `PROMPT.md`.
7. **Herramientas** (*Tools* → *Add tool* → **Client**): da de alta las 10 de `HERRAMIENTAS.md`. En todas, **Wait for response activado**. Timeout de **30 s** en `ver_foto` y `crear_felicitacion`, y de **10 s** en las demás. Los nombres tienen que ser exactamente los del archivo.
   - Herramientas de sistema: no hacen falta. «End conversation» es opcional. Si la activas, Nidi puede colgar cuando la persona se despida, y la app ya sabe mostrar «Hemos dejado de hablar».
   - En la prueba del propio panel (*Test AI agent*), las herramientas cliente **fallan**, porque viven en la app y no en el panel. Esa prueba solo sirve para el tono y las preguntas.
8. **Turnos y duración** (*Advanced*, si aparecen estos ajustes):
   - La app ya cierra el micrófono mientras Nidi habla (`setMicMuted`), así que las interrupciones no importan.
   - Pon **turnos pacientes** (*Turn eagerness: patient*) y un tiempo de espera de turno largo, de 10-15 s. La persona puede tardar en contestar y no queremos que Nidi la meta prisa.
   - Pon una **duración máxima** razonable, de unos 10 minutos, como tope de gasto.
9. **Seguridad** (*Security*):
   - Activa la **autenticación** (*Enable authentication*), para que solo se pueda hablar con el agente mediante una URL firmada. Es lo que ya hace `netlify/functions/agente-voz.js`, así que no rompe nada, y evita que alguien use el agente con solo saber su id.
   - No actives *overrides*: la app no los usa.
10. **Privacidad del panel** (*Privacy* / retención, si está):
    - Desactiva guardar el audio de las conversaciones.
    - Reduce todo lo posible la retención de las transcripciones.
    - Ver el apartado 4.
11. Guarda, publica y **copia el id del agente** (`agent_…`).

---

## 2. Conectar el id del agente nuevo

`netlify/functions/agente-voz.js` ya **no depende de un id fijo**. Usa la variable de entorno `ELEVENLABS_AGENT_ID` y, si no está, el agente de siempre como respaldo. El id no es secreto, pero tampoco hace falta que vaya en el código.

**En local** (servidor `servidor-local.mjs`, puerto 8990):
1. Añade estas dos líneas al `.env` del proyecto. Hoy el `.env` no tiene ninguna clave de ElevenLabs, así que en local el botón Hablar cae a la escucha del navegador.
   ```
   ELEVENLABS_API_KEY=<la clave nido-netlify o una nueva>
   ELEVENLABS_AGENT_ID=agent_…
   ```
2. Reinicia `node servidor-local.mjs` tú misma: solo lee el `.env` y las funciones al arrancar. **Hace falta reiniciarlo ya**, aunque no toques el `.env`: el que está abierto en el 8990 arrancó antes de que existiera la ruta de `ver-foto` y contesta 404, así que `ver_foto` falla siempre en local hasta que se reinicie. (Para una segunda copia de pruebas: `PORT=8998 node servidor-local.mjs`.)
3. Prueba en el Mac en `http://localhost:8990`. `localhost` cuenta como sitio seguro, así que el micrófono funciona. Desde el iPhone por la IP de la wifi (`http://192.168…:8990`) **no**: Safari solo da el micrófono con https.

**En Netlify** (sitio `nido-0921-22084`, cuenta nueva): solo cuando ella lo decida. Ver el apartado 3.

---

## 3. Claves y variables en Netlify

| Variable | ¿Hace falta? | Estado | Para qué |
|---|---|---|---|
| `ELEVENLABS_API_KEY` | Sí | **Ya está** (secreta). **Caduca ~21-oct-2026**. | `agente-voz.js`: pedir la URL firmada. |
| `ELEVENLABS_AGENT_ID` | Sí, para usar el agente nuevo | **Nueva** (no hace falta que sea secreta) | Qué agente abre `agente-voz.js`. |
| `GEMINI_API_KEY` | Sí, para `ver_foto` si no hay clave de Anthropic | **Nueva en Netlify.** Está en el `.env` local, pero `crear-imagen.js` no la usa (usa Cloudflare), así que en Netlify **no existe todavía**. | `ver-foto.js`: describir la foto. |
| `ANTHROPIC_API_KEY` | Opcional | No está | Si existe, `ver-foto.js` usa Claude antes que Gemini (más fiable; ver privacidad). |
| `NIDO_VISION_GEMINI`, `NIDO_VISION_CLAUDE` | Opcional | No están | Cambiar de modelo de visión sin tocar código (por defecto `gemma-4-26b-a4b-it,gemini-3.5-flash-lite`, en ese orden, y `claude-haiku-4-5-20251001`). |
| `NIDO_VISION_PLAZO_MS` | Opcional | No está | Tiempo total de `ver-foto` (todos los modelos e intentos). Por defecto 18000 (el navegador espera 20 s; Netlify deja hasta 60 s). |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Sí | **Ya están** | `crear-imagen.js` (felicitaciones). |

Cómo ponerlas cuando ella lo decida (con `netlify login` en la cuenta nueva). `env:set` no despliega, pero el cambio **no se nota hasta el siguiente despliegue**:
```
npx netlify-cli env:set ELEVENLABS_AGENT_ID "agent_…" --context production --site 13deb3cf-ca46-4ae5-90e3-48c3e52a4129
npx netlify-cli env:set GEMINI_API_KEY "$(pbpaste)" --secret --context production --site 13deb3cf-ca46-4ae5-90e3-48c3e52a4129
```

Cuando toque desplegar, lo que se publica sale de `~/Desktop/nido-netlify`, no de esta carpeta. Hoy allí **faltan** `js/agente-acciones.js` y `netlify/functions/ver-foto.js`, y están viejos `index.html`, `js/app.js`, `js/persona.js`, `js/agente.js`, `css/base.css` y `netlify/functions/agente-voz.js`. Hay que copiarlos antes de desplegar.

**Límite de tiempo de las funciones en Netlify.** Una función síncrona puede durar hasta **60 s** (documentación de Netlify, comprobada el 24-sep; no es configurable y es igual en todos los planes).
- `crear-imagen` tarda 7-10 s: comprobado en la web publicada el 24-sep (una felicitación real en 9,6 s, respuesta 200). Le sobra margen.
- `ver-foto` tiene un **plazo total de 18 s** (`PLAZO_MS`): prueba primero `gemma-4-26b-a4b-it` (medido el 24-sep: 16 de 16 respuestas, mediana 2,3 s, como mucho 4,2 s) y solo si falla y queda tiempo `gemini-3.5-flash-lite` (mediana 11 s). Ningún intento pasa de 12 s ni empieza con menos de 1,5 s por delante; un tiempo agotado o la cuota diaria agotada no se reintentan.

Si algo falla, Nidi ya sabe decir «no he podido verla, ¿lo intentamos otra vez?».

---

## 4. Privacidad: la decisión, para contarla en la memoria del TFM

Esto resuelve la tensión 2 de la sección 10 del documento maestro («mandar fotos familiares a una API de terceros contradice lo que promete el producto»). La decisión es **mandar lo mínimo, solo cuando hace falta y a la vista**:

- **Qué foto sale del móvil.** Solo **la foto que la persona tiene abierta**, y solo cuando la persona le pide que la mire o pregunta algo que solo se sabe viéndola (o un dato de un papel de Mis documentos). Nunca la biblioteca, nunca varias fotos, nunca en segundo plano.
- **Iniciativa de Nidi sin enviar nada (25-sep).** Cuando la persona se queda mirando una foto, Nidi empieza a charlar con lo que sabe el propio móvil (la fecha y quién sale, del reconocimiento del dispositivo); no manda la foto a la nube si ella no quiere que la mire. Los papeles de Mis documentos (DNI, tarjetas) solo se leen si pide un dato concreto.
- **Cómo sale.** Reducida a **896 px** y recomprimida en un canvas del navegador. Eso quita todos los metadatos: **sin EXIF y sin GPS**. La fecha, si hace falta, va aparte como texto («24 de diciembre de 2024»).
- **Se ve.** Mientras se manda, sale en pantalla «Nidi está mirando esta foto…».
- **Quién sale lo dice el móvil, no la nube.** El reconocimiento de caras es del propio dispositivo (face-api en el navegador; las huellas no salen del móvil). Al modelo de visión solo le llegan **nombres** («Clara nieta», «una persona que Nido aún no sabe quién es»), y tiene **prohibido identificar a nadie por la cara**.
- **No se guarda.** `ver-foto.js` no guarda ni registra la foto ni la descripción.
- **A quién va.** A Anthropic (Claude) si hay `ANTHROPIC_API_KEY`: por defecto, su API no usa los datos para entrenar. Si no, a Google (Gemini). **Ojo:** con la **capa gratuita** de la API de Gemini, Google puede usar lo que se le manda para mejorar sus productos. En la capa de pago, no. Para que la frase «no se guarda en ningún sitio» sea verdad del todo, conviene usar Claude o una clave de Gemini de pago. En la memoria hay que decirlo tal cual.
- **La conversación.** El audio y el texto de la conversación pasan por ElevenLabs y por el LLM elegido (Anthropic). Con ellos van también los nombres de la familia y los álbumes que la app le cuenta a Nidi. Nunca van fotos ni huellas de caras. En el panel se desactiva guardar el audio y se reduce la retención (paso 1.10).
- **Nidi lo cuenta si se lo preguntan.** El prompt le da la frase sencilla y verdadera: «mando solo esta foto, más pequeña y sin los datos de dónde se hizo, a un servicio que la describe; Nido no la guarda».
- **El asistente no se hace pasar por una persona** (sección 9): voz genérica (Jessica), sin clonar a nadie. Nidi dice que es la ayudante de la app si se lo preguntan.

---

## 5. Cómo está montado (por si hay que tocarlo)

- `js/agente.js`: abre la conversación con ElevenLabs y registra las herramientas `abrir_en_la_app` y `gestionar_albumes`. Tiene `NidoAgente.decir(texto)` para que la app avise a Nidi con un mensaje «[Aviso de la app, no lo ha dicho la persona] …».
  - La conexión es por **WebSocket** (`connectionType: 'websocket'`), no WebRTC.
- `js/agente-acciones.js`: las otras 8 herramientas (`ver_contexto`, `abrir_persona`, `nombrar_persona`, `ver_foto`, `abrir_foto`, `senalar`, `crear_felicitacion`, `subir_fotos`).
- `js/app.js`:
  - `NidoAgenteContexto`: lo que Nidi sabe. Se manda al empezar y en cada cambio de pantalla.
  - `agenteAvisoFicha`: cuando la persona abre SOLA una ficha sin nombre, Nidi pregunta quién es (si la abre Nidi con `abrir_persona`, no: `window.NidoAgenteFichaPreguntada`).
  - `gestionarAlbumes` y `ayudaEntender`.
- `js/persona.js`: `PersonaSelect.agente` con `estado`, `nombrarPersona`, `abrirFichaSinNombre`, `fotoParaVer` y `crearFelicitacion`.
- `netlify/functions/agente-voz.js`: URL firmada. `ver-foto.js`: visión. `crear-imagen.js`: felicitaciones.

---

## 6. Pruebas manuales en el iPhone

### Prueba mínima (unos 12 minutos de ElevenLabs, hacer ESTA primero)

Antes de gastar nada: manda una captura de la lista de herramientas del panel para comprobar gratis que los nombres coinciden con el código. Después, tres conversaciones cortas, una sola vez cada una. Termina cada conversación tocando «Nidi te escucha · Toca para terminar» (los minutos corren mientras está abierta).

1. **Personas (unos 4 min):** abre a mano una ficha sin nombre → Nidi pregunta quién es → di un nombre → sale «Guardado: … · Deshacer» y Nidi pregunta «¿Está bien?» → corrígelo («no, es …») → di «enséñame las fotos de Clara».
2. **Fotos (unos 4 min):** abre una foto → «¿qué ves aquí?» → «hazme una felicitación de cumpleaños con esta foto» → sale la felicitación con «Compartir» brillando.
3. **Álbumes y subir (unos 3 min):** con una foto abierta, «pasa esta foto al álbum …» → «quiero subir fotos» → brilla «Elegir fotos».

Si algo falla, apunta qué dijiste y qué hizo (mejor con captura) y para ahí: no repitas la prueba hasta haberlo revisado. La lista completa de abajo es solo de consulta; no hace falta hacerla entera.

### Lista completa (solo de consulta)

Hacen falta el agente nuevo creado y conectado y la web con https. Eso significa desplegar, **cuando ella lo decida**, o usar un túnel https hacia el servidor local (por ejemplo `cloudflared tunnel --url http://localhost:8990`, que no gasta créditos de Netlify; hoy no está instalado). Safari en el iPhone, con sonido.

**Arranque**
1. Toca el pollito → micrófono. Safari pide el micrófono y Nidi saluda con el primer mensaje en 2-3 s. Arriba sale «Nidi te escucha».
2. Di «¿dónde estoy?». Nidi describe la pantalla con palabras normales (nunca «album-detalle»).

**Guiar y moverse**
3. «Llévame a mis álbumes» / «vuelve al inicio» / «abre el álbum Navidad 2024». Se mueve y lo dice.
4. «Enséñame las fotos de Clara». Abre la ficha de Clara nieta.
5. «Quiero hacerlo yo, ¿qué pulso para volver?». El botón «Volver» brilla (`senalar`).

**Ver y conversar**
6. «Abre la primera foto» y luego «¿qué hay en esta foto?». Nidi dice «Déjame que la mire» y sale el aviso «Nidi está mirando esta foto…». Luego comenta la foto y hace una pregunta, sin leer la descripción.
7. En una foto con alguien sin nombre, «¿quién es ese?». Nidi **no adivina** y te pregunta a ti.
8. «¿Mandas mis fotos a algún sitio?». Contesta con la frase de privacidad.

**Poner nombre**
9. Abre a mano una ficha sin nombre en Personas. Nidi pregunta quién es **una sola vez**.
10. Di un nombre difícil («Iolanda»). Nidi pide que lo deletrees, lo guarda al momento (sale «Guardado: Iolanda · Deshacer» y la ficha cambia de nombre) y te pregunta «¿Está bien?».
11. Corrígelo («no, es Yolanda»): se cambia solo. Luego toca «Deshacer»: la ficha vuelve a estar sin nombre y Nidi te pregunta cómo se llama.
12. «Abre a alguien que no sepas quién es». Se abre una ficha sin nombre y Nidi no pregunta dos veces.

**Álbumes**
13. «Crea un álbum que se llame Playa con las fotos de verano». Se crea con esas fotos.
14. Con una foto abierta: «pásala al álbum Playa». Sale «Deshacer» durante 7 s.
15. «Pásala al álbum Cumpleaños», que no existe. Nidi pregunta si lo crea, y solo lo crea tras el «sí».
16. «Quita todas las fotos del álbum Playa». Nidi pide confirmación antes.
17. «Cámbiale el nombre a Playa por Vacaciones».

**Felicitaciones**
18. «Hazme una felicitación para Carlos». Nidi pregunta el tipo. «De cumpleaños»: avisa de que tarda, sale «Creando imagen» y luego la felicitación con «Compartir» brillando. Pulsa «Compartir» tú y se abre el menú del móvil.
19. Con una foto abierta: «haz una de Navidad con esta foto».
20. Mide cuánto tarda en Netlify (debería rondar los 10 s; el límite es 60 s).

**Subir fotos**
21. «Quiero subir fotos». Nidi lleva a «Todas tus fotos» y «Elegir fotos» brilla (y se puede tocar: la pastilla «Nidi te escucha» está arriba). Las fotos nuevas se suman a las que había. Te guía paso a paso (Fototeca → elegir → Añadir). Al terminar, lo celebra sin que se lo pidas.
22. Cierra las fotos del móvil sin elegir. Nidi te ofrece intentarlo otra vez.

**Cosas que mirar en todas**
23. En el bocadillo lila (lo que has dicho tú) **no** debe aparecer nunca «[Aviso de la app…]».
24. Nidi no lee en voz alta instrucciones como «repite con crear_si_no_existe=true».
25. Nidi no dice «mayores» ni términos técnicos, y no se hace pasar por un familiar («¿eres mi nieta?» → «No, soy Nidi, la ayudante de Nido»).
26. Termina la conversación tocando «Nidi te escucha». La pastilla desaparece.

---

## 7. Incoherencias que se vieron entre herramientas y código (resueltas el 24-sep)

Las encontraron las pruebas en navegador (e2e, visión y revisión) y se arreglaron en el código; se dejan apuntadas por si vuelven a aparecer.

1. **`nombrar_persona` podía nombrar la ficha equivocada.** Ahora solo guarda en la ficha que se ve en pantalla (`fichaAbierta()`), y la ficha abierta se apunta en el único sitio que la pinta (`fillPersonaScreen`), también cuando se abre desde la cara de una foto («Sí, enséñame más»). Desde Home o desde una foto contesta «No hay ninguna ficha de persona abierta…».
2. **Pregunta doble al abrir una ficha sin nombre.** Si la abre Nidi, la ficha se marca como ya preguntada y no llega el aviso de la app.
3. **«Este álbum está vacío» con fotos dentro.** Con fotos, el contexto dice «Estas son las fotos del álbum. Pulsa Añadir para meter más.».
4. **Subir fotos sustituía las que había.** Ahora se suman (tope de 60, las nuevas primero).
5. **`persona_id` en `nombrar_persona`** sigue en el código, pero Nidi no puede conocer los ids, así que no se da de alta en el panel.
6. **Mayúsculas de los nombres.** El parentesco que va detrás queda en minúscula («Maite cuñada», como «Clara nieta»). Un deletreo («J-O-S-É») se junta: «José». «Ana» con «Ana nieta» ya en la lista no se guarda: Nidi pregunta cómo distinguirlas.
7. **Comentario viejo** en la cabecera de `js/agente.js`: actualizado.
8. **Tiempos de `ver-foto`.** Plazo total de 9 s en Netlify y 18 s en local, con Gemma primero. Ver el apartado 3.
9. **Gemini gratis y privacidad**: sigue igual, ver el apartado 4.
10. **`abrir_en_la_app` con «crea un álbum» sin nombre** ya no abre el flujo manual con Nidi hablando: devuelve «falta el nombre, pregúntale…». Tampoco salen los tours de primera vez mientras Nidi habla.
11. **Otros arreglos de esa tanda:** las herramientas que abren algo cierran antes la capa de ayuda (si no, quedaba detrás del velo y el único botón, «Cancelar», cortaba a Nidi); la pastilla «Nidi te escucha» pasó arriba (abajo tapaba «Elegir fotos» y tocarla terminaba la conversación); `gestionar_albumes` busca los álbumes con nombre estricto en todas las acciones y no deja renombrar a un nombre que ya existe; crear con un criterio que no entiende ya no crea un álbum vacío; `senalar` necesita al menos 3 letras; las cifras de fotos de cada persona ya no crecen al abrir su ficha (`photosOf` usa el mismo criterio que los álbumes «Fotos de …»); `ver-foto` manda cada nombre con su posición en la foto y no toma el razonamiento interno del modelo como respuesta.
