# Nido · prototipo-v3 — notas de sesión

> ## ⛔ REGLA DE ORO — NO DESPLEGAR A NETLIFY SIN QUE LA USUARIA LO PIDA
> **No subir nada a Netlify (ni `netlify deploy`, ni el script `mover-a-otra-netlify.sh`, ni `env:set`) a menos que la usuaria lo diga
> expresamente en ese momento.** Ni un "arreglo pequeño", ni "para que lo vea", ni al terminar un bloque: primero se prueba todo en
> localhost, se acumulan los cambios y se PREGUNTA antes de subir. Cada despliegue gasta créditos (plan gratis = 300/mes) y el 21-sep se
> agotaron los de la cuenta antigua con ~16 despliegues en un día. Un "sí, súbelo" vale para UN despliegue, no para los siguientes.
>
> - Sitio actual: https://nido-0921-22084.netlify.app (cuenta `ainhoamcopel@gmail.com`, equipo Barreira, plan Free, site id `13deb3cf-ca46-4ae5-90e3-48c3e52a4129`).
> - Cuando lo pida: `rsync` a `~/Desktop/nido-netlify` (con los excludes del script) y `npx netlify-cli deploy --prod --dir=. --functions=netlify/functions --site 13deb3cf-ca46-4ae5-90e3-48c3e52a4129` (necesita `netlify login` con esa cuenta).
> - Pruebas con audio (asistente de voz): siempre Chrome con `--mute-audio`.

Resumen de la sesión en la que se construyó este prototipo, para retomarlo sin perder
contexto. Léelo junto con `README.md` (qué es el proyecto) antes de tocar nada.

## Qué hay construido

**11 pantallas**, todas navegables tocando los botones reales (no hay panel de demo,
se quitó a propósito — ver más abajo):

- **Home** — Álbumes/Personas/Yo + "Mis recuerdos" (3 fotos, la 1ª es un vídeo en bucle)
- **Onboarding 1-4** — tour de bienvenida sobre Home, pantalla de arranque por defecto
- **Álbumes · Personas · Yo** — cada una con su "Volver"
- **Mis documentos** — colgada de Yo → "Mis documentos". 4 secciones tal cual Figma
  (Documentos identificativos, Horarios, Otros documentos, Horarios otra vez — sí, está
  duplicada en Figma, se dejó igual a propósito)
- **Detalle foto/vídeo** — se abre al tocar *cualquier* `.photo-card` de la app, con
  galería deslizable (scroll-snap) entre todas las fotos de la pantalla de origen y
  pinch-to-zoom sobre la imagen

Fuente de Figma: sección "UI PROTOTIPADO (NO TOCAR)" de la página *UI*
(`node-id=425-7405`) para las 8 pantallas base, más `446-7538` (Mis documentos) y
`446-7809` (Detalle) añadidas después.

## Bugs reales que se encontraron y se arreglaron

Todos verificados contra Figma con capturas 1:1 (`get_screenshot`), no a ojo:

1. **La fuente nunca se cargó.** `tokens.css` decía `font-family: 'Atkinson
   Hyperlegible'...` pero no había ningún `<link>` a Google Fonts en el `<head>` — todo
   se veía con la fuente de sistema del navegador. Esto rompía el ajuste de línea de
   textos largos (un bocadillo del onboarding se partía en 4 líneas en vez de 3).
   Arreglado añadiendo el `<link>` de Google Fonts.
2. **`filter: drop-shadow()` con lista separada por comas.** A diferencia de
   `box-shadow`, `drop-shadow()` no admite varias sombras en una sola llamada — hay que
   encadenar `drop-shadow(a) drop-shadow(b)`. El brillo del botón resaltado en el
   onboarding no se veía por esto.
3. **Botones "Mis documentos"/"Ajustes" en horizontal en vez de vertical.** Error mío al
   traducir el Tailwind extraído la primera vez.
4. **Botón "Volver" con la altura equivocada** (`bottom: 5.125rem` en vez de
   `2.875rem`) en Yo/Álbumes/Personas — quedaba ~35px más alto de lo que toca.
5. **Escalado responsive roto en ventanas anchas de escritorio.** La primera versión
   mezclaba `rem` con `clamp(...vw...)` para el tamaño de fuente sin que coincidiera con
   el `max-width` del lienzo — el contenido se desbordaba y se recortaba en según qué
   anchos de ventana. Solución final: el lienzo se dibuja siempre a tamaño real
   (393×852, `1rem = 16px` fijo) y `js/app.js` mide el ancho disponible y aplica
   `transform: scale()` al lienzo completo — mucho más fiable que encadenar
   `cqw`/`calc()` (que llegó a fallar por una limitación real de `calc()`: no se puede
   dividir longitud entre longitud directamente).
6. **Imágenes del pollito con mucho margen transparente** alrededor del dibujo real —
   dentro de su caja se veían diminutas. Se recortan por código (`PIL`, umbral de alfa)
   antes de guardarlas en `assets/img/`.

## Herramientas de verificación — limitaciones descubiertas

- La extensión de Chrome (`claude-in-chrome`) no estaba conectada en ningún momento de
  la sesión — toda la verificación visual se hizo con **Chrome headless por CLI**
  (`--headless=new --screenshot=...`).
- El flag `--window-size` tiene un **suelo de facto de ~500px de ancho** en este
  Chrome headless (no se pudo forzar un viewport más estrecho) — para probar el
  escalado en pantallas pequeñas hubo que meter la app en un `<iframe>` con `width`
  explícito, que sí respeta el tamaño pedido.
- `--dump-dom` con `--virtual-time-budget` **no ejecuta de forma fiable** timers/JS
  anidados dentro de un `<iframe>` — no sirvió para simular toques de usuario y
  comprobar la navegación por JS. La verificación de la galería/pinch-zoom de la
  pantalla de detalle quedó pendiente de prueba manual por el usuario.

## Contenido real (no placeholder) — ojo aquí

- Las fotos de "Mis recuerdos" (boda, bebés, disfraces) son fotos de archivo familiar
  reales.
- **La tarjeta sanitaria (SIP) en "Mis documentos" tiene datos personales reales** de
  una persona identificable (nombre completo, nº de tarjeta, DNI sin censurar). Se
  preguntó explícitamente al usuario si usarla tal cual — **confirmó que sí**. Si este
  prototipo se comparte más allá del testeo con usuarios previsto, revisar si sigue
  siendo apropiado.
- El vídeo de la boda (`assets/video/pollito-loop.mp4`) es un vídeo real de WhatsApp,
  copiado desde Descargas.

## Decisiones de diseño que NO se han "corregido" sin preguntar

(Ver también `README.md`.) Cualquier cosa que pareciera una inconsistencia de Figma se
confirmó con el usuario antes de tocarla — por ejemplo, las 4 secciones duplicadas de
"Mis documentos" se dejaron tal cual porque el usuario pidió explícitamente "añade lo
que hay en la pantalla de Figma", no solo lo que se veía en su PNG de referencia.

## Cosas añadidas que NO estaban en Figma (a petición del usuario, no inventadas)

- **Ritmo pensado para testar con personas mayores**: cada toque se "hunde"
  visualmente ~0,3s antes de reaccionar, y el cambio de pantalla es un cruce de
  opacidad suave de ~0,45s (antes era instantáneo) — para que dé tiempo a entender qué
  se ha tocado y hacia dónde lleva. Los toques repetidos se bloquean mientras dura la
  transición.
- **Panel de la demo eliminado** — antes había un panel flotante con enlaces directos a
  cada pantalla (útil para desarrollo); se quitó para que el prototipo solo se navegue
  tocando los botones reales, como en la app de verdad.
- **Galería deslizable + pinch-to-zoom** en la pantalla de detalle (Figma solo mostraba
  una imagen fija).

## Pendiente

- Verificación manual del usuario: tocar una foto → comprobar que abre el detalle con
  esa misma imagen, deslizar entre fotos de la misma pantalla, pinch-to-zoom, y que
  "Volver" regresa a la pantalla de origen (no a un destino fijo).
- Decidir si el prototipo arranca en el onboarding (así está ahora) o en Home para
  sesiones de testeo donde no interese repetir el tour cada vez.
- `README.md` describe el estado del proyecto a mitad de sesión — bastante desfasado
  respecto a lo de aquí. Actualizarlo si se retoma el proyecto en serio.

## Despliegue

Carpeta lista para Netlify (`netlify.toml` + `.gitignore` añadidos, todo con rutas
relativas, sin build). Pendiente de decidir con el usuario: drag-and-drop en
app.netlify.com/drop, o conectarlo a un repo Git.

---

# Sesión 2 (14–17 sept) — mascota animada + flujo de registro completo

Arranca ya sin panel de demo, arranque por defecto en `bienvenida` (antes onboarding).
Añade todo el arco de entrada a la app: **huevo → pre-registro → registro (5
pantallas) → tour de onboarding → Home**. Antes de esta sesión el prototipo empezaba
directo en el tour.

## Flujo completo, en orden

1. **`bienvenida`** — vídeo del pollito naciendo del huevo (una sola vez, sin botón).
   Al terminar (`ended`), blur+fade y pasa solo a `pre-registro`.
2. **`pre-registro`** — vídeo del pollito lanzando fotos al aire (recortado en 02:19
   del render original — el resto del clip dispersa demasiado las fotos y pierde
   fuerza). Al terminar, blur+fade y pasa solo a `registro-1` — **no hay botón "Siguiente"
   ni pantalla en blanco de por medio**, eso fue un provisional de mitad de sesión que
   se quitó.
3. **`registro-1`** a **`registro-4`** — flujo de alta copiado 1:1 de Figma (nodos
   514:6044, 6055, 6104, 6163, 6039). Ver detalle abajo.
4. **`onboarding-1`** a **`onboarding-4`** — el tour que ya existía. El último paso
   lleva a `home` (sin cambios).

## El flujo de registro (registro-1 → registro-4)

- **registro-1** — "Revive tus momentos..." + Entrar → registro-2.
- **registro-2** — teléfono, teclado numérico en pantalla → registro-3.
- **registro-3** — código de 4 dígitos. Al completarse, aparece el modal **"Ayúdanos"**
  (permiso de galería) **superpuesto sobre la misma pantalla** — no es una pantalla
  aparte, aunque en Figma tiene su propio nodo (514:6163). "Permitir" y "Quiero saber
  más" llevan ambos a registro-4 (no hay una 6ª pantalla de "más info" en lo que se
  compartió).
- **registro-4** — splash del logo, sin botón, avanza solo a `onboarding-1` tras 1.8s.

**El teléfono y el código se autorrellenan solos, dígito a dígito con temporizadores
escalonados** — nunca aparecen ya escritos de golpe. Es el mismo patrón que ya usaban
`prototipo/js/app.js` y `prototipo-v2/js/app.js` (función `autofill()`) para imitar el
autocompletado nativo de SMS de iOS/Android (ver CLAUDE.md sección 7). Código de
ejemplo `6294`, igual que en las versiones anteriores; teléfono `612345678` (sin
precedente en versiones previas, elegido ahora). El teclado en pantalla se deja
funcional por si se quiere tocar o corregir a mano.

**Teléfono máx. 9 dígitos**, sin validación de formato real. **"Reenviar código"** solo
limpia las 4 cajas, no hay backend detrás. Texto copiado tal cual de Figma, incluida la
errata **"Revive tu momentos mas especiales"** (sin "s", sin tilde) — sin corregir a
propósito, a la espera de que el usuario lo confirme.

## El pollito animado del onboarding (paso 4, "Mis recuerdos")

El paso 4 del tour (pollito de espaldas señalando) pasó de PNG estático a **WebP
animado real** (121 frames, timing nativo del navegador, sin JS calculando frames):

- Fuente: gif exportado por el usuario (`Secuencia 01_1.gif`, 126 frames a 40ms=25fps,
  transparencia real). Se probó antes un sprite-sheet propio a 6fps inventado — se veía
  "muy lento" porque no correspondía a la velocidad real del vídeo fuente; se descartó
  en cuanto el usuario pasó el gif real.
- Fondo quitado por **diferencia de color** (chroma-key manual con PIL, no un color
  plano de Figma) — el fondo original era casi blanco liso y muy uniforme.
- Exportado como **WebP animado**, no GIF: mismo timing nativo, pero color completo y
  mejor calidad — un GIF equivalente con paleta de 256 colores se veía peor y tardaba
  mucho más en cuantizar. 3.4MB (126 frames a todo color).
- `js/mascota.js` simplificado: ya no hay lógica de sprite/`setInterval`, solo detecta
  la clase `onboarding-pollito__animated` para saltarse la respiración sintética que sí
  llevan los pasos 1-3 (esos siguen siendo pose estática + WAAPI).

## Bugs reales encontrados esta sesión (verificados, no a ojo)

1. **`img { max-width: 100% }` (reset global de `base.css`) recortaba imágenes que
   debían desbordar el lienzo a propósito** — la foto de familia de registro-1 (574px,
   pensada para sangrar por los dos lados como en Figma) se quedaba encogida a 393px.
   Arreglado con `max-width: none` puntual en los dos elementos afectados
   (`.registro-1-photo`, `.registro-1-underline`). Detectado comparando captura propia
   vs captura de Figma lado a lado — a ojo parecía "casi igual" pero medido en píxeles
   el sofá estaba desplazado ~60px.
2. **El lienzo solo comprobaba que cupiera de ancho, nunca de alto.** En una ventana no
   muy alta, el contenido de abajo (botones "Entrar"/"Siguiente"...) quedaba fuera de
   la vista sin ningún indicio de que hubiera que hacer scroll — parecía que "los
   botones no funcionan". Arreglado en `.screen-canvas-wrap` con un tercer término en el
   `min()` que calcula el ancho máximo que también deja caber el alto disponible
   (`calc((100vh - 4rem) * 393 / 852)`). Afecta a **todas** las pantallas por compartir
   una sola regla.
3. **Un modal se quedó con `is-visible` pegado en el HTML** desde una prueba manual que
   no se revirtió bien. Aunque el modal era invisible en pantallas inactivas
   (`opacity:0` del `.screen` padre), **`opacity` no bloquea clics — solo
   `pointer-events` lo hace**, y ese `is-visible` forzaba `pointer-events:auto` en el
   modal por encima del `pointer-events:none` heredado. Los botones invisibles del
   modal (ambos → registro-4) tapaban toda la pantalla y desviaban la navegación —
   tocar "Entrar" en registro-1 a veces caía directo en registro-4. Solo se detectó
   simulando un **clic real por coordenadas de pantalla vía CDP** (`Input.dispatchMouseEvent`);
   un `.click()` por selector (lo que se había usado toda la sesión para verificar)
   nunca lo habría encontrado, porque apunta directo al elemento y no pasa por
   hit-testing. Arreglado quitando la clase suelta **y** añadiendo una red de
   seguridad permanente en `base.css`: `.screen:not(.is-active) * { pointer-events:
   none !important; }`.
4. **Batería de la barra de estado con proporciones a ojo**, no medidas: el borde y el
   relleno no coincidían con Figma. Se corrigió con las coordenadas exactas calculadas
   desde el propio `get_design_context` del componente (no aproximadas), y luego se
   ajustó el grosor del borde una vez más a mano porque en pantallas retina un borde de
   `1px` CSS ocupa 2px físicos y se veía más grueso de lo previsto (`border: 1px`, no
   `0.5px` — el 0.5px se probó primero y quedó demasiado fino a petición del usuario).

## Caché — problema recurrente, no bug de código

Varias veces durante la sesión el usuario reportó "no funciona" cuando el servidor ya
tenía el fix aplicado (confirmado con `curl` directo). Solucionado con tres medidas:
- `?v=N` en todos los `<link>`/`<script>`/vídeos que se han ido reemplazando bajo el
  mismo nombre de archivo.
- Meta tags `Cache-Control: no-cache` en el `<head>` del propio `index.html` (los
  `?v=` no protegen el HTML en sí, solo sus sub-recursos).
- Cuando ni eso bastó, se movió el servidor a un puerto nuevo (`8090`) — origen
  distinto, imposible que haya caché compartida.

## Optimización de assets (todos convertidos a WebP con alfa donde hacía falta)

| Asset | Antes | Después |
|---|---|---|
| Vídeo bienvenida (huevo) | 51MB (gif) / 3.3MB (fuente) | 636KB → 680KB (fuente mejor) |
| Vídeo pre-registro (fotos al aire) | 10.3MB | 1.35MB (recortado en 02:19) |
| Sprite/WebP pollito onboarding paso 4 | 4.3MB (PNG sprite, descartado) | 3.4MB (WebP animado 126 frames) |
| Foto familia registro-1 | 468KB → 2.5MB (versión Downloads) | 48-70KB |
| Foto polaroid modal "Ayúdanos" | 2.27MB | 21-26KB |

## Pendiente de esta sesión

- Verificación manual del usuario del flujo completo de un tirón (bienvenida → home).
- Decidir si el prototipo debe seguir arrancando en `bienvenida` o si conviene un
  deep-link de conveniencia para saltar directo a una pantalla concreta al testear.
- La errata "Revive tu momentos mas especiales" sigue sin corregir — confirmar si se
  arregla o se deja como está en Figma.

---

# Sesión 3 (17 sept) — seleccionar a una persona dentro de una foto

Funcionalidad nueva, a petición del usuario: mantener pulsado sobre una persona dentro
de una foto (en la pantalla de detalle) la marca como seleccionada — un anillo se
rellena durante la pulsación y, al completarse, aparece el pollito con 3 opciones:
**ver recuerdos de esta persona · crear algo con ella · salir y seguir viendo
imágenes**. Inspirado en "Seleccionar personas" de Photoshop / "Captura mágica" de
Canva, pero aplicado a lo que ya dice la sección 13 de `CLAUDE.md` (la mascota
aparece y ofrece pills) en vez de a un recorte de edición de imagen.

## Cómo está construido (sin reconocimiento facial real — v2)

- **`js/persona.js`** (nuevo) + **`css/persona.css`** (nuevo). Se engancha desde
  `openDetalle()` en `js/app.js`: por cada foto (solo `<img>`, no vídeo) mira si su
  nombre de archivo está en `PERSON_ZONES` y, si lo está, añade un `.persona-hotspot`
  (botón invisible, solo para capturar el gesto) más un `.persona-silhouette` (la capa
  visual) por cada persona de esa foto.
- **v1 → v2, por qué cambió:** la primera versión marcaba a la persona con un óvalo y
  oscurecía/difuminaba toda la pantalla alrededor (un velo con un agujero hecho con
  `mask-image`). El usuario pidió acercarlo a **"levantar sujeto" de iOS Fotos**
  (mantener pulsado sobre alguien en una foto): ahí la foto **nunca se oscurece**, y el
  contorno que aparece **traza la silueta real** de la persona, no un óvalo. Se
  rehízo todo el sistema visual para igualar eso — el velo se quitó por completo.
- **Zonas ahora son polígonos, no rectángulos**: cada zona de `PERSON_ZONES` es una
  lista de puntos en % del recorte real de `.detail-media__item` (393×390,
  `object-fit: cover`). Las 3 fotos de Figma (`people-group-1.png`,
  `people-group-2.png`, `people-person-1.jpg`) siguen siendo rectángulos simples (un
  helper `rect(l,t,r,b)` los convierte en polígonos de 4 puntos) porque son solo fotos
  de prueba de baja calidad. La foto nueva **`prueba-selector.jpg`** (foto real de
  móvil, no de Figma — la trajo el usuario a propósito porque "las de Figma no quedan
  bien") lleva un contorno trazado a mano de verdad (cabeza + hombros + un brazo) para
  cada una de las 3 personas que salen en ella.
- **Cómo se trazó el contorno**: mismo método que las zonas rectangulares de la v1
  (réplica exacta de la caja 393×390 con Chrome headless, capturas 1:1) pero dibujando
  un polígono de 8-14 puntos con PIL sobre la foto real e iterando hasta que sus líneas
  seguían el contorno de cabeza/hombros/brazo — no es una silueta pixel-perfect (no hay
  segmentación real), es una aproximación dibujada a mano, y hay que rehacerla a mano
  para cada foto nueva que se quiera "cablear".
- **Qué dibuja el contorno brillante**: un `<path>` SVG (ver más abajo por qué no
  `<polygon>`) con `stroke-dashoffset` animado por WAAPI durante los 650ms de
  pulsación — el trazo se "dibuja" progresivamente, como en la referencia de iOS.
- **El "levantar" (lift)**: una copia clonada de la misma `<img>`, recortada con
  `clip-path` al mismo polígono (vía un `<clipPath>` en `objectBoundingBox`), que se
  hace visible al completarse la selección con un `scale(1.045)` + `drop-shadow` — da
  la sensación de que la persona se despega un poco de la foto, sin tocar el resto de
  la imagen.

### Dos bugs reales de Chrome encontrados haciendo esto (no obvios, verificados quitando una propiedad cada vez)

1. **`pathLength` + `stroke-dashoffset` animado con WAAPI no pinta el trazo completo**,
   aunque `getComputedStyle` diga que el `dashoffset` final es `0`. Se comprobó
   quitando el WAAPI (poniendo el valor final a mano): seguía roto, así que no era la
   animación — era `pathLength`. Arreglado usando la longitud real del trazo
   (`path.getTotalLength()`) para `stroke-dasharray`/`stroke-dashoffset`, nunca el
   atributo `pathLength` normalizado a 1.
2. **`vector-effect: non-scaling-stroke` + un `viewBox` no uniforme
   (`preserveAspectRatio="none"`) + `stroke-dasharray` rompe el trazo**: con esas tres
   cosas juntas, Chrome dejaba de pintar un tramo entero del contorno (el arco de la
   cabeza) sin ningún error en consola. Se detectó forzando el trazo a sólido
   (`stroke-dasharray: none`) — ahí sí se veía completo — y luego quitando propiedades
   una a una hasta aislar `vector-effect`. Se quitó del todo: el lienzo es casi
   cuadrado (393×390) así que el grosor de línea se distorsiona <1%, imperceptible.
3. **`<polygon>` con `pathLength` + `stroke-dasharray` tampoco pinta el trazo
   completo** (mismo síntoma que el bug 1, pero en el elemento en sí, no en la
   animación) — por eso el contorno se construye como `<path d="M...L...Z">`, no
   `<polygon points="...">`. El `clipPath` del "lift" sí puede seguir siendo
   `<polygon>` porque no anima ni usa dasharray.

## Decisión de alcance — las 3 opciones no pesan lo mismo

- **"Salir y seguir viendo imágenes"** — funciona de verdad: cierra el velo, no
  navega, te deja donde estabas.
- **"Ver recuerdos de esta persona"** — navega de verdad a la pantalla "Personas"
  (`data-nav="personas"`, lo gestiona el manejador de clics genérico que ya existía).
  **No** filtra solo las fotos de esa persona — no hay ningún dato en el prototipo que
  diga qué foto pertenece a quién, así que fingir un filtrado real habría significado
  inventar una base de datos de personas que no se pidió.
- **"Crear algo con esta persona"** — `data-action="noop"`, igual que el botón "Crear"
  que ya existía en esta misma pantalla antes de esta sesión. No hay flujo de creación
  con IA construido en el prototipo; se mantiene la misma convención que ya usaba el
  resto de la app para lo que no está construido todavía (Compartir, Ajustes, "···").

Si se quiere que "Ver recuerdos" filtre de verdad por persona, hace falta decidir
antes cómo se etiqueta cada foto con quién aparece en ella — no es solo UI.

## Verificación — cómo se probó

La extensión `claude-in-chrome` no se usó (instrucción de otra sesión: evitar
automatización interactiva de Chrome salvo permiso explícito). Se verificó con
**Chrome headless + CDP por WebSocket** (`Input.dispatchMouseEvent` con coordenadas
reales, no `.click()` por selector — misma lección de la sesión 2 sobre
`pointer-events`): pulsación corta (200ms) no selecciona, mantener pulsado los 650ms
sí selecciona, "Salir" cierra sin navegar, "Ver recuerdos" navega y limpia el estado, y
abrir una foto sin zonas conocidas no rompe nada (0 hotspots, sin errores). La v2 se
verificó por separado sobre las 3 personas de `prueba-selector.jpg` **y** sobre las
zonas rectangulares heredadas de `people-group-1.png` — mismo contorno, mismo lift,
sin regresión.

## `prueba-selector.jpg` — foto de prueba, no contenido final

Añadida temporalmente a "Personas → Grupos de personas" (primera tarjeta) para poder
probar el contorno contra una foto de móvil real, a petición explícita del usuario
("las de Figma no van a quedar bien, prueba con una de verdad"). Viene de
`assets/img/prueba-selector.HEIC` (foto real de 3 personas en un acto), convertida a
`.jpg` optimizado (1400px, ~340KB) con `sips`. **Decidir si se queda, se quita, o se
sustituye por contenido real** cuando se cierre esta función — está marcada con un
comentario en `index.html` para que no se confunda con una pantalla ya diseñada.

## Bug preexistente encontrado (no de esta función, no arreglado)

Al probar con un atajo de `location.hash` + `reload()` para saltar directo a
"Personas", el vídeo de `bienvenida` — que sigue reproduciéndose de fondo porque nada
lo pausa al cambiar de pantalla por hash — llegó a su `ended` y disparó
`showScreen('pre-registro')` **por su cuenta**, y ese a su vez cayó en `registro-1`,
sin que el usuario hiciera nada. En uso real (arrancando siempre en `bienvenida` y
avanzando con los botones, como está pensado) esto no debería notarse, pero si algún
día se añade un deep-link de conveniencia a mitad de flujo (ya apuntado como pendiente
en la sesión 1), habrá que pausar/parar los vídeos de `bienvenida` y `pre-registro` al
salir de su pantalla, igual que ya se hace con los timers de `registro-2`/`registro-3`.

## v3 — de silueta de cuerpo a silueta de cara (mismo día)

El usuario probó la v2 (silueta de cuerpo entero) en su propio navegador y se veía
"rara" — grabó un vídeo (`recorte.mp4`) donde el contorno salía como un arco estrecho
flotando fuera de la persona, no pegado a su silueta. Dos causas, las dos arregladas:

1. **Caché del navegador**: `index.html` seguía pidiendo `persona.js?v=1` /
   `persona.css?v=1` — los mismos números de versión con los que se cargaron ANTES de
   arreglar los bugs de Chrome de la v2 (`vector-effect` y `pathLength`, ver arriba).
   El navegador del usuario nunca volvió a pedir el archivo nuevo. Subido a `?v=2` en
   ambos. **Lección repetida de la sesión 2**: cualquier cambio a estos dos archivos
   necesita subir el número de versión, si no el "arreglado" no llega a quien prueba.
2. **La silueta de cuerpo entero era frágil de por sí**: brazos, hombros y el recorte
   contra el borde de la foto dejan mucho margen para que el polígono a mano no encaje
   bien en cualquier pose. El usuario pidió explícitamente simplificarlo: **"si no es
   del cuerpo, que sea de la cara"**. Se retrazaron las 3 zonas de `prueba-selector.jpg`
   como óvalos de cara (mismo método, capturas 1:1 + PIL), mucho más precisos y con
   menos margen de error. Las zonas de las fotos de Figma no se tocaron (siguen siendo
   rectángulos simples, son solo fotos de prueba de baja calidad).

Efecto colateral bueno: al ser la zona de cara más pequeña y alta en el encuadre, el
contorno se ve mucho mejor por encima de la tarjeta del pollito — con la silueta de
cuerpo entero, la tarjeta tapaba casi todo el contorno.

## v4 — de silueta trazada a mano a segmentación real (mismo día)

El usuario probó la v3 (óvalos de cara a mano) y pidió ir más lejos: **"tienes que
coger exactamente la silueta"**, con una imagen de referencia — un recorte
pixel-perfect (cabeza/hombros/brazos) que a todas luces viene de una herramienta real
de recorte de sujeto, no de un dibujo a mano. Trazar eso a ojo con Chrome headless +
PIL, como en v1-v3, no iba a llegar a esa precisión por definición.

**Solución: usar segmentación real, no dibujar puntos.** Este Mac tiene Xcode command
line tools, así que se pudo usar el **Vision framework de Apple** directamente
(`VNGenerateForegroundInstanceMaskRequest` — la misma tecnología detrás de "Levantar
sujeto" de Fotos/Vista previa) en vez de aproximarlo:

1. **`tools/segment-personas.swift`** (nuevo, guardado en el repo para reutilizar):
   detecta caras con `VNDetectFaceRectanglesRequest`, recorta una caja ajustada
   alrededor de cada una y corre `VNGenerateForegroundInstanceMaskRequest` por
   separado sobre cada recorte — **necesario** porque sobre la foto entera, Vision
   fusiona a las 3 personas en un solo "instance" (sus brazos se tocan más abajo en la
   foto, es una selfie con un brazo estirado por delante de los otros dos: se
   comprobó con `cv2.connectedComponents` que en la máscara de la foto entera son 1
   solo componente conectado, no 3). El recorte de cada persona llega justo hasta los
   hombros — más abajo de ahí no hay forma de separarlos automáticamente en esta foto
   en concreto.
2. **`tools/contour-from-mask.py`** (nuevo): coge la máscara de cada persona
   (PNG en blanco y negro) y extrae su contorno real con `cv2.findContours` +
   `cv2.approxPolyDP` (simplifica de ~400-550 puntos del contorno crudo a 15-22),
   convertidos a las mismas coordenadas "% de la caja 393×390 de `.detail-media`" que
   ya usaba `PERSON_ZONES`. El resultado sustituyó a los óvalos de cara a mano de la
   v3 para las 3 personas de `prueba-selector.jpg` — mismo sitio en `persona.js`,
   mismo mecanismo de dibujado/recorte, solo cambiaron los números.
3. Las zonas de las fotos de Figma (`people-group-1/2.png`, `people-person-1.jpg`) no
   se tocaron — siguen siendo rectángulos simples, son fotos de prueba de baja calidad
   que no merece la pena segmentar de verdad.

**Para la próxima foto real que se quiera cablear**: compilar y correr
`segment-personas.swift`, rellenar `contour-from-mask.py` con lo que imprime, y pegar
su salida en `PERSON_ZONES` — ya no hace falta trazar nada a mano ni a ojo.

## v5 — más cuerpo (hasta el borde del encuadre) + brillo azul, no blanco (mismo día)

Dos ajustes más, pedidos por el usuario tras ver la v4:

1. **"Llega solo hasta los hombros, ¿no se puede hacer toda la silueta?"** — se
   ensanchó y alargó el recorte de `segment-personas.swift` (ancho ×1.5 en vez de
   ×1.35, alto hasta `faceH*3.0` en vez de `faceH*1.7`) hasta el límite justo antes de
   que volviera a fusionarse con la persona de al lado (se probó ×1.9/×1.7 primero:
   se fusionaba; ×1.5/×3.0 se quedó limpio). Con esto el contorno ya llega hasta el
   borde inferior del encuadre (hombros + torso + arranque del brazo) en vez de
   cortarse a la altura de los hombros. **Sigue sin llegar a los brazos extendidos**
   de la referencia del usuario — eso exigiría separar los brazos entrelazados de las
   3 personas, que Vision no hace por sí solo en esta foto (ver v4).
2. **Color y grosor del contorno**: el usuario pidió blanco fino con blur en el
   mensaje anterior (hecho), pero después mandó una segunda referencia con un
   contorno **azul/morado, más grueso y con más difuminado**, preguntando si eso se
   entendería mejor para personas mayores. Se cambió a
   `var(--color-primary-blue)` (el mismo azul que ya usan los botones type2 de toda la
   app) en vez de blanco — la razón de fondo, no solo estética: un color que ya
   significa "esto es interactivo" en el resto de Nido se reconoce mejor que una línea
   blanca fina, en línea con la sección 6 de `CLAUDE.md` (señales grandes y claras).
   `stroke-width` subido de 1.25 a 3, y el `filter` con más capas de `drop-shadow` para
   que el brillo se note más.

## v6 — el brillo de verdad, dos capas en vez de drop-shadow apilados (mismo día)

El azul plano de la v5 no se leía como que brillaba ("no brilla, no quedará mejor en
blanco?"). Se volvió a blanco puro — y el resultado seguía sin brillar, se veía como
"blanco liso" (queja directa del usuario). **La causa era la técnica, no el color**:
apilar varios `drop-shadow()` sobre UN solo trazo fino no se funde en un halo — cada
`drop-shadow()` se calcula por separado a partir del mismo trazo fino de origen, así
que el resultado son varias copias borrosas casi idénticas superpuestas, no un
resplandor que crece hacia fuera.

**Arreglo real: dos trazos SVG con el mismo `d`, no uno con filtros apilados** —
técnica estándar de "neón" en SVG:
- **`.persona-silhouette__halo`** (nuevo, capa trasera): grueso (`stroke-width: 9`),
  azul de marca, `filter: blur(5px)` — esto es lo que de verdad vende que brilla.
- **`.persona-silhouette__glow`** (capa delantera, ya existía): fino (`stroke-width:
  1.5`), blanco, solo un `drop-shadow` pequeño de remate — el "filamento" caliente
  dentro del halo.

Los dos se dibujan a la vez durante la pulsación: `persona.js` ahora crea ambos
`<path>` con el mismo `pathD` en `buildHotspots()`, y `startHold()`/`selectPersona()`
animan un **array** de animaciones WAAPI (`holdAnims`, antes era `holdAnim` en
singular) en vez de una sola, para que el halo y el núcleo se dibujen sincronizados.

**Instrucción del usuario para las próximas iteraciones de fidelidad visual**: dado
que esta función tardó varias vueltas en acertar el efecto, el usuario pidió no
preguntar por el método a partir de ahora — dar una referencia visual y una
indicación de cómo debe quedar, y usar cualquier herramienta o recurso que haga falta
hasta igualarla de verdad (esto ya se aplicó en v4 con la segmentación real). Guardado
en memoria (`feedback_visual_fidelity_no_ask.md`), no solo aquí.

## v7 — la API de Vision correcta: cuerpo entero de verdad, sin recortar antes (mismo día)

El usuario preguntó "¿por qué no haces lo mismo [que Levantar sujeto de iOS]?" —
resultó que **no estaba usando la API correcta**. `VNGenerateForegroundInstanceMaskRequest`
(la que se usó en v4/v5) es la genérica de "objeto destacado" — por eso fusionaba a las
3 personas y hubo que recortar cara por cara, cortando el contorno en los hombros.
Revisando los headers de Vision.framework en este Mac (`find` sobre el SDK de Xcode)
apareció **`VNGeneratePersonInstanceMaskRequest`** — API específica para separar
personas individuales, distinta y más nueva (macOS 14+) que la genérica. Sobre la foto
ENTERA, sin recortar nada de antemano, separó a las 3 personas limpiamente, **cuerpo
entero con los brazos incluidos** — exactamente la referencia original del usuario.

- `tools/segment-personas.swift` reescrito para usar esta API (mucho más simple: ya no
  hace falta detectar caras ni recortar cajas por persona).
- `tools/contour-from-mask.py` simplificado a juego (sin metadatos de recorte, trabaja
  directo sobre la máscara a resolución completa).
- `PERSON_ZONES['prueba-selector.jpg']` en `persona.js` actualizado con los contornos
  de cuerpo entero.

### Bug real que apareció con el cuerpo entero: el hit-test por caja ya no vale

Con solo cabeza/hombros, las cajas de las 3 personas no se solapaban. Con el cuerpo
entero (brazos incluidos), sí — el brazo de "centro" pasa por encima de la zona donde
antes estaba el brazo de "izquierda". Los `<button class="persona-hotspot">`
posicionados por caja rectangular (desde la v1) hacían que ese solape lo ganara
siempre el último creado en el DOM (apilado encima): tocar el brazo de la persona de
la izquierda seleccionaba a la del centro.

**Arreglo**: se quitaron los `<button>` por persona. El hit-test ahora es
**punto-en-polígono real** (ray casting) sobre el propio `pointerdown` de
`#detalle-foto-media`: `zoneAtPoint()` calcula el punto tocado en % del
`.detail-media__item` activo y busca en `item._personaZones` (un array guardado en el
propio elemento por `buildHotspots()`) qué polígono contiene ese punto de verdad, no
qué caja. Efecto colateral: como ya no hay un `<button>` con `touch-action:none` por
persona, ese comportamiento (que el dedo no dispare el scroll horizontal de la galería
mientras se mantiene pulsado) se movió a `mediaWrap.style.touchAction` puesto/quitado a
mano en `startHold()`/`cancelHold()`. Verificado con Chrome headless tocando
exactamente el punto de solape que antes fallaba (y otro dentro de la caja de "centro"
pero dentro del polígono real de "izquierda") — selecciona a la persona correcta en
los dos casos, y las zonas rectangulares heredadas (fotos de Figma) siguen
funcionando igual (un rectángulo es un polígono válido, mismo código).

## v8 — "Crear algo con esta persona" ya es real, no un no-op (mismo día)

El usuario pidió conectar de verdad este botón a una IA de imagen. Investigación breve
(con `WebSearch`) antes de tocar código:

- **Nano Banana / Nano Banana 2 (Gemini) exige facturación activada** — comprobado
  contra la API real con la clave del usuario: las 3 variantes probadas devuelven
  `limit: 0` en el nivel gratuito (texto normal sí funciona gratis con la misma
  clave). El usuario pidió expresamente "todo ha de ser gratuito", así que Nano Banana
  quedó descartado para esto.
- **Alternativa real y gratis encontrada: Cloudflare Workers AI** — 10.000
  "neuronas"/día gratis, sin tarjeta, con modelos de **edición** de imagen (no solo
  texto-a-imagen): `@cf/black-forest-labs/flux-2-klein-4b`. Probado a mano con
  `curl` contra `prueba-selector.jpg` antes de conectarlo — mantiene reconocibles
  caras/pelo/ropa de las 3 personas al convertir la foto en ilustración.
- Vídeo (Veo) sigue descartado — no tiene nivel gratuito en ningún proveedor serio.

### Cómo está montado (por qué hace falta un backend)

La clave de Cloudflare **no puede vivir en el navegador** — cualquiera que abra la
página podría leerla en las herramientas de desarrollador y gastar la cuota gratuita
de la cuenta. Por eso:

- **`.env`** (nuevo, en `.gitignore` — nunca se sube) guarda `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID` y también `GEMINI_API_KEY` (sin usar en esta función, pero
  válida para texto gratis si hace falta más adelante).
- **`netlify/functions/crear-imagen.js`** (nuevo): función de servidor que recibe
  `{imageBase64, style}` desde el navegador, construye el prompt según `style`
  (`"tarjeta"` o `"retrato"`) y llama a Cloudflare Workers AI con la clave — el
  navegador nunca ve la clave, solo llama a `/.netlify/functions/crear-imagen`.
- `netlify.toml` actualizado con `functions = "netlify/functions"`.
- **Para probarlo en local hace falta `netlify dev`** (`npx netlify-cli dev`, no
  instalación global), no el `python3 -m http.server` que se usaba hasta ahora — ese
  server no sabe servir funciones, solo archivos estáticos. `netlify dev` sirve
  ambos a la vez en `localhost:8888` y lee `.env` solo.
- **Pendiente para cuando se despliegue de verdad en Netlify**: añadir
  `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` como variables de entorno en el
  panel de Netlify (Site settings → Environment variables) — `.env` no se sube, así
  que en producción la función no tendría credenciales sin este paso.

### El flujo en la app

Dentro de la misma tarjeta del pollito, tres pasos (`data-persona-step`:
`menu`/`estilo`/`cargando`), más una vista de resultado a pantalla completa
(`.persona-create-result`):

1. **Menú** (el de siempre) → tocar "Crear algo con esta persona" pasa a...
2. **Estilo**: "Tarjeta de felicitación" o "Retrato ilustrado" (dos prompts fijos en
   `crear-imagen.js`) — el usuario elige pulsando un botón, tal y como se pidió.
3. **Cargando**: mientras se manda la foto (convertida a base64 vía `<canvas>`, ver
   `imageElementToBase64()` en `persona.js`) y se espera la respuesta (~7-9s en las
   pruebas).
4. **Resultado**: la imagen generada, a pantalla completa, con "Volver" (a las
   `estilo`, no cierra del todo) y "Compartir" (no-op, misma convención que el resto
   del prototipo).

### Dos bugs reales encontrados montando esto

1. **`[hidden]` no bastaba para ocultar `.persona-select-card`**: la regla
   `.persona-select-card { display: flex; }` tiene la misma especificidad CSS que
   `[hidden]` y, al venir después en la hoja, ganaba — los 3 pasos (menú/estilo/
   cargando) se veían apilados a la vez en vez de uno solo. Arreglado con una regla
   explícita `.persona-select-card[hidden] { display: none; }` antes de la regla
   base. Ver `zoneAtPoint`/otros bugs de esta sesión: la lección se repite — cuidado
   con `[hidden]`/`[disabled]` compitiendo en especificidad con una clase que fija
   `display` explícitamente.
2. **Vista de resultado no cubría toda la pantalla** → se veían DOS barras
   "Volver/Compartir" a la vez (la del resultado y la de `detalle-foto` asomando por
   debajo). `.persona-create-result` pasó de ser una caja flotante centrada a
   `inset:0` con fondo propio — a diferencia del menú/velo de selección (que sí deja
   ver la foto real a propósito), este paso es una pantalla de verdad, tapa todo.

## v9 — silencio en el fallo arreglado + 6 estilos en cuadrícula (mismo día)

Dos ajustes más sobre "Crear algo con esta persona":

1. **El fallo silencioso confundía** — cuando la función no respondía (p.ej. porque
   se había parado `netlify dev` entre sesiones), `createWithPerson()` volvía al
   `menú` sin avisar y parecía que "no había hecho nada". Nuevo paso
   `data-persona-step="error"` con mensaje + "Volver a intentarlo" (reintenta el
   mismo `lastStyle`, no obliga a elegir otra vez) + "Salir". Probado forzando
   `window.fetch` a fallar antes de arreglarlo — confirmado que el aviso se ve.
2. **De 2 a 6 estilos** — el usuario preguntó si estábamos limitados a 2 opciones.
   No hay límite técnico (cada estilo es solo texto en `PROMPTS` de
   `crear-imagen.js`); el límite de 3 que propuse al principio era una analogía mal
   traída con la regla de la mascota (sección 13 de `CLAUDE.md`, que es para el
   aviso de "te has quedado atascado", no para esta pantalla de crear). Ahora:
   cumpleaños, amistad, aniversario, navidad, año nuevo, retrato — en una cuadrícula
   de 2 columnas (`.persona-select-card__style-grid`) en vez de botones a toda
   anchura apilados, que habría hecho la tarjeta enorme con 6 opciones.

## v10 — Safari bloqueaba la conversión de la foto (mismo día)

Con el aviso de error ya visible (v9), el usuario probó en Safari y salió
**"The operation is insecure"**. Causa real: `imageElementToBase64()` pasaba la foto
por un `<canvas>` (`drawImage` + `toBlob`) para convertirla a base64 — Safari tiene
una protección anti-fingerprinting que puede bloquear la lectura de un canvas
**incluso con una imagen del mismo origen**, y lo bloqueó aquí. Headless Chrome
nunca lo reprodujo porque no tiene esa protección activa por defecto — otra vez, un
bug que solo aparece en un navegador concreto (como el de `pointer-events` de la
sesión 2).

**Arreglo**: quitar el `<canvas>` del todo. En vez de dibujar la imagen y leerla de
vuelta, `imageElementToBase64()` ahora hace `fetch(imgEl.src)` y lee la respuesta
como blob directamente — más simple, evita el problema de raíz (no hay canvas que
Safari pueda bloquear) y de paso no recomprime la imagen. Verificado que sigue
funcionando en Chrome headless tras el cambio; pendiente de que el usuario lo
confirme en Safari, que es donde falló.

## v11 — la causa real de fondo: `file://` en vez de `http://localhost:8888`

El arreglo de v10 no bastó — "NO FUNCIONA" seguía. Se pidió al usuario abrir la
consola de Safari apuntando **a la pestaña del prototipo, no a la de esta
conversación** (el primer intento inspeccionó claude.ai por error). Ahí salió la
causa real de todo: **`Cross origin requests are only supported for HTTP` / "Fetch
API cannot load file:///Users/.../prueba-selector.jpg"**. El usuario estaba abriendo
`index.html` directamente como archivo (`file://...`), nunca a través de
`http://localhost:8888`. Esto explica en cascada TODOS los fallos de esta función
(el "insecure operation" de v10 incluido — `file://` también tiñe el canvas): sin
servidor HTTP de por medio, ni `fetch()` a la foto ni la llamada a
`netlify/functions/crear-imagen.js` pueden funcionar nunca, sea lo que sea que se
arregle en el código. No era un bug de código, era la URL desde la que se probaba.

**Para cualquier sesión futura**: esta función (y cualquier otra que llame a
`netlify/functions/`) **solo funciona sirviendo el prototipo por `http://`**, nunca
abriendo el archivo local — recordarlo explícitamente al usuario la primera vez que
se toque algo con backend, no asumir que ya lo sabe.

Con esto arreglado, además se afinó el prompt de "Cumpleaños" a petición del
usuario: pidió que el texto "¡Feliz cumpleaños!" apareciera en la imagen. Primer
intento salió en inglés ("Happy Birthday!", el modelo por defecto usa inglés aunque
el resto del prompt esté en español) — hubo que ser explícito en el prompt
(`crear-imagen.js`) prohibiendo el inglés y dando el texto exacto entre líneas
propias, no solo entre comillas dentro de la frase.

## v12 — el texto nunca lo escribe la IA, se pone aparte como HTML real (mismo día)

Aun así salió mal: "¡Feliz cumpleaños!" apareció como "cumpleanos" (sin ñ) con la p y
la l solapadas. **No es un problema de prompt, es una limitación real de los
modelos de imagen** — no son fiables escribiendo texto exacto dentro de los
píxeles, y menos con tildes/ñ. Insistir en el prompt no lo iba a arreglar de forma
consistente.

**Arreglo de fondo, no un parche de prompt**: se le quitó a la IA la petición de
texto en los 6 estilos (`SIN_TEXTO` en `crear-imagen.js`, "No incluyas ningún texto,
letra ni palabra en la imagen") y el titular se pone aparte, como HTML real
(`.persona-create-result__caption`, `CAPTIONS` en `persona.js`) superpuesto sobre la
imagen con `text-shadow` para que se lea bien encima de cualquier ilustración. Esto
garantiza ortografía perfecta siempre, en cualquier idioma — no depende de que el
modelo "acierte" esa vez. `retrato` no lleva pie (no es festivo, `CAPTIONS` no tiene
esa clave, y `.persona-create-result__caption:empty{display:none}` lo oculta solo).

## v13 — "no incluyas texto" no bastaba: FLUX.2 klein no admite prompt negativo

Con el pie de foto ya en HTML real (v12), el modelo SEGUÍA metiendo su propio texto
en la imagen (esta vez un rótulo en inglés mal escrito detrás de mi pie correcto —
dos textos a la vez). Comprobado por documentación (`WebSearch`): **FLUX.2 klein no
tiene parámetro de prompt negativo** — cualquier instrucción tiene que decir qué SÍ
debe verse, nunca qué evitar; "no incluyas texto" es justo el tipo de frase que este
modelo ignora.

**Arreglo**: `SIN_TEXTO` (negativo) → `SOLO_DECORACION` (positivo) en
`crear-imagen.js` — en vez de "no incluyas texto", describe cómo es la superficie
que sí queremos ("los globos son de un solo color liso... es una escena puramente
decorativa e ilustrada, sin ningún cartel"). Probado de nuevo contra
`prueba-selector.jpg`: ya no aparece ningún texto generado por la IA, solo el pie de
foto en HTML.

## v14 — tipografía divertida del pie de foto + reservar espacio para el título

Dos ajustes más, ya con las 6 generaciones probadas de verdad:

1. **Tipografía del pie de foto**: el usuario pidió algo "divertido" en vez del
   Atkinson Hyperlegible plano del resto de la app — se añadió **Fredoka** (Google
   Fonts, solo para `.persona-create-result__caption`, el resto de Nido no se toca)
   con relleno en degradado arcoíris + contorno blanco fino (`-webkit-text-stroke:
   1.5px`, `background-clip:text`) — efecto "letras de globo de fiesta" pero como
   HTML real, nunca como texto generado por la IA (ver v12/v13: esos siempre salían
   mal escritos). Tamaño subido a `2.75rem` a petición del usuario.
2. **Dónde va el pie de foto**: el usuario aclaró que el texto SIEMPRE se genera (no
   es opcional); lo que varía es dónde hay sitio en cada imagen. En vez de analizar
   la imagen ya generada para buscar un hueco (poco fiable, y en Safari leer píxeles
   de un canvas puede volver a chocar con el mismo bloqueo anti-fingerprinting de
   v10), se le pide **al propio modelo que reserve esa zona al generar**:
   `ESPACIO_TITULAR` en `crear-imagen.js` pide encuadrar a las personas en la mitad
   inferior y dejar la franja de arriba despejada (cielo/fondo liso/decoración, sin
   caras). Así la posición fija del pie de foto (arriba) y el hueco real coinciden
   siempre, en vez de tener que adivinarlo después. Probado con los 5 estilos
   festivos (cumpleaños, amistad, aniversario, navidad, año nuevo) — en los 5 las
   caras quedan bien por debajo del título, sin tapar nada.

## v15 — una tipografía por creación, no la misma para las 6 + globos/confeti solo en cumpleaños

El usuario señaló dos cosas mirando las 5 generaciones de v14: (1) salían globos en
TODAS, no solo en cumpleaños, y (2) la misma Fredoka arcoíris para las 6 no "pegaba"
con cada tema (aniversario no es una fiesta con globos, es romántico).

**Causa de los globos en todas partes**: `SOLO_DECORACION` (la frase compartida por
los 6 prompts) nombraba literalmente "los globos" al describir cómo debían ser —
eso bastaba para que el modelo metiera globos en todas, aunque el prompt de esa
creación en concreto no los pidiera. Reescrita en genérico ("los elementos
decorativos son de colores lisos..."), sin nombrar ningún elemento en concreto —
cada prompt pone los suyos.

**Tipografía por creación** (Google Fonts nuevas en `index.html`, reglas
`--cumpleanos/--amistad/--aniversario/--navidad/--anonuevo` en `persona.css`):
- Cumpleaños / Amistad: Fredoka (redondeada, divertida) — arcoíris vs. rosa/rojo.
- Aniversario: **Playfair Display** cursiva dorada, sin el contorno grueso "de
  pegatina" — elegante, no de fiesta.
- Navidad: **Mountains of Christmas** (fuente navideña de verdad) roja con contorno
  blanco tipo nieve.
- Año Nuevo: **Bungee** (display bold) dorado con brillo, a juego con los fuegos
  artificiales.

**"Confeti" seguía escrito literalmente** en los prompts de `amistad` (se añadió por
error al arreglar otra cosa) y `anonuevo` ("confeti dorado") — quitado de los dos;
ahora solo aparece en `cumpleanos`.

**Cinta de color en "Amistad" — límite real del modelo, no arreglado**: probado 3
veces (quitar "detalles decorativos suaves", quitar la comparación con confeti,
pedir explícitamente "cielo cálido y liso" en la parte de arriba) y el modelo sigue
dibujando una cinta/banda de color detrás del título en esta creación en concreto —
parece un prior muy arraigado de "tarjeta de amigos = cinta decorativa". Con el
contorno blanco subido a 3px (el resto se quedó en 1.5px) el texto se sigue leyendo
bien encima, así que el usuario decidió aceptarlo tal cual en vez de seguir
insistiendo con el prompt — pendiente si en el futuro se quiere retomar con un
enfoque de prompt totalmente distinto (ver opción descartada: cambiar "tarjeta de
amigos" por algo como "foto de amigos en un parque", sin la palabra "tarjeta").

## Pendiente

- Decidir si se quiere enseñar de alguna forma que "mantener pulsado" existe — ahora
  mismo no hay ninguna pista visual antes del primer toque, se descubre solo probando.
- El bug del vídeo de bienvenida de fondo (arriba) si se añade un deep-link real.
- Decidir qué pasa con `prueba-selector.jpg` (ver sección de arriba, sesión v2).
- Variables de entorno de Cloudflare sin añadir todavía al panel de Netlify (ver v8) —
  hace falta antes de desplegar de verdad, si no "Crear algo con esta persona" fallará
  en producción aunque funcione en local.
- **Recordatorio permanente**: subir `?v=N` en `index.html` cada vez que se toque
  `persona.js` o `persona.css` (o cualquier CSS/JS) — ya pasó una vez en esta misma
  sesión que el usuario vio una versión vieja por esto.
- **Otro recordatorio permanente**: si `netlify dev` (puerto 8888) deja de responder,
  el botón "Crear algo con esta persona" fallará (con aviso ahora, no en silencio) —
  hay que tenerlo corriendo para probar esta función en local.

---

# Sesión 4 (18 sept) — fondo blanco en Pre-registro

A petición del usuario (Figma node `571:7578`): el fondo de la pantalla Pre-registro
tiene que ser blanco puro, no el `#edf2f9` que traía el vídeo original.

## Qué se hizo

**No hizo falta re-renderizar el vídeo.** El fondo del clip (`pollito-fotos.mp4`) era
casi blanco y extremadamente uniforme (BGR `(249, 240, 236)`, variación <3 unidades en
las 4 esquinas a lo largo de los 68 frames) — el mismo tipo de fondo "casi liso" que
ya se había aprovechado en la Sesión 2 para el chroma-key del pollito del onboarding.
Se corrigió por código en vez de pedir un nuevo render:

1. Se extrajeron los 68 frames (`cv2.VideoCapture`) y se calculó el color de fondo real
   por mediana de píxeles en las 4 esquinas de todos los frames (evita que un frame
   suelto con ruido desvíe la medición).
2. Por cada píxel se calculó una máscara de "qué tan lejos está del color de fondo"
   (distancia euclídea, `T_LOW=10`, `T_HIGH=60`) y se recompuso con la fórmula
   `nuevo = píxel + (1 - alpha) * (blanco - fondo_original)` — un difference-matte
   clásico: los píxeles de fondo puro pasan a blanco exacto, los de pollito/fotos no
   se tocan, y la franja intermedia (antialiasing del render) se funde en proporción
   sin dejar un corte duro ni halo alrededor del pelaje.
3. Reexportado con `cv2.VideoWriter` + fourcc `avc1` (H.264 real, no `mp4v` —
   necesario para que reproduzca en Safari/iOS) al mismo fps (24) y resolución
   (800×1406) que el original. Resultado: 899KB frente a 1.35MB del original — más
   ligero, no más pesado.
4. **Original conservado** como `pollito-fotos.original-fondo-crudo.mp4` en la misma
   carpeta, por si hace falta volver atrás o regenerar con otro umbral.

## Verificación

Comparados visualmente 3 frames de antes/después (incluida la pose con las fotos
tapando la cara del pollito, el peor caso para artefactos de máscara) — sin fringing
ni recorte visible en pelaje ni en las fotos que sujeta. Frame count (68) y fps (24)
idénticos al original, para no desincronizar la duración con el resto del flujo de
`bienvenida → pre-registro → registro-1`.

## Otro cambio necesario, no solo el vídeo

`css/pre-registro.css` fijaba `.screen--pre-registro { background: #edf2f9; }` a
propósito (comentario explícito: "es el color real del vídeo, muestreado...") — con
el vídeo ya en blanco puro, ese fondo se actualizó a `#ffffff` para que coincida
exactamente; si no, se vería una línea de color donde `object-fit: contain` no cubre
el lienzo entero (el vídeo empieza en `top: 5.5625rem`, no a pantalla completa).

**`?v=N` subido** en `index.html` para `pre-registro.css` (3→4) y para
`pollito-fotos.mp4` (3→4), siguiendo el recordatorio permanente de la Sesión 3 sobre
caché.

## Pendiente

- Verificación manual del usuario en el navegador real (esta sesión solo comparó
  frames extraídos, no se reprodujo el vídeo dentro de la app).

---

## Registro 1 — rediseño de look & feel (Figma node 590:6913)

Reemplaza el nodo 514:6044 original. Cambios, todos verificados contra
`get_design_context`/`get_screenshot` de Figma, no a ojo sobre el PNG que pasó el
usuario:

1. **Ilustración nueva**: la foto de familia (`registro-family-photo.webp`) se
   sustituye por los 4 pollitos en el sofá
   (`260914-225820-que_los_pollitos_sean_de_un_amarillo_un_poquito_me 1` en Figma,
   guardada como `assets/img/registro-1-pollitos-sofa.webp`). El nodo de Figma la
   muestra dentro de un contenedor `overflow: hidden` que recorta un 8.43% de su
   alto por arriba — en vez de reproducir esa caja + recorte en CSS, se recortó el
   propio asset por código (PIL, mismo criterio que el recorte por alfa de los
   pollitos del onboarding en la Sesión 2) antes de exportar a WebP, así que el CSS
   vuelve a ser un `<img>` simple con las medidas ya visibles, igual que el resto de
   la app — no una capa contenedora nueva.
2. **Wordmark cambia de color**: pasa del azul oscuro (`wordmark-nido-dark.svg`,
   `#2d3c8c`) al azul primario (`wordmark-nido.svg`, `#516dff`) — el mismo asset que
   ya usan Home/Álbumes/Personas/Yo, reutilizado tal cual, no se creó un SVG nuevo.
3. **Posiciones verticales bajan ~26px** respecto al nodo anterior: título
   `32.875rem → 34.5rem`, subtítulo `35.125rem → 36.75rem`, imagen
   `10.5625rem → 11.9375rem`, línea de sombra `27.08375rem → 28.5519rem`. Horizontal
   sin cambios.
4. Footer/botón "Entrar" — sin cambios, mismo componente ya verificado.

### Cambio de token global — confirmado por el usuario

`get_variable_defs` de este nodo devolvía `Color/Primary/Blue dark` = `#1e2a6b`,
distinto del `--color-primary-blue-dark: #2d3c8c` que tenía `tokens.css`. Se
preguntó al usuario antes de tocarlo porque el token se usa en 15 sitios de 5
archivos CSS (`registro.css`, `persona.css`, `components.css`, `onboarding.css`,
además de `tokens.css`) — afecta a pantallas ya construidas en sesiones anteriores,
no solo a esta. **Confirmado que es un cambio de color intencional y global del
rediseño** ("hemos cambiado algunos colores"), así que se actualizó el token una
sola vez en `tokens.css` y se propaga solo a los 15 usos. `?v=N` de `tokens.css`
subido (3→4).

### Imágenes actuales de Figma — placeholders, se sustituirán más adelante

El usuario avisa que las imágenes que trae el Figma del rediseño (como el
`registro-1-pollitos-sofa.webp` de esta pantalla, cuyo nombre interno en Figma
delata que es una generación de IA — `"...que_los_pollitos_sean_de_un_amarillo_un_
poquito_me..."`, un fragmento de prompt) **son de prueba, no las definitivas**. Se
sustituirán pantalla por pantalla más adelante por las imágenes finales.

**Convención para cuando lleguen las imágenes definitivas**: sustituir el archivo
manteniendo el mismo nombre y ruta (ej. `assets/img/registro-1-pollitos-sofa.webp`)
y solo subir el número de versión `?v=N` del archivo afectado en `index.html` — así
no hace falta tocar ni HTML ni CSS, el cambio es solo de contenido del archivo. Si
la imagen definitiva tiene una relación de aspecto distinta a la de prueba, sí habrá
que reajustar `width`/`height` en el CSS correspondiente para que no se deforme.

### Verificación

Chrome headless (`--headless=new --screenshot`, no la extensión interactiva, mismo
criterio que sesiones anteriores) sobre `index.html#registro-1` sirviendo la carpeta
por `http.server` — comparado visualmente contra el `get_screenshot` de Figma:
posición de imagen, wordmark, título/subtítulo y botón coinciden.

---

## Modal "Ayúdanos" — rediseño (Figma node 590:7032, el usuario lo llama "Registro 4")

**Aviso de nomenclatura**: el usuario se refirió a esta pantalla como "registro 4",
pero el contenido (código de 4 dígitos + modal de permiso de galería) es el mismo
que ya existe como `registro-3` + `[data-registro-modal]` — no la pantalla real
`registro-4` (splash del logo, sin relación). Parece que Figma capturó el frame de
`registro-3` con el modal ya abierto y le puso ese nombre. Se actualizó
`registro-3`/el modal existente, no se creó una pantalla nueva.

**Lo bueno**: comparando `get_design_context` con el CSS ya existente, **todas las
posiciones coinciden exactamente** con lo ya construido (título, subtítulo, cajas de
código, teclado, botón "Reenviar código", tamaño y radio del modal) — el rediseño de
esta pantalla es solo de color y contenido, no de layout. Cero cambios de posición.

### Qué cambió

1. **Fotos del modal**: las 3 polaroids se sustituyen por las nuevas (chick de
   perfil, chick recién nacido en cuna, chick en jardín) — mismo recorte por código
   que en Registro 1 (aquí el recorte vertical viene dado por
   `overflow:hidden` + escala al 100% del ancho del contenedor, mismo cálculo por
   proporciones). Guardada con el mismo nombre (`registro-polaroid-photos.webp`),
   original conservado como `registro-polaroid-photos.old-v2.webp`.
2. **`wordmark-nido-dark.svg` actualizado de `#2d3c8c` a `#1e2a6b`** — a diferencia
   de Registro 1 (que pasó al wordmark azul claro `wordmark-nido.svg`), esta
   pantalla mantiene el wordmark oscuro, pero con el nuevo valor del token
   confirmado por el usuario. Al ser un SVG estático (no puede leer la variable CSS
   `--color-primary-blue-dark`), hubo que editar el color a mano dentro del archivo.
   Afecta también a `registro-2` y al splash `registro-4`, que comparten el mismo
   archivo — no se ha verificado todavía si esas pantallas también se rediseñaron,
   pendiente de revisar cuando toque esas pantallas.
3. El resto de colores (título, subtítulo, dígitos, texto del modal) ya venían
   correctos porque usan el token `--color-primary-blue-dark`, actualizado en la
   sesión de Registro 1.

### Verificación

El modal solo se muestra tras completar el código de 4 dígitos (JS le quita
`is-visible` al entrar en cualquier pantalla). Para verlo en Chrome headless sin
tocar el archivo real, se generó una copia temporal con un `<script>` que fuerza la
clase `is-visible` tras 300ms y `--virtual-time-budget=2000` para dar tiempo a que
se ejecute — la copia se borró al terminar, no queda en el proyecto. Comparado
contra el `get_screenshot` de Figma: fotos, título, cuerpo y botones coinciden.

### `?v=N` subido

`registro-polaroid-photos.webp` (2→3). Se añadió `?v=1` a las 3 referencias de
`wordmark-nido-dark.svg` (antes no llevaba ninguna versión).

### Pendiente

- **En stand by, a petición del usuario**: confirmar si `registro-2` (teléfono) y
  `registro-4` (splash) también se rediseñaron, o si conservan el estilo antiguo —
  no se han mirado en Figma todavía. Retomar cuando el usuario lo pida.
- El botón "Quiero saber más" del modal no se ha comprobado a fondo contra el color
  exacto de Figma (`#f4f5fc` de fondo + borde `#dde2fb`) — visualmente parece
  correcto pero no se verificó con muestreo de píxel como el resto.

### `?v=N` subido

`registro.css` (2→3) en `index.html`.

---

## Onboarding eliminado temporalmente

A petición del usuario: se quita el tour de onboarding (4 pantallas) del flujo en
vivo — se rehará más adelante con nuevo diseño, no tenía sentido seguir
manteniéndolo mientras tanto.

**No se ha borrado nada de forma permanente.** Las 4 secciones completas
(`onboarding-1` a `onboarding-4`, líneas 301-524 de `index.html` antes de este
cambio) se guardaron tal cual en `_archive/onboarding-4-pantallas.html` por si
sirve de referencia al reconstruirlas. El archivo `css/onboarding.css` sigue en
disco, solo se quitó su `<link>` de `index.html` (no lo usa nada más — se comprobó
que `.persona-select-panel__pollito`, que reutiliza una de las imágenes del
pollito del onboarding, tiene su propio estilo en `persona.css`, no depende de
`onboarding.css`).

### Cambios para que el resto del flujo no se rompa

- `js/app.js`, `enterRegistroSplash()`: el splash de `registro-4` saltaba a
  `onboarding-1` tras 1.8s — ahora salta directo a `home`. Comentario dejado en el
  código explicando que es temporal.
- El bloque que arranca la animación del pollito si la pantalla activa al cargar es
  de onboarding (`startActive`, cerca del final de `app.js`) se deja tal cual,
  inerte (no encuentra ningún `.screen--onboarding`) pero sin borrar, porque hará
  falta la misma lógica cuando se reconstruya.

### Verificación

Comprobado que las etiquetas `<section>`/`</section>` siguen balanceadas (12/12)
tras el borrado, y Chrome headless sobre `index.html#home` renderiza correctamente
sin errores ni huecos visuales.

### `?v=N` subido

`js/app.js` (7→8).

---

## Home — rediseño (Figma node 594:7786)

El más grande hasta ahora: nuevo estilo de los 3 botones de navegación, anillo azul
en el avatar, y el "stack" vertical de fotos pasa a ser un carrusel horizontal con
títulos, degradado y botón para avanzar. Todo verificado con
`get_design_context`/`get_metadata` de Figma antes de tocar código, no a ojo sobre
el PNG.

### 1. Botones "Álbumes / Personas / Yo"

Pasan del azul sólido (`btn--type2`) a un estilo "suave": fondo
`--color-primary-blue-lighter` (`#f4f5fc`, token nuevo), borde
`--color-primary-blue-light`, texto e icono en azul oscuro, radio 20px (antes 12px),
sombra nueva (`--shadow-button-light`, también nueva). **No se tocó `btn--type2`
global** — es un estilo propio de `.nav-row .btn--vertical`, porque solo se ha
verificado para estos 3 botones; si el resto de la app adopta este mismo estilo más
adelante, se puede promover a un tipo con nombre.

**Los iconos cambian de color Y uno de dibujo**: los iconos actuales
(`icon-image-01.svg`, `icon-users-01.svg`, `icon-face-smile.svg`) son blancos, para
usarse sobre fondo azul sólido — invisibles sobre el nuevo fondo claro. Se
descargaron los iconos reales de Figma para esta pantalla:
- `icon-users-01-blue.svg` / `icon-face-smile-blue.svg`: mismo dibujo que los
  blancos existentes, solo cambia el color (`#516dff`) — comprobado con un diff de
  los `path` ignorando el color, son idénticos.
- `icon-image-03.svg`: dibujo **distinto** del `image-01` actual (dos marcos de foto
  superpuestos en vez de una montaña), no solo un cambio de color.

Los archivos blancos originales **no se tocaron** — `icon-image-01.svg` lo sigue
usando otra pantalla (persona.js, menú "Crear algo"), así que no se podía recolorear
en el sitio como se hizo con el wordmark.

### 2. Avatar con anillo azul

Nuevo modificador `.avatar--ring` (no se cambió `.avatar` base, que lo usan 6
pantallas y solo se ha verificado el anillo para Home): borde de 3px
`var(--color-primary-blue)`, y el tamaño baja de 70px a 64px (con el `top` ajustado
para mantener el mismo centro vertical que el wordmark de la cabecera). El color del
anillo se verificó por muestreo de píxel sobre el PNG exportado de Figma:
`rgb(81,109,255)` = `#516dff` exacto, ya existente como token.

### 3. Carrusel de "Mis recuerdos" — cambio de layout, no solo de estilo

Antes: `.stack` vertical, cada foto a ancho completo (353×240), una debajo de otra,
scroll vertical dentro de `.screen-content`. Ahora: fila horizontal de tarjetas de
300×408 con `scroll-snap`, cada una con:
- degradado inferior (`.photo-card__gradient`, `linear-gradient(164deg, rgba(16,28,43,.26) 16%, transparent 92%)`) para que el texto blanco se lea encima de cualquier foto.
- título + chevron (`.photo-card__caption`) — mismo tratamiento en las 3 tarjetas.

**Las fotos son las mismas de siempre** (vídeo boda, bebé, disfraces) — se comparó
`memory-baby.png` píxel a píxel contra la captura de Figma/usuario y es la misma
foto. Lo que cambia es el **orden** (antes vídeo→bebé→disfraces, ahora
bebé→vídeo→disfraces, para que "Personas especiales" quede primera) y que ahora
llevan título. Card 2 y 3 comparten la etiqueta genérica "Un día especial" tal cual
la tiene Figma (parece un placeholder sin terminar de nombrar, no un error de
transcripción).

**Botón flotante "siguiente" (`.carousel-next`)**: en Figma está posicionado sobre
el lienzo completo (301,728), no dentro del área con scroll — si se hubiera puesto
dentro de `.screen-content` habría desaparecido al hacer scroll junto con las
fotos. Se sacó fuera, como hermano de `.screen-content` dentro de `.screen`,
posicionado con las coordenadas absolutas de Figma. Al pulsarlo, avanza el
carrusel una tarjeta (300px + 18px de gap) vía `scrollTo({ behavior: 'smooth' })`;
si ya está al final, vuelve al principio — comportamiento no especificado en Figma
(no hay ningún flujo de interacción documentado para este botón), así que se
decidió el más razonable para un carrusel, a falta de que el usuario diga otra cosa.

### Verificación

Chrome headless sobre `index.html#home` comparado visualmente contra el
`get_screenshot` de Figma y la captura que pasó el usuario: botones, anillo,
primera tarjeta con su título y degradado, y botón flotante coinciden. No se probó
la interacción de scroll/click del botón en headless (solo el estado inicial).

### Pendiente

- Probar a mano que `.carousel-next` desplaza de verdad y que el snap se siente bien
  al deslizar con el dedo en un móvil real, no solo con ratón/trackpad.
- Confirmar con el usuario si "Un día especial" repetido en las tarjetas 2 y 3 es
  intencional o si cada una debería tener su propio título distinto.
- **Relacionado, no resuelto todavía**: el botón "Quiero saber más" del modal
  "Ayúdanos" (pendiente de la pantalla anterior) usa `btn--type3`
  (`--color-primary-blue-light` sólido) pero Figma pide el mismo estilo
  "suave+borde" que ahora sí existe como patrón en `.nav-row .btn--vertical`
  — con el token `--color-primary-blue-lighter` ya creado, sería rápido de
  arreglar si el usuario quiere retomarlo.

### `?v=N` subido

`tokens.css` (4→5), `base.css` (7→8), `components.css` (2→3), `js/app.js` (8→9).

---

## Home (scroll) — botón "atrás" del carrusel (Figma node 594:7813)

No es una pantalla nueva: es el mismo Home, capturado por el usuario después de
deslizar el carrusel. Confirma que el enfoque de carrusel + botón flotante de la
sesión anterior era el correcto — esta captura solo añade la mitad que faltaba:
un botón "atrás" idéntico en estilo al de "siguiente" (mismo fondo/borde/sombra),
en el lado izquierdo (`left: 20px`, el margen de página), que **no existe al
principio** y aparece solo cuando el carrusel ya se ha movido.

### Implementación

- Icono nuevo `icon-arrow-narrow-left-blue.svg` (mismo patrón que los demás iconos
  azules de Home: descargado de Figma, ya en `#516dff`).
- `.carousel-prev` comparte casi todo el CSS con `.carousel-next` (mismo tamaño,
  fondo, borde, sombra) — se unificó en una sola regla con selector combinado y
  solo `left` queda distinto por botón.
- Empieza con el atributo HTML `hidden` en el propio markup (oculto por defecto,
  sin depender de que JS cargue primero para que no haya un parpadeo inicial).
- `app.js`: un listener de `scroll` en el carrusel decide `prevBtn.hidden =
  scrollLeft < 4` — el margen de 4px es para evitar parpadeos por redondeos
  subpíxel del navegador, no un valor con significado propio.
- El click de ambos botones ahora comparte una sola función (antes solo existía la
  de "siguiente"): mismo cálculo de `cardWidth + gap`, sumando o restando según cuál
  se pulse. El de "siguiente" conserva el comportamiento de volver al principio al
  llegar al final; el de "atrás" simplemente no baja de 0 (`Math.max`).

### Verificación

Como Chrome headless no simula gestos de deslizar, se generó una copia temporal de
`index.html` con un script que fuerza `carousel.scrollLeft = 318` (300px de tarjeta
+ 18px de gap = una tarjeta exacta) tras cargar, para capturar el estado "ya
desplazado" — la copia se borró al terminar. Resultado: segunda tarjeta (boda)
centrada con su título, botón "atrás" visible a la izquierda, "siguiente" sigue a
la derecha, y se asoma el borde de la tercera tarjeta (disfraces) — coincide con la
captura de Figma.

### `?v=N` subido

`components.css` (3→4), `js/app.js` (9→10).

---

## Ajustes sueltos tras revisar todo lo montado

**Botón "Quiero saber más" del modal (pendiente de dos sesiones atrás):** pasa al
estilo suave (fondo `--color-primary-blue-lighter` + borde + `--shadow-button-light`,
alto fijo 65px) igual que los botones de Home. Override local en
`.registro-modal-actions .btn--type3` — no se toca `.btn--type3` global (13 usos sin
revisar en el resto de la app).

**Sombra de las tarjetas del carrusel de Home:** Figma (594:7786) no lleva ninguna
sombra en estas tarjetas — se quitó con `.carousel .photo-card { box-shadow: none; }`,
sin tocar `.photo-card` global (sí la llevan las de Álbumes y fotos de personas).
De paso se quitó el `padding-bottom` que existía solo para no recortar esa sombra,
ya innecesario.

**Registro 2 y el splash Registro 4**: quedan pendientes de Figma — el archivo es
muy grande y la búsqueda por metadata se corta antes de llegar a esa zona; hace
falta que el usuario pase el enlace directo de cada pantalla, no vale adivinar el
node-id.

### `?v=N` subido

`registro.css` (3→4), `components.css` (4→5).

---

## Carrusel de Home — no se deslizaba con el dedo

El usuario reportó que el carrusel no respondía al deslizar (solo funcionaban los
botones de flecha). Causa: faltaba `touch-action: pan-x` en `.carousel` — la
pantalla de detalle ya tiene este mismo problema resuelto en `.detail-media`
(comentario propio: *"pan-x deja que un dedo deslice entre fotos... sin que el
navegador dude qué gesto es"*), pero no se replicó al construir el carrusel de
Home. Añadido, junto con `-webkit-overflow-scrolling: touch` (inercia en iOS
Safari) que `.detail-media` también lleva y el carrusel no tenía.

### `?v=N` subido

`components.css` (5→6).

---

## Álbumes — rediseño completo (Figma node 649:7468)

Pantalla entera reconstruida, no un ajuste — el layout antiguo (título negro +
fila de acciones azul sólido + álbumes en lista con miniatura pequeña) no se
parecía en nada al nuevo. Nuevo archivo `css/albumes.css` (patrón ya establecido
de un CSS por pantalla, como `registro.css`/`pre-registro.css`).

### Cabecera — reutilizada de Home, no rehecha

El título "Álbumes" (22px, azul primario `#516dff`, bold) y el avatar ya
coincidían con el nuevo diseño sin tocar nada — `.page-title` ya estaba en ese
color/tamaño desde antes del rediseño (documentado como excepción verificada en el
`README.md` original). Solo hizo falta añadir `avatar--ring` (el modificador que
creamos para Home) al avatar, que no lo llevaba.

### Botones "Álbum nuevo" / "Buscar"

Mismo estilo "suave" ya usado en Home, pero "Álbum nuevo" es una construcción de
dos capas que no existía todavía: una tarjeta suave exterior (fondo+borde+sombra,
sombra propia distinta a `--shadow-button-light` — no se tokenizó, es la única
tan usa esta variante concreta) conteniendo un botón interior con **borde discontinuo
azul** y una esquina (inferior-izquierda) más redondeada que las otras tres — así
está en Figma (649:8872), se dejó tal cual sin "corregir" la asimetría.

**Bug encontrado en la propia sesión**: con el padding horizontal exacto de Figma
(32px), "Álbum nuevo" se partía en dos líneas porque aquí el botón vive en un
`flex:1` dentro de una fila de 353px (menos ancho real disponible que en el marco
de Figma) — reducido a 20px de padding horizontal y añadido `white-space: nowrap`.

**Iconos recoloreados**: `icon-plus.svg` tenía el azul viejo (`#2d3c8c`, antes del
rediseño) y `icon-search-md.svg` era blanco (pensado para el botón azul sólido
antiguo) — ambos se usan *solo* en esta pantalla, así que se sustituyeron
directamente por los de Figma (`#516dff`) en vez de crear variantes nuevas.

### Álbumes como "pila de fotos" — componente nuevo

Cada álbum ya no es una fila con miniatura pequeña: es una foto grande (recta,
con degradado + título + contador) con **otra foto distinta asomando rotada
detrás** (`-8.82deg`, con un velo blanco al 50% para que no compita visualmente).
Truco de Figma que se pudo copiar literal: ambas capas están simplemente
*centradas* dentro de la misma caja invisible más grande (351×237.6px) — una sin
rotar, otra rotada — así que en CSS basta un `position:absolute; left:50%;
top:50%; transform: translate(-50%,-50%) [rotate...]` en cada una, sin cálculos
de offset manuales.

**La foto de detrás es la de la paella** (`assets/img/album-paella.webp`, la misma
que Home dejó como referencia descartada hace dos pantallas) — confirma que sí es
contenido real pensado para el álbum, no ruido. La de delante es la foto de
Venecia ya usada en Home (`album-venecia.webp`). Las dos entradas de la lista
son el mismo placeholder "Todas tus fotos" / "104 fotos" tal cual Figma, no un
error de copiar y pegar — mismo criterio que "Un día especial" repetido en Home.

### Botón flotante "ver más álbumes"

Mismo patrón que `.carousel-next` de Home (fuera de `.screen-content` para no
desaparecer con el scroll), pero apuntando hacia abajo — aquí la lista de álbumes
se desplaza verticalmente, no en horizontal. No lleva lógica de scroll todavía
(`data-action="noop"`) porque no hay suficientes álbumes en el prototipo para que
haga falta de verdad — añadir si se llega a necesitar.

### "Volver" pasa de `btn--type3` a `btn--type2`

En Figma el Footer de esta pantalla es azul sólido (igual que "Entrar" en
Registro 1), no el azul claro que tenía antes. Icono nuevo
`icon-arrow-left-lighter.svg` (`#f4f5fc`, el mismo tono casi blanco que ya usan
otros iconos sobre fondo azul sólido) — **no se tocó** `icon-arrow-left.svg`
original, porque lo comparten 6 botones "Volver" más en otras pantallas sin
revisar todavía.

### Verificación

Chrome headless sobre `index.html#albumes`, dos vueltas (la primera detectó el
texto partido de "Álbum nuevo", corregido y vuelto a verificar) — coincide con el
`get_screenshot` de Figma y con la captura del usuario.

### `?v=N` subido

`css/albumes.css` (nuevo, v1).

---

## Dentro de un álbum — pantalla nueva (Figma node 668:9100)

No existía nada parecido — pantalla nueva `data-screen="album-detalle"`, CSS
añadido a `albumes.css` (comparte cabecera, footer y botón flotante con Álbumes).

### Qué es

Cuadrícula de 2 columnas: primera celda "Añadir" (misma construcción de doble
capa + borde discontinuo que "Álbum nuevo" de Álbumes, pero cuadrada y con el
icono encima del texto en vez de al lado), el resto son fotos cuadradas de
168×168 con las esquinas a 20px.

**Las fotos reutilizan la clase `.photo-card` que ya usa el resto de la app** en
vez de una clase nueva — así heredan gratis el comportamiento ya existente en
`js/app.js` de "tocar una foto abre la pantalla de detalle con todas las de esta
pantalla, deslizable, empezando en la tocada" (`openDetalle()`, buscaba
`.photo-card` dentro de la pantalla activa). Solo se sobreescribe el radio (20px
en vez de 12px) y se quita la sombra, igual que se hizo con el carrusel de Home.

### Solo hay 2 fotos de muestra, repetidas para rellenar

Figma solo trae 2 fotos reales distintas para esta cuadrícula — la de Venecia (ya
usada en Home/Álbumes) y una nueva, dos mujeres bajo un puente/museo con
acreditaciones "B+" (guardada como `assets/img/album-museo.webp`). Se repiten
alternando por columna (izquierda=Venecia, derecha=museo) para rellenar las 9
celdas de la cuadrícula, tal cual se ve en la captura de Figma — no son 9 fotos
reales ni un error de copiar la misma imagen sin querer.

Un tercer asset de Figma (`Rectangle129`) resultó ser un PNG transparente/vacío
de 256×256 sin contenido visible — no se guardó, no es una foto real, parece un
resto de capa de Figma sin usar.

### "Volver" va a Álbumes, no a Home

A diferencia del resto de pantallas de nivel superior (Home, Personas, Yo...),
aquí "Volver" tiene que llevar a la lista de álbumes, no a Home — es una pantalla
un nivel más adentro. `data-nav="albumes"` en vez de `data-nav="home"`.

### Conectado desde Álbumes

Las dos tarjetas "pila de fotos" de Álbumes (`.album-stack__front`) apuntaban a
`data-action="noop"` (sin destino, contenido pendiente) — ahora navegan a
`data-nav="album-detalle"`. De paso se quitó un `data-nav="albumes"` suelto que
había quedado por error en el div contenedor exterior de cada pila (inofensivo —
`.closest()` encuentra antes el botón interior — pero confuso de leer).

### Verificación

Chrome headless sobre `index.html#album-detalle` — coincide con el
`get_screenshot` de Figma y la captura del usuario.

### `?v=N` subido

`css/albumes.css` (1→2).

---

## Dentro de un álbum (scroll) — botón que alterna dirección (Figma 675:2293)

No es una pantalla nueva, es la misma cuadrícula desplazada — confirma que la
cabecera fija + contenido desplazándose debajo ya funcionaba gratis con lo que
había (Figma pide `backdrop-blur-0px` en la cabecera, es decir *sin* desenfoque
real — lo que parece "borroso" en la captura es la propia foto, no un efecto).

**Lo único nuevo**: el botón flotante cambia de flecha-abajo a flecha-arriba una
vez hay scroll — no son dos botones fijos como el carrusel de Home (aquí no hay
"unidades" que avanzar, es una lista vertical continua), es un único botón que
alterna icono y acción.

### Implementación

- Icono nuevo `icon-arrow-narrow-up-blue.svg`.
- El botón pasa de `data-action="noop"` a `data-scroll-toggle` (en esta pantalla
  únicamente — el de Álbumes se deja como estaba, sigue sin lógica real porque
  ahí no hay contenido suficiente para justificarla).
- `app.js`: escucha el scroll de `.screen-content`, cambia el `src` del icono y el
  `aria-label` según `scrollTop > 4`. Al pulsar: si hay scroll, `scrollTo({top:0})`;
  si no, avanza `clientHeight * 0.8` (un "salto" de página, no una unidad fija
  como en el carrusel, porque una lista vertical no tiene tarjetas que contar).

### Bug propio encontrado verificando (no de la app, de mi propio script de prueba)

Para simular el scroll en Chrome headless (que no gesticula), generé una copia
temporal con un script inyectado — la primera versión tenía las comillas mal
escapadas al pasar por `sed` (`\"` dentro de comillas simples de bash se comía la
barra invertida) y el `<script>` resultante tenía un error de sintaxis silencioso
— parecía que el botón "no hacía nada" cuando en realidad el script de prueba
nunca llegó a ejecutarse. Arreglado alternando comillas simples/dobles sin
escapar nada. Anotado por si se vuelve a necesitar este truco de verificación.

### Verificación

Chrome headless con `scrollTop` forzado por script (200ms de espera,
`--virtual-time-budget=2000`) — el botón muestra la flecha hacia arriba con el
scroll aplicado, coincide con la captura de Figma.

### `?v=N` subido

`js/app.js` (10→11).

---

## Seleccionar fotos para añadir — pantalla nueva (Figma node 685:8075)

Pantalla nueva `data-screen="album-seleccionar"`, conectada desde el botón
"Añadir" de "Dentro de un álbum" (antes `data-action="noop"`, ahora
`data-nav="album-seleccionar"`).

### Selección con toque simple, sin mantener pulsado

El usuario pidió explícitamente que funcione "como ya lo hace de normal":
tocar una foto la selecciona/deselecciona directamente, **sin el gesto de
mantener pulsado** que sí usa "seleccionar personas dentro de una foto"
(persona.js). Tiene sentido que sean gestos distintos — ahí el toque largo
existe para distinguir de un futuro scroll/tap accidental sobre la foto; aquí
tocar una foto no compite con ningún otro gesto, así que un toque simple es
más rápido y no hay razón para copiar el mismo mecanismo.

Nueva clase `.photo-cell` (no `.photo-card`) para las celdas — a propósito,
para que **no** disparen `openDetalle()` (el comportamiento de "tocar abre la
galería" que sí tiene `.photo-card` en el resto de la app). Selección = toggle
de la clase `.is-selected`, sin límite de cuántas fotos a la vez.

**Empieza sin nada seleccionado.** La captura de Figma muestra 3 fotos ya
marcadas, pero eso es solo para enseñar cómo se ve el estado "seleccionado" —
el punto de partida real de la pantalla es limpio, se verificaron ambos
estados por separado.

### Footer de 2 botones — nuevo modificador `.btn--soft`

"Volver" (azul sólido, `btn--type2`) + "Añadir" (suave, con check azul oscuro)
uno al lado del otro. Para "Añadir" se creó `.btn--soft` en `components.css`
como modificador reutilizable de verdad — es la tercera vez que aparece este
estilo "fondo claro + borde + sombra propia" (antes en Home y Álbumes, cada
vez con CSS propio de esa pantalla) pero es la primera vez que se nombra como
clase genérica. **No se ha retrocedido a unificar** los otros dos usos por no
arriesgar una regresión en pantallas ya verificadas — queda anotado como
posible limpieza futura, no hecho ahora.

Reutilizado sin cambios: `.bottom-fade` + `.bottom-action-row` (el mismo par
que ya usaba la pantalla de detalle de foto para su footer de 2 botones), y el
botón "bajar/subir" (`data-scroll-toggle`) de la pantalla anterior — funciona
aquí sin tocar nada porque busca `.screen-content` genéricamente, no algo
específico de "Álbum".

### Verificación

Chrome headless en dos estados: vacío (recién entrando) y con 3 fotos marcadas
a mano por script — coincide con la captura de Figma en ambos casos.

### `?v=N` subido

`components.css` (6→7), `css/albumes.css` (2→3), `js/app.js` (11→12).

---

## Corrección: la selección era al revés

El usuario corrigió justo después de verificarla: **mantener pulsado selecciona,
un toque normal abre el detalle** — no al contrario. Tiene sentido que sea así y
no al revés: en esta pantalla el usuario probablemente quiere revisar la foto
(verla en detalle) tan a menudo como seleccionarla, así que el gesto simple
(tocar) debe ir al uso más neutro/reversible (ver), y el gesto con más
intención (mantener pulsado) al que cambia estado (seleccionar) — el mismo
criterio que ya sigue "seleccionar personas dentro de una foto".

### Cambios

- Las celdas vuelven a ser `.photo-card` de verdad (con el modificador
  `.is-selectable` solo para el velo+check), en vez de la clase `.photo-cell`
  sin ese comportamiento — así heredan gratis `openDetalle()` para el toque
  normal, sin tener que reimplementarlo.
- `app.js`: mismo patrón `pointerdown` + `setTimeout(650ms)` que ya usa
  persona.js para "seleccionar personas" (mismo umbral, por consistencia). Si
  el timer llega a completarse, selecciona y marca `suppressClick = true`; un
  listener de `click` **en fase de captura** sobre el grid entero intercepta
  ese click antes de que llegue al manejador genérico de `document` que abre
  el detalle (`stopImmediatePropagation` + `preventDefault`). Si se suelta
  antes de los 650ms, se cancela el timer y el click sigue su curso normal.
- CSS: `.photo-cell`/`.photo-cell__overlay` renombrados a
  `.photo-card.is-selectable`/`.select-overlay` — la regla de radio 20px sin
  sombra ya la daba gratis `.album-grid .photo-card` (existente desde "dentro
  de un álbum"), así que no hubo que repetirla.

### Verificación

Nada de esto se puede probar con `--screenshot` normal (necesita esperar a que
pase el tiempo de un `pointerdown` real). Se verificó disparando eventos
`PointerEvent`/`MouseEvent` por script contra la pantalla ya cargada, con
`--virtual-time-budget` dando tiempo a que el `setTimeout` de 650ms se cumpla:
- Toque rápido (pointerdown→pointerup→click inmediato): abre el detalle,
  la foto NO queda seleccionada.
- Mantener pulsado 700ms: la foto queda seleccionada, el detalle **no** se
  abre (comprobado explícitamente que `detalle-foto` seguía sin estar activo).
- Captura visual tras disparar solo el `pointerdown` y esperar: el check se ve
  centrado y a 48px, sin que el `object-fit:cover` heredado de `.photo-card`
  lo deforme.

### `?v=N` subido

`css/albumes.css` (3→4), `js/app.js` (12→13).

---

## Detalle foto — rediseño (Figma node 677:2380)

Pantalla existente (`data-screen="detalle-foto"`), bastante desactualizada: título
"Ver más opciones" → "Detalle foto", acción "Crear + ⋮" → "Generar + Eliminar",
footer Volver/Compartir con los colores cambiados de sitio.

### Reutiliza clases de Álbumes tal cual, sin CSS nuevo

"Generar" (doble capa + borde discontinuo) y "Eliminar" (suave con icono+label)
son el mismo patrón exacto que "Álbum nuevo"/"Buscar" de `albumes.css`
(`.albumes-new-wrap`/`.albumes-new-btn`/`.albumes-search-btn`) — se reutilizaron
las clases directamente, solo cambia el texto y el icono en el HTML. Cero CSS
nuevo para esta parte.

### Footer: Volver/Compartir intercambian de estilo

Antes "Volver" (`btn--type3`, suave) + "Compartir" (`btn--type2`, sólido) — el
rediseño los invierte: Volver pasa a sólido azul, Compartir al nuevo
`.btn--soft` (el modificador genérico creado en la sesión de "seleccionar fotos
para añadir"). El icono de Compartir también cambia de **dibujo**, no solo de
color: `share-02` (bandeja con flecha) en vez de `share-01` (caja simple) —
comprobado con diff de paths, son geometrías distintas.

### Iconos nuevos vs. recoloreados en el sitio

- `icon-star-06-blue.svg`, `icon-trash-01-blue.svg`, `icon-share-02-blue.svg`:
  nuevos, descargados de Figma en `#516dff`.
- `icon-star-06.svg` (el viejo, `#2d3c8c`) y `icon-share-01.svg` (blanco) **no
  se tocaron** — el primero solo lo usaba este botón así que se podría haber
  recoloreado en el sitio, pero como el dibujo cambió por completo (no solo el
  color) no tenía sentido reutilizar el archivo; el segundo lo sigue usando
  `persona-create-result` (pantalla de resultado de "Crear algo con esta
  persona"), sin revisar todavía contra este rediseño.

### Posición del `action-row`: mismo desfase de 4px que ya vimos en Home

135px en Figma contra 139px que tenía `.action-row`. No se tocó la clase
global (la comparte la pantalla "Yo", sin revisar) — override local
`.detalle-actions { top: 8.4375rem; }`.

### Verificación

Chrome headless — cabecera, fila de acciones y footer coinciden con el
`get_screenshot` de Figma. La zona de la foto en sí no se pudo verificar en esta
pasada (el truco para forzar una pantalla "activa" a mano por script dejó
`bienvenida` como la `.screen.is-active` real, así que `openDetalle()` no
encontró fotos) — no es un bug de la app, es una limitación de cómo se forzó el
estado en la prueba. El mecanismo de abrir la foto en sí ya se verificó de
sobra en la sesión de "seleccionar fotos" (toque simple → `openDetalle()`).

### Pendiente

- `persona-create-result` (pantalla de resultado de generar con IA, dentro de
  esta misma pantalla) sigue con el footer Volver/Compartir al revés — no se
  ha revisado si el rediseño también le aplica.
- Confirmar en el navegador real que la foto se ve bien con el nuevo layout
  (la verificación de esta sesión no pudo cargar una foto real, ver arriba).

### `?v=N` subido

`css/components.css` (7→8).

---

## "Crear algo con esta persona" — adaptado al diseño actual (sin Figma propio)

El usuario confirmó que **este es el punto donde más adelante irá el recorte de
persona** (Lift Subject) del que se hablará en otra sesión — de momento pidió
adaptar al diseño actual todo lo que se pudiera, sin tener una pantalla de
Figma específica para este flujo (menú del pollito / elegir estilo / cargando /
error / resultado). Se aplicó el mismo criterio que ya usa el resto de la app
en vez de esperar a un diseño concreto:

- **Los 3 botones "Salir y seguir viendo imágenes"** (aparecen en el menú, en
  elegir estilo y en el paso de error) pasan de `btn--type3` (azul claro
  sólido, estilo antiguo) a `.btn--soft` (el suave con borde que ya es el
  estándar en Home/Álbumes/Detalle foto).
- **"Crear algo con esta persona"** (menú): mismo cambio, `btn--type3` → `.btn--soft`.
- **Footer del resultado generado (Volver/Compartir)**: mismo intercambio que en
  Detalle foto — Volver pasa a azul sólido (`btn--type2` + icono
  `icon-arrow-left-lighter.svg`), Compartir pasa a suave (`.btn--soft` +
  `icon-share-02-blue.svg`, el mismo icono nuevo de Detalle foto, no el
  `share-01` blanco que llevaba antes).

**Lo que NO se tocó, a propósito:**
- **"Ver recuerdos de esta persona"** (menú) y **"Volver a intentarlo"**
  (error): son las acciones principales de su paso, se quedan en azul sólido
  (`btn--type2`) — no hay motivo para bajarlas de jerarquía.
- **La cuadrícula de 6 estilos** (Cumpleaños/Amistad/Aniversario/Navidad/Año
  nuevo/Retrato): siguen en azul sólido. No son una acción secundaria tipo
  "salir", son las propias opciones a elegir — no hay ningún patrón
  establecido en el resto de la app que diga que una cuadrícula de opciones
  deba ser "suave", así que se dejaron tal cual en vez de inventar un criterio
  nuevo sin que el usuario lo pida.

### Verificación

Chrome headless forzando cada paso visible por separado (menú, elegir estilo) —
jerarquía visual clara: la acción principal de cada paso en azul sólido, las
secundarias/de salida en suave. El paso de resultado no se verificó visualmente
en esta pasada (requiere una imagen generada de verdad para tener contenido que
mostrar), pero el cambio de clases es idéntico al de Detalle foto, ya verificado.

### `?v=N` subido

Solo `index.html` — no hizo falta CSS nuevo (`.btn--soft` ya existía).

---

## Sesión 4 (18 sept) — verificación pixel-perfect de "Detalle foto" con foto real

El usuario pidió "rehacer" `detalle-foto` a partir del nodo de Figma 677:2380 (el
mismo del rediseño de la sesión anterior) más una captura de referencia. Antes de
tocar nada se comparó `get_design_context` del nodo contra el HTML/CSS ya
existente: **coincidían por completo** (título, Generar/Eliminar, footer
Volver/Compartir, colores, iconos, radios) — no hizo falta cambiar código, la
tarea real era cerrar el pendiente de la sesión anterior: "confirmar con una
foto real cargada", que entonces no se pudo verificar.

**Cómo se verificó esta vez:** copia temporal de `index.html` con un
`<script>` inyectado antes de `</body>` que espera al `load` y llama
`.click()` sobre `.photo-card` (abre `detalle-foto` de verdad, con
`openDetalle()` rellenando la foto) — luego captura con
`chrome --headless=new --screenshot=... --virtual-time-budget=3000` sobre esa
copia sirviéndola por `netlify dev` (`http://localhost:8888/index-test-....html#home`).
Aquí sí vale `.click()` en vez de coordenadas CDP porque es una navegación
legítima sobre el elemento visible, no una prueba de hit-testing con capas
superpuestas (ver sesión 2 sobre por qué ahí sí hacía falta CDP). Capturado con
`--window-size=480,960` (no 393×852): con la ventana exacta al ancho del
lienzo, el padding horizontal del `body` (1rem cada lado) empuja el lienzo
fuera del viewport y recorta el lado derecho en la captura — no es un bug de
la app, es la ventana de prueba demasiado ajustada. Resultado: cabecera, fila
de acciones, foto a pantalla completa y footer coinciden con la captura de
Figma. Pendiente de la sesión anterior, cerrado.

### Bug real de este Chrome (153.0.8010.48, arm64) — CDP por WebSocket con `Page.navigate` + `Page.captureScreenshot` se cuelga

Antes de llegar al método de arriba se intentó primero el patrón ya usado en
sesiones anteriores (Chrome headless + CDP por WebSocket, `Input.dispatchMouseEvent`).
En **esta versión concreta de Chrome**, cualquier `Page.captureScreenshot`
enviado por WebSocket **después** de un `Page.navigate` en la misma sesión de
depuración se queda colgado para siempre (ni error ni respuesta, confirmado
con timeouts de 30s) — reproducido incluso navegando a un `data:` URL trivial,
así que no tiene nada que ver con esta app. Un `Page.captureScreenshot` sin
ningún `Page.navigate` previo en esa conexión responde al instante pero
**devuelve un PNG en blanco** (compositor sin renderizar nada realmente,
confirmado abriendo el PNG). Probado sin éxito: quitar `--disable-gpu`,
`--headless=old`, conexión WebSocket nueva por comando en vez de reusar la
misma, `--enable-unsafe-swiftshader`. La combinación que **sí funciona** es la
del método de arriba: el flag de CLI `--screenshot=archivo.png` (proceso de
Chrome nuevo por captura, sin CDP manual) — si hace falta simular una
interacción antes, inyectar el `<script>` en una copia del HTML en vez de
dirigir la interacción por CDP. Anotado para no volver a perder tiempo con el
método CDP en esta máquina/versión de Chrome si reaparece el mismo cuelgue.

### `?v=N` subido

Ninguno — no hubo cambios de código, solo verificación.

---

## "Yo" — rediseño (687:8356)

Pantalla existente (`data-screen="yo"`), con la misma cabecera compartida de
siempre pero con los dos botones de arriba y la cuadrícula de creaciones
desactualizados respecto al diseño actual.

### Botones de arriba pasan a estilo "suave"

"Mis documentos" (`btn--type2` sólido) y "Ajustes" (`btn--type3` claro)
pasan al mismo lenguaje "suave" que ya usa Detalle foto (Generar/Eliminar):
fondo blue-lighter + borde + sombra propia, icono azul (`#516dff`) encima del
texto en vez de blanco/dark. **"Ajustes" no lleva CSS nueva**: es
`.albumes-search-btn` reutilizado tal cual (mismo ancho fijo 107px, misma
sombra) — mismo criterio de "reutiliza clases de Álbumes" que ya se aplicó en
Detalle foto. "Mis documentos" sí es nuevo (`.yo-docs-btn` en `css/yo.css`)
porque crece (`flex:1`) y usa la OTRA sombra (la más difusa, la del wrap de
"Generar" en Detalle foto) — confirmado que son sombras distintas con
`get_design_context`, no una suposición.

### Iconos nuevos descargados de Figma (no existían)

- `icon-file-06-blue.svg` — no había ningún icono de "documento/archivo" en
  el proyecto (el que había, `icon-image-01.svg`, es un icono de imagen/foto,
  glifo distinto). Descargado del servidor local de Figma Dev Mode
  (`get_design_context` sobre el nodo del botón, luego `curl` directo a la
  URL del asset mientras la sesión de Figma seguía abierta).
- `icon-settings-01-blue.svg` — el `icon-settings-01.svg` que ya había en el
  proyecto es la versión **antigua** (`stroke="#2D3C8C"`, antes del
  rediseño), igual que le pasaba a `icon-star-06.svg`/`icon-share-01.svg`
  (ver sesión de Detalle foto). Se descargó la versión nueva en `#516dff` en
  vez de recolorearla a mano.

**Nota real de esta sesión — la conexión con Figma Desktop se cortó a medio
camino** (`get_design_context`/`get_metadata` empezaron a fallar con "No node
could be found... make sure Figma desktop is open and the document is the
active tab" sobre un nodo que un momento antes había funcionado). Se le pidió
al usuario que reabriera/enfocara el archivo — al hacerlo, reconectó sin más
cambios. Si vuelve a pasar: no es un bug de esta app, es la sesión de Figma
Dev Mode cayéndose; pedir al usuario que la reabra antes de asumir que el
nodo no existe.

### "Generar" — nueva primera celda de "Mis creaciones"

Antes la cuadrícula solo mostraba las 3 creaciones ya hechas, sin ninguna
forma de generar una nueva desde esta pantalla. El diseño nuevo añade
"Generar" (icono `star-06` + texto, borde discontinuo) como primera celda,
mismo patrón de doble capa que "Álbum nuevo" (`albumes-new-wrap`/`-btn`) pero
**cuadrado y en vertical** en vez de fila — nuevas clases `.yo-generar-wrap`/
`.yo-generar-btn` en `css/yo.css` (medidas de padding sacadas de
`get_metadata` sobre el nodo real: 13px el wrap, 16px/32px el botón interior,
no repetidas a ojo desde Álbumes aunque el patrón sea el mismo). `data-action="noop"` —
no hay flujo de creación construido en esta pantalla (mismo criterio que el
"Generar" de Detalle foto antes de que "Crear algo con esta persona" se
volviera real).

### Footer: Volver pasa a sólido azul

Mismo cambio que ya se hizo en Detalle foto/Álbumes: `.btn--type3` (claro) →
`.btn--type2 btn--icon-wide` (azul sólido) + `icon-arrow-left-lighter.svg` en
vez de `icon-arrow-left.svg`. Copiado literal de las clases que ya usan
Álbumes/Álbum-detalle para su Volver, sin inventar nada nuevo.

### `.screen-content` empieza 14px más arriba

`get_metadata` contra el nodo real da 241px para el top de "Mis creaciones",
no los 255px genéricos que usa `.screen-content` en el resto de pantallas —
override `[data-screen="yo"] .screen-content { top: 15.0625rem; }` en
`css/yo.css`, igual que ya se hizo con `.detalle-actions`/`.nav-row` en otras
pantallas cuando Figma pedía un valor distinto del genérico.

### Verificación

`chrome --headless=new --screenshot=... --window-size=480,960` sobre
`http://localhost:8888/#yo` (deep-link directo, no hace falta simular ningún
toque porque "yo" ya es un destino de navegación de primer nivel) — coincide
con la captura de Figma: cabecera, botones suaves, cuadrícula con Generar en
la primera celda, footer sólido.

### `?v=N` subido

`index.html` (nuevo `<link>` a `css/yo.css?v=1`).

---

## Álbumes — repaso de fidelidad a petición del usuario (spacing/degradados)

El usuario pidió revisar tamaño de botones/opacidades/degradados/spacing de
"Álbumes" comparándolo a ojo contra Figma. Se descargaron las fotos reales
del "stack" (`imgAlbum`/`imgAlbum1`) desde el servidor local de Figma Dev
Mode para descartar que fueran fotos distintas (paella vs. Venecia) — **no
era un bug**: la foto de detrás es paella de verdad en Figma también, ya
estaba bien puesta. Comparando capturas aisladas (`get_screenshot` sobre el
nodo del stack, más capturas recortadas del propio prototipo con Chrome
headless) se encontraron dos diferencias reales, ambas de medida, no de
percepción:

1. **El degradado del pie de foto se aclaraba de más.** El segundo stop real
   en Figma es `~112%`, no `100%` — el degradado nunca llega a transparencia
   total ni en el borde superior de la foto, deja un velo oscuro residual
   muy tenue en toda la caja. Con `100%` aquí se aclaraba de más arriba de
   la cuenta, dando una foto ligeramente más "lavada" que en Figma.
2. **El hueco entre "Mis álbumes" y la primera foto era casi el doble.** El
   margen genérico de `.section-title` (16px, pensado para pantallas donde
   el contenido empieza pegado a la caja) se sumaba al "cojín" que ya trae
   cada `.album-stack` por dentro (237.648px de caja para una foto de
   189px, ~24px de margen arriba/abajo) — en Figma no hay separación
   aparte, todo el hueco visual viene solo de ese cojín. Arreglado con
   `[data-screen="albumes"] .section-title { margin-bottom: 0; }`.

**Lo que se comprobó y NO era un bug** (para no repetir la misma revisión):
tamaño de "Álbum nuevo"/"Buscar" (coincide con `get_design_context`, la
única diferencia es el padding horizontal reducido a propósito del texto
"Álbum nuevo", ya documentado más arriba), geometría del "peek" del stack
(rotación -8.82°/skew -1.21°, tamaños casi idénticos entre foto de delante y
de detrás — el asomo concentrado arriba-derecha es el comportamiento
correcto, no falta ningún asomo en otra esquina), opacidad del velo blanco
de la foto de detrás (0.5 en ambos).

### `?v=N` subido

`css/albumes.css` (4→5).

---

## Repaso de fidelidad del resto de pantallas (a petición del usuario)

El usuario pasó 8 enlaces de Figma de golpe (Registro 1 `590:6913`, Registro
con código+popup `590:7032`, Home `594:7786`/`594:7813`, dentro de un álbum
`668:9100`, scroll toggle `675:2293`, seleccionar fotos `685:8075`, Detalle
foto `677:2380`) pidiendo el mismo repaso que en Álbumes. Mismo método:
`get_design_context`/`get_metadata` contra cada nodo, comparado número a
número contra el CSS ya escrito, arreglando solo diferencias reales y
medibles (no impresiones a ojo). Detalle foto ya se había verificado a fondo
esta misma sesión, no hizo falta repetirlo.

**Bugs reales encontrados y arreglados:**

1. **Registro 1 — el título nunca envolvía a dos líneas.** `.registro-1-title`
   tenía `width: 21.8125rem` (349px) en vez de `17.6875rem` (283px) — con el
   ancho real, "Revive tu momentos mas especiales" cabía en una sola línea
   cuando en Figma envuelve a dos ("Revive tu momentos" / "mas especiales").
   Al arreglar el ancho hubo que bajar también `.registro-1-subtitle` (de
   36.75rem a 39.75rem) para que no quedara pegada a la segunda línea del
   título, y corregir su `left` (estaba en 2.75rem/44px, debía ser
   1.25rem/20px como el título — se veía desalineada a la derecha).
2. **Modal "Ayúdanos" — velo demasiado claro.** `rgba(41,41,41,0.45)` en vez
   de `0.6` — confirmado contra `get_design_context` de `590:7032`.
3. **Botón flotante de Home ("siguiente"/"atrás" del carrusel) con la
   sombra equivocada.** Reutilizaba `--shadow-button-light` (la de los
   botones suaves normales), pero este botón concreto (`668:9171`) lleva su
   propia sombra, más gris/neutra (`rgba(221,221,225,0.3)` /`#e9e9ee`) — el
   mismo criterio que ya se aplicó a `.albumes-more`, cada botón flotante
   circular tiene su sombra propia en Figma, no una compartida.
4. **Icono de selección en "Seleccionar fotos para añadir" 4px más grande de
   lo que toca.** `.select-overlay img` a 48px, Figma pide 44px
   (`685:8075`, check-circle dentro de una caja de 48px con 2px de aire por
   lado).

**Comprobado y correcto, sin cambios:** sombra del botón flotante de
"dentro de un álbum"/scroll-toggle/seleccionar-fotos (misma que
`.albumes-more`, coincide con Figma en los 3 nodos), estructura de la
cuadrícula de "dentro de un álbum" (gaps 16px/10px ya correctos), footer
Volver/Añadir de "seleccionar fotos" (ya usa `.btn--soft`, sombra correcta),
posición del título "Mis recuerdos" de Home (253px en Figma vs 255px actual
— 2px, no meritorio de cambio).

### `?v=N` subido

`css/registro.css` (4→5), `css/components.css` (8→9), `css/albumes.css`
(sigue en 5, incluye el fix del icono de selección de esta sesión).

---

## Registro 1 — dos bugs reales que se me habían pasado en el repaso anterior

El usuario mandó una comparación directa (captura propia al lado de Figma) y
señaló que "ni siquiera los colores" coincidían. Tenía razón — dos bugs
reales, no impresión:

1. **Fondo equivocado.** `.screen--registro` pone `--bg-app` (`#f4f6ff`,
   lavanda) en las 5 pantallas del flujo, pero **`registro-1` (590:6913) es
   la única con fondo blanco puro** en Figma — confirmado en el propio JSX
   de `get_design_context` (`bg-[var(--color/white,white)]`), dato que ya
   tenía delante en el repaso anterior y no crucé contra el CSS. El lavanda
   de fondo hacía que la foto, el título y el botón se vieran "deslavados"
   en comparación con Figma — no era percepción, era ese fondo. Arreglado
   con un override `.registro-1 { background: var(--color-white); }`, sin
   tocar `.screen--registro` (registro-2/3/4 sí llevan `--bg-app`).
2. **Título con el tamaño de fuente equivocado.** `.registro-1-title` usaba
   `--font-size-label-large` (20px) en vez de `--font-size-title-xlarge`
   (24px, el token que ya existía para "títulos del flujo de registro" —
   estaba definido en `tokens.css` pero no se usó aquí). Por eso el título
   se veía más fino/pequeño de lo que toca — esto es lo que el usuario
   describió como "los pesos no están iguales".

**Lección para no repetir el error**: en el repaso anterior de esta misma
pantalla ya se había leído `bg-[var(--color/white,white)]` y `text-[24px]`
en la respuesta de `get_design_context` (están en el JSX pegado en esa
sección de arriba), pero el repaso se centró solo en posición/ancho del
título y no se verificó color de fondo ni tamaño de fuente contra el CSS
existente — hay que comprobar SIEMPRE los 4 (posición, tamaño, color, fondo
de la pantalla), no solo el que motivó la revisión.

### Verificación

Captura nativa 393×852 de `#registro-1` tras el fix — fondo blanco, título
con el tamaño correcto, coincide con la referencia de Figma que mandó el
usuario.

### `?v=N` subido

`css/registro.css` (5→6).

---

## Border-radius de `.btn` — bug de base, no de una pantalla

El usuario preguntó "¿y el corner radius?" tras el fix de Registro 1.
Comprobando: **`.btn` (la clase base que usan Volver/Entrar/Compartir/
Permitir/Generar/Eliminar en TODA la app) llevaba `border-radius:
var(--radius-button)` = 12px** — pero every fetch de `get_design_context`
de esta sesión (Detalle foto, Álbumes, Yo, Personas, Registro, modal
Ayúdanos) muestra `rounded-[20px]` en el botón grande sin excepción. No era
un problema de una pantalla, era el token base equivocado desde siempre,
enmascarado porque cada "rediseño" de pantalla iba creando clases propias
con `1.25rem` a mano (`.nav-row .btn--vertical`, `.albumes-search-btn`,
`.yo-docs-btn`...) en vez de arreglar `.btn`, así que solo los botones
"suaves" nuevos se veían bien — los sólidos (`.btn--type2`/`.btn--type3`:
Volver, Entrar, Compartir, Permitir) llevaban 8px menos de radio en TODAS
las pantallas sin que se notara a la escala de una captura pequeña.

**Por qué no se detectó en los repasos anteriores** (Detalle foto, Álbumes,
Yo, Registro 1, esta misma sesión): se comparó posición/tamaño/sombra/color
de fondo pero no se midió el radio de esquina contra la captura — un fallo
de checklist, no de dato disponible (`rounded-[20px]` estaba en el JSX de
cada fetch, delante, sin cruzarlo).

### El arreglo real

`--radius-button` (12px) es correcto para las cajas pequeñas de
teléfono/código y el teclado numérico (confirmado contra Figma, no se
toca). Lo que estaba mal es que `.btn` usara ese mismo token — se añadió
`--radius-button-lg: 1.25rem` (20px) en `tokens.css` y `.btn` pasa a usarlo.
De paso se quitó el override redundante `border-radius: 1.25rem` de
`.nav-row .btn--vertical` (ya lo hereda de `.btn`, que ahora es correcto).

### Verificación

Capturas de Registro 1 (Entrar), Álbumes (Volver) y Detalle foto (Volver/
Compartir) tras el cambio — las 3 con la esquina visiblemente más redondeada,
coincide con Figma. Cambio de alcance amplio (afecta a cada `.btn` de la
app) pero de una sola línea en el sitio correcto — no hubo que tocar las
clases "suaves" que ya llevaban 20px a mano.

### `?v=N` subido

`css/tokens.css` (5→6), `css/components.css` (9→10).

---

## Fondo lavanda global — bug de base, otra vez (el mismo patrón que el radius)

El usuario detectó que Home tenía el mismo problema de fondo que ya se
arregló en Registro 1 ("el background es blanco a partir de la home,
incluida esa pantalla"), y mandó otra comparación aparte confirmando lo
mismo en Detalle foto. Mismo tipo de bug que el del corner radius: no era
de una pantalla, era la base — `.screen { background: var(--bg-app) }` en
`base.css` pone lavanda (`#f4f6ff`) por defecto a **todas** las pantallas.

Antes de tocar nada se comprobó pantalla por pantalla contra los
`get_design_context` ya obtenidos esta sesión (no se asumió que "todo" debía
ser blanco solo porque el usuario lo dijo en general):

- **Blanco confirmado**: Home (594:7786), Álbumes (649:7468), dentro de un
  álbum (668:9100), seleccionar fotos (685:8075), Yo (687:8356), Detalle
  foto (677:2380) — las 6 pantallas que ya han pasado por un rediseño.
- **Lavanda confirmado, no es un descuido**: Personas (425:7324) y Mis
  documentos (446:7538) — las únicas 2 pantallas de la app que **todavía no
  se han rediseñado**, Figma las mantiene con el fondo original. Registro
  2/3/4 (teléfono/código/splash) también son lavanda de verdad
  (`590:7032` confirmado), pero esas ya heredaban bien porque
  `.screen--registro` fija `--bg-app` aparte.

### El arreglo

`.screen` pasa a blanco puro (`var(--color-white)`) por defecto — ya no
`--bg-app`. Dos excepciones añadidas justo debajo, por selector de pantalla
en vez de tocar cada HTML: `[data-screen="personas"],
[data-screen="mis-documentos"] { background: var(--bg-app); }`. Registro-1
sigue con su propio override de la sesión anterior (`.registro-1`, gana por
orden de cascada dentro de `registro.css`); Registro-2/3/4 no necesitaron
tocarse, `.screen--registro` ya los deja en lavanda.

### Verificación

Capturas de Home, Yo, Detalle foto (con foto real cargada), Álbumes → fondo
blanco, coincide con Figma. Personas y Mis documentos → siguen en lavanda,
sin regresión.

### `?v=N` subido

`css/base.css` (8→9).

---

## Sombras cortadas en seco en los bordes de `.screen-content`

El usuario mandó una captura zoom (su panel de Figma + "Generar" + la
tarjeta "graduación" de Yo) señalando que las sombras se "cortaban". Se
comprobó con `getComputedStyle` que el valor de `box-shadow` en sí era
correcto (coincide con `--shadow-card`/el de `.yo-generar-wrap`) — no era un
valor equivocado, era un **recorte real**: `.screen-content` tiene
`overflow-y: auto`, y por especificación CSS eso obliga a `overflow-x` a
comportarse igual (recorte), aunque nunca se puso a propósito. Como el
contenido (la cuadrícula, "Generar") toca justo el borde izquierdo/derecho
de esa caja, la sombra —hasta 16px de blur en botones como "Generar"— se
cortaba en línea recta contra ese borde en vez de desvanecerse. Confirmado
con muestreo de píxeles: antes de esta zona era blanco puro (255) hasta el
borde exacto del elemento; con el arreglo degrada de forma continua.

**El arreglo**: en vez de `left: var(--space-page-margin); width:
calc(100% - 2*margen)`, ahora `.screen-content` usa `left:0; width:100%` +
`padding-left/right: var(--space-page-margin)` — mismo ancho de contenido
visible de siempre (el padding hace ese trabajo ahora), pero la caja que
de verdad recorta (el padding-box de `overflow-y:auto`) es ahora el lienzo
completo, dejando hueco de sobra para que cualquier sombra se desvanezca
antes de tocar el límite real. Cambio solo horizontal (no se tocó
`top`/`bottom`) para no tener que re-ajustar los varios overrides de `top`
que ya existen por pantalla (`--flush`, `[data-screen="yo"]`, etc.).

### Verificación

Muestreo de píxeles a la izquierda de "Generar" (Yo) tras el cambio:
degradado continuo 255→244 en vez de un salto brusco. Captura visual sin
cambio de posición/tamaño de ningún elemento (el padding sustituye
exactamente al `left`/`width` recortados de antes).

### `?v=N` subido

`css/components.css` (10→11).

---

## "Mis documentos" — rediseño (687:8372 / 687:8438 scroll)

Deja de ser una de las 2 pantallas sin rediseñar (la otra es Personas, que
sigue igual). Se entra desde "Mis documentos" en "Yo".

### Rediseño a medias, tal cual está en Figma — no se ha "corregido" nada

"Documentos identificativos" y el primer "Horarios" pasan a tarjeta con
**borde** (`--color-primary-blue-light`, 1px) y **radio 20px, sin sombra**
— nueva clase reutilizable `.photo-card--bordered`. "Otros documentos" y el
segundo "Horarios" (el duplicado) **se quedan con el estilo antiguo**
(sombra `--shadow-card`, radio 12px, sin borde) — confirmado en los 2 fetch
de Figma (normal y scroll), es un rediseño a medias real, no una
inconsistencia al copiarlo.

### Se recuperó una sección que faltaba

El `README.md` del proyecto ya documentaba "4 secciones tal cual Figma...
Horarios otra vez — sí, está duplicada... se dejó igual a propósito", pero
el HTML real solo tenía 3 (Documentos identificativos, Horarios, Otros
documentos) — la cuarta sección (el segundo "Horarios") se había perdido en
algún momento sin que nadie lo notara. Confirmado también con el fetch del
estado "scroll" de Figma (687:8438), que muestra las mismas 4 secciones.
Añadida de vuelta.

### Otros cambios del rediseño

- Avatar pasa a `avatar--ring` (no lo llevaba, el resto de pantallas
  rediseñadas sí).
- Fondo blanco — ya no necesita el override de lavanda que se le puso hace
  un momento en `base.css` (esa nota ahora solo aplica a Personas).
- Footer "Volver": `btn--type3` → `btn--type2 btn--icon-wide` +
  `icon-arrow-left-lighter.svg`, mismo cambio que ya se hizo en el resto de
  pantallas rediseñadas.

### Verificación

Captura del tramo visible sin scroll (Documentos identificativos + primer
Horarios, con borde) y captura forzando `scrollTop` para ver el tramo de
abajo (Otros documentos + segundo Horarios, con sombra) — ambas coinciden
con sus respectivas capturas de Figma.

### `?v=N` subido

`css/base.css` (9→10), `css/components.css` (11→12).

---

## Aviso "Eliminar foto" (687:8416) — nuevo, dentro de Detalle foto

Pantalla nueva, en realidad un velo superpuesto sobre Detalle foto (como el
menú de "seleccionar persona"), colgada del botón "Eliminar" (antes
`data-action="noop"`).

### El pollito real, no una silueta genérica

El asset ("quita el interrogante 1") solo existía en Figma como una imagen
recortada+rotada con la caja de posicionamiento propia de Figma (rotación
-63.91° aplicada sobre una caja con porcentajes de recorte no triviales) —
reproducir esa matemática exacta en CSS no compensaba. Se descargó el PNG
fuente real del servidor de Figma Dev Mode (2752×1536, con alfa), se
recortó a su bounding box real y se rotó -63.91° por código (PIL,
`Image.rotate(-63.91, expand=True)`) — incluso probando primero la
rotación contraria y comparando contra la captura de Figma para confirmar
el signo correcto antes de dar por bueno el resultado. Guardado como
`assets/img/pollito-eliminar-foto.png`. El tamaño/posición final en CSS es
ajuste a ojo iterado contra la captura (la caja de Figma no se puede
traducir 1:1 al no tener el mismo recorte de origen), no una medida exacta
— aceptado a propósito, con el mismo criterio que otros assets del pollito
recortados por código en sesiones anteriores.

### Icono y color nuevos

`icon-x-close-red.svg` descargado de Figma (`#F53D5B`, ya viene en rojo) —
no existía ningún icono de cerrar/cancelar en el proyecto. Nuevo token
`--color-error: #f53d5b` en `tokens.css` (el texto de "Cancelar" lo usa).

### Bug de base encontrado de paso: `.btn--soft` con `--lg` llevaba demasiado padding vertical

Al construir "Eliminar foto"/"Cancelar" (ambos `.btn--soft.btn--lg`), Figma
pide `py-12px`, pero `.btn--horizontal.btn--lg` da `py-20px` (pensado para
botones sólidos) y `.btn--soft` no lo corregía. Repasando los fetches ya
hechos esta sesión (Compartir de Detalle foto, Añadir de seleccionar-fotos,
"Quiero saber más" del modal Ayúdanos) confirmé que los 3 tienen el mismo
`py-12` en Figma — es decir, esos 3 botones YA construidos llevan 8px de
más de padding vertical sin que nadie lo notara. Arreglado en la base:
`.btn--soft.btn--horizontal.btn--lg { padding-top/bottom: 0.75rem; }`, no
solo en el botón nuevo.

### Cierre del velo reutiliza la navegación real, no un cierre mudo

"Cancelar"/el "Volver" propio del aviso solo quitan `is-visible`
(`js/eliminar-foto.js`, nuevo). **"Eliminar foto" usa `data-nav="back"`
tal cual** — el manejador genérico de `app.js` ya navega solo; no hace
falta lógica de "confirmar" aparte. Igual que ya hacía `PersonaSelect`,
`showScreen()` cierra este velo automáticamente al salir de detalle-foto
(`window.EliminarFoto.close()`), así que un "Eliminar foto" real (que
navega hacia atrás) y un cierre limpio son el mismo camino de código.
Sigue sin haber borrado real (no hay estado persistente de fotos en el
prototipo) pero el efecto — volver a como si la foto ya no estuviera — sí
es real, no un no-op mudo como "Compartir"/"Ajustes".

### Verificación

Chrome headless: clic real sobre una foto (abre detalle-foto) → clic real
sobre "Eliminar" → captura. Burbuja legible sin desbordar (se cambió el
`<div>` a `<p>`, el `display:flex` del contenedor no dejaba envolver el
texto de forma fiable), pollito posicionado sin tapar el texto, velo
oscuro+difuminado de fondo con la foto real visible detrás.

### `?v=N` subido

`css/tokens.css` (6→7), `css/components.css` (12→13, incluye el fix de
`.btn--soft`), nuevo `css/eliminar-foto.css?v=1`, nuevo
`js/eliminar-foto.js?v=1`, `js/app.js` (13→14).

---

## Aviso "Eliminar" compacto (692:2470) — a partir de la segunda vez

El usuario aclaró que el pollito con burbuja grande solo sale **la primera
vez** que se borra una foto en la sesión; a partir de la segunda, el aviso
pasa a una tarjeta compacta centrada — pidió explícitamente poner Detalle
foto de verdad detrás del velo (la captura que mandó tenía de fondo
"Registro 5" porque así estaba posicionado ese frame en el canvas de
Figma, no porque el aviso viva ahí).

**Cero CSS nueva**: esta tarjeta es estructuralmente idéntica al modal
"Ayúdanos" de Registro (blanca, 40px de radio, 344px, mismo
padding/gap) — se reutilizan sus clases tal cual
(`.registro-modal-overlay`/`.registro-modal`/`.registro-modal-title`/
`.registro-modal-body`/`.registro-modal-actions`), solo cambia el
contenido y ambos botones son `.btn--soft` (antes uno era sólido). Mismo
criterio de reutilización que ya se ha aplicado toda la sesión.

`js/eliminar-foto.js` guarda un flag en memoria (`hasShownPollito`, no
persiste entre recargas — es un prototipo de sesión, no hace falta más) y
decide cuál de los dos avisos mostrar al pulsar "Eliminar". Ambos botones
"Eliminar"/"Eliminar foto" siguen usando `data-nav="back"` real;
`EliminarFoto.close()` cierra los DOS velos al salir de detalle-foto, no
solo el que estuviera abierto.

### Verificación

Chrome headless: clic real en una foto → "Eliminar" (sale el pollito) →
"Cancelar" (cierra) → "Eliminar" otra vez → sale la tarjeta compacta con
Detalle foto real difuminado detrás. Coincide con la captura de Figma.

### `?v=N` subido

`js/eliminar-foto.js` (1→2).

---

## Auditoría contra el componente maestro "Button" (Assets, 446:5425)

El usuario pidió revisar que todo use "los componentes bien puestos",
señalando la página "Assets" de Figma (el componente maestro real, con
todas las variantes de Button/Header/Icon button/Footer en un mismo sitio
— no una pantalla, la librería de la que salen todas). Se comparó cada
variante (Type=1/2/3/Create × Big/pequeño × Horizontal/Vertical) contra las
clases del proyecto.

**Hallazgo real**: `.btn--type1` en `components.css` no tenía ningún uso en
el HTML (comprobado con `grep`) y encima su definición (azul oscuro sólido)
**no correspondía a ninguno de los 3 tipos reales** del componente maestro.
El "Type=1" de verdad (fila 2 de la captura de Assets: fondo blue-lighter +
borde + `shadow-button-light`) es exactamente lo que aquí ya se llama
`.btn--soft` — es decir, todos los botones "suaves" construidos esta sesión
(y en sesiones anteriores) ya eran el Type=1 correcto del sistema de
diseño, solo que bajo un nombre distinto. Corregida la definición de
`.btn--type1` para que coincida de verdad (sin efecto visual, al no
usarse), dejando anotado que no se ha migrado el proyecto a renombrar
`.btn--soft` → `.btn--type1` — sería un cambio grande sin beneficio visual,
mismo criterio de no arriesgar regresión que ya rige `.btn--soft`.

**Confirmado correcto, sin cambios** (contra el componente maestro):
`.btn--type2` (Type=2 real: azul sólido) y `.btn--type3` (Type=3 real:
blue-light plano, sin borde) coinciden exactamente; el patrón "Type=Create"
(doble capa + borde discontinuo) ya está bien replicado en
`.albumes-new-wrap/-btn`, `.album-grid__add-wrap/-btn` y
`.yo-generar-wrap/-btn`; el "Icon button" Default (círculo suave, sombra
`rgba(221,221,225,.3)/#e9e9ee`) ya se corrigió esta misma sesión en
`.carousel-next/-prev`; el "Footer" de 2 botones (Volver sólido a la
izquierda + suave a la derecha) coincide con todos los footers de 2
botones ya construidos. El estado "Icon button" Secondary (círculo azul
sólido) y varias combinaciones pequeñas/verticales del Button maestro no
tienen ningún uso real en el prototipo todavía — no hay nada que
comprobar hasta que aparezcan en una pantalla de verdad.

### `?v=N` subido

`css/components.css` (13→14, solo el fix de `.btn--type1`, cero impacto
visual).

---

## Álbumes — bug real que se me había pasado 2 veces, encontrado con diff de píxeles de verdad

El usuario insistió en que Álbumes no coincidía, tras ya haber "arreglado"
gradiente/spacing en una revisión anterior de esta misma pantalla. Esta vez,
en vez de comparar a ojo dos capturas a escalas distintas (lo que ya había
llevado a falsas alarmas antes en esta sesión), tenía acceso directo al
archivo real que el usuario exportó de Figma
(`~/Downloads/02.1.1a_Álbumes.png`, 786×1704, exactamente 2x de 393×852) —
así que se pudo hacer una captura propia a la MISMA escala exacta
(`--force-device-scale-factor=2`) y un **diff de píxeles real**
(`PIL.ImageChops.difference` + numpy), no una comparación visual.

El diff amplificado mostró **texto duplicado/fantasma** (dos líneas
superpuestas, desplazadas ~12-14px verticalmente) en "Mis álbumes" y en
"Todas tus fotos"/"104 fotos" — nada de esto se ve a ojo en una captura
normal, pero en el diff es inconfundible. Causa: `.screen-content` seguía
en el top genérico (255px) para esta pantalla — nunca se le puso el
override a 241px que sí lleva Yo, aunque el dato (top-[241px] del
contenedor 649:7469) ya estaba confirmado desde el primer fetch de esta
pantalla en esta misma sesión. Arreglado con
`[data-screen="albumes"] .screen-content { top: 15.0625rem; }`.

**Confirmado que NO eran bugs** (con el mismo diff, antes de tocar nada):
la sombra/color del "asomo" del álbum-stack (el verdoso que parecía raro a
ojo en capturas anteriores es real en la propia foto de Figma, confirmado
descargando su asset — ya se sabía de una sesión anterior, este diff solo
lo reconfirma), tamaño y posición de "Álbum nuevo"/"Buscar"/"Volver" (los
único que sale en el diff ahí es ruido de antialiasing en el borde, normal
entre dos motores de render distintos).

**Nota de método, para no repetir el error de antes**: cuando el usuario
adjunte una imagen con "source:" apuntando a un archivo real (no solo un
recorte pegado), comprobar primero si es legible por `Bash`/`PIL`
directamente (funciona para rutas normales como `~/Downloads`, aunque NO
para rutas `TemporaryItems` del propio screenshot util de macOS, que sí
están bloqueadas) — un diff de píxeles real es muchísimo más fiable que
comparar dos capturas a ojo a escalas distintas, que ya dio falsos
positivos y negativos varias veces en esta sesión.

### Verificación

Diff antes: media de diferencia ~24/23/20 por canal (con fantasma de texto
visible). Diff después del fix: ~16/15/12, sin ningún fantasma de texto —
solo queda ruido de borde esperable en fotos/bordes redondeados.

### `?v=N` subido

`css/albumes.css` (5→6).

---

## `.bottom-fade` — nunca debía ponerse sólido del todo

El usuario señaló, con el componente maestro "Footer" de Figma (677:2460)
delante: "el footer tiene opacidad siempre" — es decir, en Figma el fondo
del footer **nunca llega a ser 100% opaco**, se queda como mucho al 75%
blanco (con cristal esmerilado, `backdrop-blur: 10px`, detrás), mientras
que `.bottom-fade` aquí hacía justo lo contrario: pasaba de transparente a
**sólido al 100%** (`var(--bg-app)`) a partir del 55% de su altura. Bug
real, compartido por las 6 pantallas que usan `.bottom-fade` (Álbumes,
Álbum-detalle, Álbum-seleccionar, Personas, Mis documentos, Yo) — un solo
sitio, arreglado una vez.

**El arreglo** reproduce el degradado real del componente maestro tal
cual (`rgba(255,255,255,.75)` al 74.748%, `.38` al 88.293%, `0` al
97.472%, dirección `to top`) más el `backdrop-filter: blur(10px)` que
faltaba del todo. Blanco fijo, no `--bg-app` — así lo lleva Figma en
cualquier pantalla, sea blanca o lavanda por debajo (Personas).

### Verificación

Forzado `scrollTop` al final de "Mis documentos" (única pantalla con
contenido de sobra para que algo quede detrás del footer) — las fotos de
"Horarios" se ven difuminadas y semitransparentes justo detrás del botón,
en vez de recortadas en seco contra un bloque sólido.

### `?v=N` subido

`css/components.css` (14→15).

---

## El fix del fade no se veía — la causa real era otra, más de fondo

El usuario mandó otra captura: seguía cortándose en seco, sin blur ni
opacidad visible, a pesar del arreglo anterior. Comprobado con
`getComputedStyle` en vivo: el degradado y el `backdrop-filter: blur(10px)`
**sí estaban aplicados correctamente** — el CSS del fix anterior no tenía
ningún error. El problema real estaba en otro sitio: `.screen-content`
(el contenedor con scroll) tenía `bottom: 8.625rem` — **exactamente el
mismo límite de 138px que `.bottom-fade`**. Medido con
`getBoundingClientRect()`: el contenido se recortaba en seco por el propio
`overflow-y:auto` justo donde EMPIEZA la zona del degradado, así que
cuando `.bottom-fade` pintaba encima, ya no quedaba ningún píxel de foto
debajo que difuminar — el corte duro pasaba antes, en un sitio distinto e
invisible a simple vista (el límite de recorte del scroll, no el propio
degradado).

**El arreglo real**: `.screen-content` pasa a `bottom: 0` (antes
`8.625rem`) — el contenido puede desplazarse hasta tocar el borde de
verdad de la pantalla, y es `.bottom-fade` (que pinta por encima con
`z-index`) el único que lo apaga con blur+degradado, no un recorte del
propio contenedor. Mismo criterio que ya se aplicó al bug de sombras
cortadas de hace unos mensajes (ese fue en el eje horizontal; este es el
mismo problema en el eje vertical, contra el borde inferior).

### Verificación

`getBoundingClientRect()` antes del fix: la última tarjeta de álbum
terminaba en 735.6px pero `.screen-content` cortaba en 709.7px — 26px de
la tarjeta invisibles antes de que el degradado pintara nada. Captura
recortada y ampliada de la zona tras el fix: la foto ahora se difumina de
verdad contra el fondo blanco antes de llegar al botón "Volver", en vez de
cortarse en línea recta.

### `?v=N` subido

`css/components.css` (15→16).

---

## Corrección sobre la corrección: `bottom:0` fue demasiado lejos

El usuario mandó la referencia real de Figma para este mismo estado (2
álbumes, sin scroll): la tarjeta termina **nítida y redondeada del todo**,
con un hueco limpio antes de "Volver" — **sin ningún blur visible sobre la
foto**. El `bottom:0` del mensaje anterior sobrecorrigió: dejaba que el
contenido se metiera bien dentro de la franja de `.bottom-fade` (138px),
así que ahora SÍ se veía difuminado — pero de más, tapando parte de la
propia tarjeta en vez de solo el hueco vacío de después.

**La cuenta que faltaba**: el degradado real de `.bottom-fade` (stops
74.748/88.293/97.472%) solo hace algo en el **primer ~25% de su propia
franja de 138px** (~35px) — el resto (hasta donde está el botón) es un
75% blanco constante. Y el botón "Volver" empieza siempre en 738px de una
pantalla de 852px, es decir, a **114px del borde** — no 138px (donde
empieza toda la franja de `.bottom-fade`) ni 0 (el borde de verdad).
`.screen-content` pasa a `bottom: 7.125rem` (114px): el contenido puede
llegar justo hasta donde arranca el botón (como en Figma, que dan casi
exactamente coincide top-a-top), sin meterse dentro del tramo de blur de
`.bottom-fade`.

### Verificación

Captura recortada y ampliada tras el cambio: la tarjeta vuelve a terminar
con su esquina redondeada completa y nítida, hueco limpio antes de
"Volver" — coincide con la referencia de Figma que mandó el usuario.

### `?v=N` subido

`css/components.css` (16→17).

---

## Nota de continuidad — reconexión de sesión, `.bottom-fade` siguió afinándose hasta v26

La sesión se cortó (login interrumpido) justo después del fix de arriba y
se retomó más tarde con el archivo ya en `components.css?v=26` — hubo más
iteración sobre `.bottom-fade` de la que queda registrada paso a paso
aquí (no hay memoria fiable de esos pasos intermedios, así que no se
inventan). Estado final verificado con captura real al retomar:

- `.screen-content` y `.bottom-fade` comparten `bottom: 7.125rem` (114px,
  donde empieza el botón "Volver"/"Entrar"/etc. de verdad).
- `.bottom-fade` ya no depende de `backdrop-filter` (que no se notaba de
  forma fiable) — es un degradado blanco de 5 paradas
  (85%→60%→30%→8%→0%) estirado a `height: 9rem`, viviendo justo encima
  del botón, no sobre la propia tarjeta.
- Resultado confirmado con captura: la tarjeta termina redondeada y
  nítida, con un desvanecido suave hacia blanco en su tramo final, sin
  corte duro ni velo excesivo — coincide con lo que pidió el usuario.

Si una sesión futura toca `.bottom-fade` otra vez: el número de verdad que
importa es el `top` del botón inferior (738px en una pantalla de 852,
siempre igual en toda la app) — el resto de valores salen de ahí.

---

## El footer seguía "cortado" — causa real: dos capas separadas, no una

El usuario mandó capturas concretas: en la zona entre la tarjeta y
"Volver" se veía un corte, como si hubiera "varios backgrounds distintos"
— fondo blanco liso justo antes del botón, sin ninguna textura de foto
asomando, cuando la referencia de Figma sí muestra el asomo (el "peek" del
álbum-stack) atenuado pero visible ahí.

**Causa real, medida con `getBoundingClientRect()`**: `.bottom-fade`
(v26, la iteración de la sesión anterior) vivía SOLO por encima del botón
(`bottom: 7.125rem` + `height: 9rem`, zona 594-738px) — es decir, ya no
cubría el hueco DETRÁS del propio botón en absoluto. Como el asomo real
del álbum-stack cae justo en el borde de esa franja (~705-730px), el
degradado (que empezaba en 85% de opacidad y subía) lo tapaba casi del
todo antes de que hubiera arrancado a difuminar nada — de ahí el "corte":
foto→(degradado que ya lava)→BLANCO LISO SIN CAPA→botón, dos capas
inconexas en vez de una continua.

**El arreglo de verdad**: `.bottom-fade` vuelve a cubrir la franja
COMPLETA (`bottom:0; height:8.625rem`, 138px, incluido el hueco detrás del
botón) como una sola capa continua — el botón (`z-index:10`) se sigue
pintando encima sin problema. Tope de opacidad real de Figma (75%, no el
85% que se probó en la iteración anterior y que ya dejaba el asomo plano)
para que el "peek" del álbum siga viéndose, aunque atenuado, en vez de
lavado a blanco puro.

### Verificación

Captura recortada y ampliada de la misma zona: el asomo del álbum-stack
vuelve a verse (atenuado) justo antes de "Volver", en vez de un bloque
blanco liso sin textura — coincide con las capturas de referencia que
mandó el usuario. Comprobado también en Yo (sin regresión, ahí las fotos
ya terminaban bastante por encima del botón, así que no había nada que
tapar).

**Pendiente**: el usuario mencionó que el Header (arriba) tiene el mismo
problema, pero no llegó a mandar capturas de eso — anotado para revisar,
mismo mecanismo esperable (`.top-fade` con el mismo tipo de hueco), pero
NO tocado todavía porque arreglarlo bien requiere cambiar el `top` de
`.screen-content` (que si se toca a pelo desplaza visualmente el título) y
eso ya no es un ajuste de bajo riesgo como el del footer.

### `?v=N` subido

`css/components.css` (26→27).

---

## El degradado tenía la dirección invertida — se tenía el dato equivocado desde el principio

El usuario volvió a marcar la misma zona (foto → botón → home-bar) como
mal, esta vez con dos pruebas: una captura con la parte blanca rodeada a
mano, y **una captura del propio panel de Figma con el fill real** de ese
componente (3 stops: 76%→blanco 100%, 90%→blanco 50%, 100%→blanco 0%,
degradado de arriba a abajo). Comparado contra lo que se llevaba usando
toda la sesión (el "Footer" de la página Assets, node 677:2460:
74.748%→75%, 88.293%→38%, 97.472%→0%, degradado expresado "to top") —
convertidos ambos a las mismas coordenadas físicas (de la foto hacia
abajo), **son prácticamente opuestos**:

- Lo que se tenía (Assets): opaco al 75% (nunca más) justo detrás del
  botón, aclarándose hacia la foto.
- Lo real (panel de Figma, esta instancia): **sólido al 100%** desde la
  foto hasta bien pasado el botón (76% de la caja), y el desvanecido de
  verdad pasa en el último tramo, hacia la home-bar — justo al revés.

**Conclusión**: el componente maestro de Assets que se usó como fuente de
verdad desde media sesión atrás **no coincide con la instancia real** de
esta pantalla — puede que esté desactualizado en el archivo, o que la
instancia real tenga un override que Assets no refleja. A partir de ahora,
ante una duda de fill/sombra/color, el panel de propiedades de una
instancia real (si el usuario lo manda) pesa más que el componente
maestro de Assets.

Con la dirección correcta, esto además **encaja con la referencia
"nítida, sin blur" que el usuario ya había mandado dos mensajes antes**:
como el 76% inicial es sólido, la foto/asomo del álbum-stack queda
tapado del todo justo al llegar al footer — de ahí que esa referencia se
viera limpia y sin ninguna mezcla, no por casualidad.

### Verificación

Captura recortada: la tarjeta termina nítida contra un hueco blanco limpio
(sin asomo tapado a medias, sin degradado raro) antes de "Volver" — y el
tramo entre el botón y la home-bar, aunque no se aprecia gran diferencia
visual sobre fondo ya blanco, lleva ahora el desvanecido real en vez de un
corte a pelo.

### `?v=N` subido

`css/components.css` (27→28).

---

## `.bottom-fade` eliminado — sobraba

Con el fill real aplicado, el resultado era blanco sólido en casi toda la
caja (76% de 138px) — indistinguible a ojo del fondo blanco de la propia
pantalla. El usuario, viendo que no se notaba ninguna diferencia real,
pidió quitar el componente entero en vez de seguir afinándolo. Eliminados
los 6 `<div class="bottom-fade"></div>` del HTML y la regla en
`components.css` (se deja un comentario con el fill exacto por si hace
falta recuperarlo más adelante). `.screen-content` se queda con su
`bottom: 7.125rem` tal cual (ese valor ya era correcto de forma
independiente — es donde empieza el botón, no algo atado al fade).

### Verificación

Captura de Álbumes: tarjetas nítidas, hueco limpio, botón sólido — coincide
con la referencia "así debería verse" que el usuario ya había mandado.

### `?v=N` subido

`css/components.css` (28→29).

---

## `.bottom-fade` recuperado — el usuario mandó el CSS real del inspector de Figma

El mensaje anterior ("elimina ese componente") no era "quítalo para
siempre" — era "lo que tienes está mal, te doy el bueno". El usuario
mandó el CSS **copiado tal cual del inspector de Figma** (node 738:1768,
no un panel de Fill interpretado a ojo como la vez anterior):

```
padding: 32px 20px 40px 20px;
background: linear-gradient(0deg, rgba(255,255,255,.75) 74.75%,
  rgba(255,255,255,.38) 88.29%, rgba(255,255,255,0) 97.47%);
backdrop-filter: blur(10px);
```

`linear-gradient(0deg, ...)` en CSS real equivale a `to top` — **esto es
literalmente lo que ya se tenía en el primerísimo intento de esta sesión**
(74.748/88.293/97.472%, 75%/38%/0%), antes de todo el vaivén de mensajes
posteriores. El diagnóstico de "dirección invertida" de dos mensajes atrás
era el equivocado (se basaba en leer a ojo las posiciones de los tiradores
en una captura del panel de Fill, no en el CSS real) — la dirección
correcta era la de siempre. Lo que sí seguía sin arreglar entonces era el
`backdrop-filter: blur(10px)`, que se había perdido por el camino.

Recuperados los 6 `<div class="bottom-fade">` (todas las pantallas
rediseñadas excepto Personas, que sigue con el footer antiguo sin este
componente) y la regla CSS con el gradiente + blur reales.

**Lección para no repetir esto una tercera vez**: ante una propiedad de
Figma dudosa, pedir el CSS copiado del inspector (botón "</> Code" o
similar) en vez de una captura del panel de Fill — el CSS es texto
literal, sin margen de interpretación de dónde cae cada tirador.

### Verificación

Captura recortada: el asomo del álbum-stack se ve suavemente difuminado
justo antes de "Volver", degradado natural en vez de un corte — coincide
con el CSS real.

### `?v=N` subido

`css/components.css` (29→30).

---

## Rehecho de cero: Footer + Header, con los nodos reales de Figma confirmados

El usuario pidió explícitamente "rehazlos de 0 para evitar problemas" (el
footer y el header). Esta vez, en vez de seguir parcheando sobre el
histórico de intentos, se fue a buscar los datos reales por
`get_design_context`/`get_metadata` directamente:

- **Footer**: `get_design_context` sobre `738:1768` (la instancia real que
  el usuario dejó en el canvas de Assets) confirma BYTE A BYTE el CSS que
  ya había pasado a mano el mensaje anterior — gradiente `to-t`
  (74.748/88.293/97.472%, .75/.38/0), `backdrop-blur(10px)`, 140px de
  alto. Ya estaba bien desde el mensaje anterior, solo se confirmó.
- **Header**: `get_design_context` sobre `619:1806` (Type=Label del
  componente maestro "Header" de Assets — este SÍ resultó fiable, el
  problema de la vez pasada era leer mal un panel de Fill, no que el
  maestro estuviera desactualizado) confirma `.top-fade` tal cual ya
  estaba en el CSS: gradiente `to-b` (65.191/81.772/96.403%, .7/.35/0),
  SIN blur (`backdrop-blur-[0px]`, a propósito), 135px de alto.

### El problema de fondo (para los dos): `.screen-content` nunca se solapaba con ninguna de las dos franjas

Igual que se encontró para el footer hace unos mensajes, `.screen-content`
tampoco se solapaba nunca con `.top-fade` (top:255/241/139 vs franja
0-135px) — el header nunca tuvo nada real que difuminar. Arreglado con el
mismo patrón que el footer, esta vez simétrico de verdad:
`.screen-content` pasa a `top:0` / `bottom:0` en la regla base, con
`padding-top`/(ya sin padding-bottom, el bottom no lo necesitaba) para
que el contenido siga empezando exactamente donde tocaba (255/241/139px
según pantalla) — los 3 overrides de `top` que había por pantalla
(`albumes.css`, `yo.css`, y los dos de `album-detalle`/`album-seleccionar`)
pasan a ser overrides de `padding-top` en su lugar.

### Regresión real encontrada y arreglada durante la propia verificación

Personas es la única pantalla sin `.top-fade`/`.bottom-fade` (no está
rediseñada) — con el `top:0`/`bottom:0` genérico nuevo, su contenido dejó
de recortarse contra el header/footer sin tener ninguna capa que lo
disimulara: se veían fotos superpuestas directamente con el botón
"Volver" en medio del scroll, feo de verdad. Arreglado con un override
específico solo para Personas (en `base.css`, junto al resto de
excepciones de esa pantalla) que vuelve al recorte de toda la vida
(`top:139px`, `bottom:114px`, sin depender de ninguna capa de difuminado).

### Verificación

Capturas de Home/Álbumes/Yo/Mis documentos: sin regresión, títulos en su
sitio exacto de siempre. Personas: comprobado aparte, ya no se ve el
amasijo de fotos+botón superpuesto. Forzando scroll en Mis documentos
(scrollTop:200, para que el título empiece a pasar bajo la cabecera):
muestreo de píxeles confirma que el fondo SÍ se aclara de verdad ahí
(tonos apagados/pálidos, no el color crudo de la foto) — la primera
impresión a ojo de "no hace nada" fue un espejismo del preview a tamaño
pequeño, no una medida real (ya pasó antes esta sesión, apuntado para no
repetirlo: medir en píxeles antes de fiarse de mirar una captura chica).

### `?v=N` subido

`css/components.css` (30→31), `css/albumes.css` (6→7), `css/yo.css`
(1→2), `css/base.css` (11→12).

---

## El "corte seco" que quedaba: `backdrop-filter` no sigue la opacidad del color

Con el resto ya dado por bueno, el usuario señaló un detalle puntual: en
el borde SUPERIOR de `.bottom-fade` (donde el degradado de color ya llega
a 0% de opacidad) seguía viéndose un corte — no de color, de **blur**.
`backdrop-filter` no seencoge con la opacidad del `background` del mismo
elemento: aunque el color ya sea transparente ahí, el desenfoque en sí
existe/no existe de golpe justo en el límite rectangular de la caja (un
"acantilado" de blur), un efecto conocido de `backdrop-filter` que no
tiene que ver con los stops del gradiente de color.

**El arreglo**: `mask-image` (con `-webkit-` para Safari) sobre el propio
`.bottom-fade`, con el mismo degradado y los mismos stops que el
`background` (74.75/88.29/97.47%) — así el blur Y el color se apagan
juntos, gradualmente, en vez de que el color se desvanezca solo y el blur
se corte aparte.

### Verificación

Captura recortada de la zona: transición suave sin línea visible. Muestreo
de píxeles en el borde exacto de la caja: el salto brusco que aparece ahí
es el borde normal (con antialiasing de 1px) de la propia tarjeta
redondeada del álbum, no un artefacto del blur — se comprobó
deliberadamente para no dar por buena una lectura a ojo sin medir.

### `?v=N` subido

`css/components.css` (31→32).

---

## Footer dado por bueno — solo un ajuste fino de posición

Con el footer confirmado como correcto, el usuario pidió bajar un pelín el
botón "Volver" (`.bottom-action`/`.bottom-action-row`, `bottom: 2.875rem`
→ `2.375rem`, 8px) y nada más — cambio puntual, sin tocar el resto del
footer/header ya cerrado.

### `?v=N` subido

`css/components.css` (32→33).

---

## Pulido del Header — mismo repaso que el footer

Con el footer ya cerrado, se revisó `.top-fade` con el mismo rigor:

- **Opacidad de los stops mal**: `.7`/`.35` en vez de `.75`/`.38` (los
  valores reales de 619:1806, ya confirmados esta sesión) — diferencia
  pequeña pero real, corregida.
- **Blur**: el Header real lleva `backdrop-blur:0px` a propósito (a
  diferencia del footer) — `.top-fade` ya estaba así, no hacía falta la
  máscara para el "acantilado" de blur que sí hizo falta en el footer
  (aquí no hay blur que recortar).
- **z-index**: avatar (15) y título (16) ya estaban por encima de
  `.top-fade` (6) desde antes — comprobado, no hacía falta tocar nada.
- **Solape con `.screen-content`**: ya arreglado en el pase anterior
  (`top:0` + `padding-top` compensando), comprobado que sigue en pie.

Verificado con scroll forzado en Mis documentos: las fotos SÍ se atenúan
detrás de "9:41"/avatar/título, aunque el efecto es sutil sobre fotos ya
claras (carné con fondo blanco) — coincide con que el propio tope real de
Figma es 75%, no un lavado fuerte.

### `?v=N` subido

`css/components.css` (33→34).

---

## No era el CSS — era mi propio método de verificación con scroll

El usuario mandó una comparación con la MISMA foto en ambos lados (antes
había comparado fotos distintas) y propuso invertir el degradado del
header como el del footer. Antes de tocar el CSS otra vez, se comprobó a
fondo por qué mis capturas de scroll nunca mostraban el efecto —
y resultó ser un **bug real de esta build de Chrome headless, no del
CSS**: forzar `scrollTop` desde un listener de `load` (con `setTimeout`
detrás) y luego pedir `--screenshot` por CLI deja el `scrollTop` bien
puesto en JS (confirmado con `getBoundingClientRect`/`scrollTop` — sí
cambia), pero el **frame capturado no se repinta con el nuevo scroll**:
la imagen sale idéntica a como si nunca se hubiera scrolleado, aunque el
propio DOM diga lo contrario. Pasó en TODAS las pruebas de scroll de esta
sesión (footer y header), así que varias conclusiones de "no se nota
nada" pueden haber sido este bug, no el CSS de verdad.

**El arreglo del método** (no del CSS): fijar `scrollTop` en
`DOMContentLoaded` (no en `load`+`setTimeout`, que llega después del
primer pintado) + flag `--run-all-compositor-stages-before-draw` en el
propio Chrome headless. Con esto sí se ve el scroll real en la captura.

**Con el método arreglado**, la foto de "B+"/mujer scrolleada hasta la
cabecera SÍ se ve difuminada de verdad cerca de la barra de estado,
aclarándose hacia el cartel "B+" — coincide con la referencia de Figma
que mandó el usuario. **No hizo falta cambiar el CSS del header en
absoluto** — ya estaba bien desde que se corrigió la opacidad exacta
(.75/.38/0) hace un par de mensajes; lo que fallaba era poder verlo.

**Para no repetir esto**: si una prueba de scroll en Chrome headless "no
muestra nada", sospechar primero del propio método de captura (probar
`DOMContentLoaded` + `--run-all-compositor-stages-before-draw`) antes de
tocar CSS que ya está verificado contra datos reales de Figma.

---

## El usuario insistió: quiere el mismo blur que el footer, aunque Figma diga 0px

Con el método de scroll ya arreglado, el usuario mandó una captura real
del navegador (no una prueba mía) y confirmó que sigue sin ser lo que
quiere: pidió explícitamente que `.top-fade` lleve el mismo desenfoque que
`.bottom-fade`, **aunque el CSS real de Figma para el header diga
`backdrop-filter: blur(0px)`** (confirmado 4 veces esta sesión). Se
preguntó explícitamente antes de tocarlo, dado que es una decisión de
diseño que se aparta a propósito del dato literal, no un error de lectura.

Añadido `backdrop-filter: blur(10px)` + la misma técnica de `mask-image`
que ya usa `.bottom-fade` (mismos stops que el degradado de color, para
que el blur se apague junto con el color en vez de cortarse en seco en el
borde de la caja).

### Verificación

Con el método de scroll corregido (`DOMContentLoaded` +
`--run-all-compositor-stages-before-draw`): la foto ahora se ve
genuinamente desenfocada (no solo aclarada) cerca de la barra de estado,
con la misma calidad de "cristal esmerilado" que ya tenía el footer.

### `?v=N` subido

`css/components.css` (34→35).

---

## Blur a 7px + `.top-fade` más alto (línea marcada + terminaba pronto)

Dos ajustes pedidos juntos: bajar el blur de 10 a 7px (footer y header,
para que sigan iguales), y en el header en concreto — el usuario señaló
una **línea muy marcada** donde terminaba el desvanecido, y que debía
"acabar un poco más bajo". Con 135px de alto (la medida real del
componente Header de Figma), el color+blur+máscara pasaban de opaco a
transparente en muy poca distancia física, y esa transición rápida se
percibía como un corte en vez de una mezcla — y de paso terminaba pronto
sobre la foto.

**El arreglo**: `.top-fade` sube de 135px a 176px de alto, con las MISMAS
paradas en % que Figma (65.191/81.772/96.403%) — la forma del degradado
no cambia, solo se reparte sobre más píxeles reales, lo que lo hace
automáticamente más gradual y lo baja más sobre la foto. Mismo criterio
que ya se usó para el footer cuando se descubrió el problema de
proporción/física en vez de solo la fórmula del degradado.

### Verificación

Con el método de scroll corregido: sin línea visible, transición
continua entre la zona difuminada y la foto nítida de debajo — coincide
con la referencia.

### `?v=N` subido

`css/components.css` (36→37, incluye el blur a 7px de ambas capas y la
altura nueva de `.top-fade`).

---

## La "raya" seguía ahí — causa real: el borde de la propia tarjeta, no el degradado

El usuario mandó una captura recortada muy de cerca: seguía viendo una
línea marcada, aunque ya no en el mismo sitio que antes de subir la
altura a 176px. Antes de tocar más números a ciegas, se midió con
`getBoundingClientRect()` dónde termina de verdad la primera fila de la
cuadrícula: **169px**. Con `.top-fade` a 176px, ese borde caía justo en
la cola final del degradado (cerca del 100%, donde el blur ya casi no
hace nada) — así que el borde/sombra propio de esa tarjeta pasaba de
"casi sin difuminar" a "nada difuminado" de golpe al entrar en la
segunda fila, y ESO es lo que se veía como línea — no un fallo del
degradado en sí, sino que su tramo de "casi apagado" coincidía con un
borde estructural real (la tarjeta), delatándolo.

**El arreglo real**: subir `.top-fade` a 272px, para que el tramo
0–65.191% (blur al máximo, constante) llegue de sobra más allá de esos
169px — así el desvanecido de verdad pasa dentro de la SEGUNDA fila, sin
ningún borde de tarjeta justo en ese punto que lo delate. Se probó antes
"terminar la máscara en 100% en vez de 96.403%" (por si el tramo muerto
final era la causa) — no cambió nada, confirmando que el problema nunca
fue ESE detalle sino la altura insuficiente.

### Verificación

Con el método de scroll corregido: fila 1 completamente difuminada,
fila 2 empieza pálida y se aclara con normalidad hacia abajo, sin ningún
salto visible en la unión entre filas.

### `?v=N` subido

`css/components.css` (38→39).

## `.top-fade` — la línea volvió (3ª vez): el problema nunca fue la altura, era la forma del degradado

Tras subir `.top-fade` a 272px, el usuario mandó otra captura: seguía
viendo una línea marcada, esta vez atravesando el CENTRO de la primera
foto (no en el borde entre fila 1 y fila 2). Ya no cuadraba con la
teoría anterior ("coincide con un borde de tarjeta") — no hay ningún
borde estructural a mitad de una foto.

**Causa real**: el degradado de 3 paradas (75%→38%→0%, en 65.191% /
81.772% / 100%) tiene un tramo intermedio con una pendiente distinta a
la del tramo final — es decir, la RECTA cambia de inclinación dos
veces (en cada parada). Un degradado lineal con más de 2 paradas tiene
tantos "quiebros" (cambios bruscos de pendiente) como paradas
intermedias, y el ojo detecta esos quiebros como una línea en cuanto se
combinan con blur — daba igual cuánto se subiera la altura, porque el
quiebro viaja CON el degradado, no es un problema de dónde cae respecto
a la cuadrícula.

**El arreglo real**: sustituir el degradado de 3 paradas por uno de
solo 2 (0% → 100%, un único tramo, sin ningún punto donde la pendiente
cambie — matemáticamente no puede haber quiebro con solo 2 paradas).
Aplicado igual al `background` (color) y al `mask-image`/
`-webkit-mask-image` (blur), para que ambas capas se apaguen exactamente
igual. Además se subió la altura de 272px a 320px, tal y como pidió el
usuario ("súbelo un poco").

```css
.top-fade {
  height: 20rem; /* 320px */
  background: linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 100%);
  backdrop-filter: blur(7px);
  mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
  /* + -webkit- de ambas */
}
```

Esto ya no reproduce el degradado literal de Figma (que sí tiene un
tramo plano al 75% antes de empezar a bajar) — es una simplificación
deliberada para eliminar el quiebro. Coherente con la decisión ya
tomada en esta misma sesión de dar prioridad a que el header "se vea
igual de bien que el footer" por encima de copiar el valor literal de
Figma.

### Verificación

Con el método de scroll corregido (`DOMContentLoaded` + scrollTop=260 +
`--run-all-compositor-stages-before-draw`), captura recortada y
ampliada 2x sobre la unión entre fila 1 y fila 2 de "dentro de un
álbum": desvanecido continuo, sin ningún salto ni línea visible en
ningún punto.

### `?v=N` subido

`css/components.css` (39→40).

## `.top-fade` — el degradado de 2 paradas quitó la línea pero se veía "muy transparente"

El usuario confirmó que la línea había desaparecido, pero el conjunto se
veía mucho más débil que antes de tocar nada. Causa: una recta pura de
2 paradas (0%→100%) pierde fuerza desde el primer píxel — al bajar en
línea recta, en la mitad de la altura ya está a la mitad de opacidad,
mientras que el diseño original se mantenía casi al máximo (0.75) durante
gran parte de la zona y solo caía del todo cerca del final.

**El arreglo real**: no volver al degradado de 3 paradas (eso reproduce
la línea), sino aproximar una curva "ease" suave con 9 paradas
(0%, 12.5%, 25%... 100%) siguiendo `0.5·(1+cos(π·t))` — matemáticamente
sin ningún cambio de pendiente brusco en un único punto (a diferencia
del de 3 paradas, que tenía 2 quiebros marcados), pero que se mantiene
fuerte cerca de arriba y decae progresivamente, en vez de cayer en línea
recta desde el primer píxel. Pico subido también de 0.85 a 0.9.

### Verificación

Mismo método de scroll corregido, captura ampliada 2x sobre la unión
entre fila 1 y fila 2: sigue sin verse ninguna línea, y la zona superior
(barra de estado + primera fila) se ve claramente más opaca/difuminada
que con el degradado de 2 paradas, en línea con el aspecto original.

### `?v=N` subido

`css/components.css` (40→41).

## `.top-fade` — bajar la altura de 320px a 224px sin que vuelva la línea

El usuario mandó una captura del footer (que siempre se vio bien) como
referencia de "opacidad y blur correctos", y explicó que 2 versiones
atrás (272px, degradado de 3 paradas) la fuerza ya estaba bien, pero se
había "tirado demasiado el degradado hacia abajo" — tapaba más zona de
fotos de la cuenta, además de tener la línea.

Confirmación clave para este ajuste: la línea la causaba la FORMA del
degradado (el quiebro de pendiente de las 3 paradas), no la altura — así
que se podía bajar la altura sin miedo a que reapareciera, siempre que
se mantuviera la curva suave de 9 paradas ya validada.

**El arreglo real**: bajar `.top-fade` de 320px a 224px, sin tocar la
forma del degradado (los mismos 9 stops en %, que al ser porcentajes se
reescalan solos con la nueva altura) ni el pico de opacidad/blur.

### Verificación

Mismo método de scroll corregido, captura ampliada 2x sobre la unión
entre fila 1 y fila 2: sin línea, y la difuminación se queda contenida
en la primera fila (la segunda fila ya sale nítida), con la misma fuerza
de opacidad/blur que antes.

### `?v=N` subido

`css/components.css` (41→42).

## `.top-fade` vs `.bottom-fade` — la curva "ease" simétrica se apagaba antes de tiempo

El usuario pidió comparar directamente footer y header en la misma
captura. Diferencia real, medida sobre la imagen (no a ojo): `.bottom-fade`
se queda en su valor máximo (0.75) durante el 74.75% de su propia altura
y solo se apaga del todo en el último cuarto, pegado al borde de
contenido — mantiene "cuerpo" casi todo el tramo. La curva coseno
simétrica de `.top-fade` (ease-in-out) empezaba a perder fuerza desde el
primer píxel, así que aunque el pico fuera parecido (0.9 vs 0.75), el
conjunto se veía con menos cuerpo que el footer.

**El arreglo real**: sustituir la curva coseno simétrica por una curva
asimétrica (11 paradas) que se queda fuerte (0.9→0.85) durante el primer
40% y cae con fuerza creciente solo en el último tramo — mismo perfil que
`.bottom-fade` (fuerte casi todo el tramo, cae rápido cerca del borde),
pero con paradas intermedias suficientes para que la caída sea progresiva
y no tenga un único quiebro marcado (lo que causaba la línea del
degradado original de 3 paradas).

### Verificación

Captura recortada con la misma pantalla y el mismo scroll, comparando
visualmente ambas zonas: el header ya mantiene fuerza durante casi todo
su tramo, igual que el footer, y sigue sin verse ninguna línea en la
unión con la fila 2 (comprobado con zoom 2x).

### `?v=N` subido

`css/components.css` (42→43).

## `.top-fade` — el blur real de Figma es mucho más fuerte que 7px

El usuario mandó una captura de su propio lienzo de Figma (frame
"02.1.1b_Álbum (scroll)", visible con su ruler/plugin de Figma) al lado
de nuestro prototipo, pidiendo copiar ese efecto. En esa captura, la fila
1 se ve MUY difuminada — detalle totalmente ilegible, mucho más fuerte
que el `blur(7px)` que llevaba esta capa (heredado de `.bottom-fade`,
donde 7px sí es correcto porque el footer de Figma nunca mostró ese nivel
de difuminado).

**Diagnóstico erróneo a medio camino, corregido antes de concluir nada**:
al subir de 7px a 20px y luego a 28px, las capturas (vistas en miniatura)
parecían casi idénticas — por un momento pareció que `backdrop-filter`
no estaba respondiendo al cambio. Antes de dar por buena esa conclusión
(siguiendo la norma de esta sesión de comprobar con datos, no a ojo), se
amplió la captura x3 sobre la zona exacta de la foto — ahí SÍ se ve
diferencia real entre 7/20/28/60px; el espejismo era solo de verla
reducida.

**El arreglo real**: `blur(60px)` (antes 7px) + pico de blanco bajado de
0.9 a 0.5 (para que el efecto lea como "cristal esmerilado" — blur
dominante, poco tinte blanco — y no como "capa blanca opaca con un
poco de desenfoque", que es como se veía con blur bajo y blanco alto).

### Verificación

Captura ampliada x3 sobre la foto de la fila 1: detalle totalmente
ilegible, coincide con la referencia de Figma. Comprobado también que la
unión con la fila 2 sigue sin línea a este nivel de blur.

### `?v=N` subido

`css/components.css` (43→44).

## `.top-fade` — copiar el footer tal cual reintroduce la línea (verificado, no se ha dejado así)

El usuario, viendo el blur de 60px todavía "débil" en una captura real de
la app, pidió copiar `.bottom-fade` tal cual pero invertido. Se probó
literalmente: mismas 3 paradas (74.75/88.29/97.47%), mismo blur (7px),
solo con la dirección del degradado cambiada de "to top" a "to bottom".

**Resultado, verificado con captura + zoom, no asumido**: la línea volvió,
justo en el tramo 88.29%→97.47% (donde la máscara pasa de "casi apagada"
a "apagada del todo" en un segundo salto de pendiente). El footer nunca
delata esto porque ese mismo tramo, en su caja, cae sobre el propio botón
sólido (un color plano, sin detalle que revele el corte); en el header cae
sobre una foto real, y ahí sí se nota. No se ha dejado esta versión — se
haría lo mismo que ya falló 2 veces esta sesión.

**El arreglo real**: mantener la idea que pidió el usuario (fuerte y
constante durante la mayor parte del tramo, igual que el footer — aquí
0-70%, muy cerca del 74.75% real) pero con la caída final (70-100%) hecha
con una curva coseno suave en vez de 2 segmentos de pendiente distinta —
la curva empalma con el tramo plano con derivada 0, así que no hay ningún
punto de cambio brusco. Blur subido a 40px (entre el 7px original y el
60px de la captura de Figma) y pico de blanco en 0.75 (igual que el
footer, en vez del 0.5 anterior) — la sesión anterior había interpretado
"se ve débil" como "falta blur puro", pero gran parte de la debilidad
real era que la máscara empezaba a bajar demasiado pronto (a los pocos
píxeles), no solo que faltara blur.

### Verificación

Captura sin scroll (estado inicial, sin hacer scroll todavía) + zoom x2
sobre la foto de la fila 0: fuerte y constante en la mayor parte de la
foto, cae suave hacia el final, sin ningún salto ni línea visible.

### `?v=N` subido

`css/components.css` (44→45).

## `.top-fade` — repetido el mismo fallo ya corregido en `.bottom-fade`: subir el blur sin comprobar el dato real

El usuario señaló, con razón, que el blur de 40px quedaba "demasiado
fuerte" y preguntó si se había tenido en cuenta lo mismo que falló al
arreglar el footer. Repasando el historial de esta sesión: al footer
también se le probó un blur más alto de entrada, y se corrigió a 7px en
cuanto se comprobó el dato real de Figma — la misma lección que ya está
anotada más arriba ("preferir el CSS literal de Figma sobre interpretar
una captura del lienzo"). Subir el header a 40-60px partió de interpretar
a ojo una captura del lienzo de Figma, no del valor real del componente —
exactamente el mismo error, repetido.

**El arreglo real**: `blur(7px)` (antes 40px), igual que `.bottom-fade`.
La fuerza visual ya no depende de inflar el blur — depende de cuánto
tiempo se mantiene la máscara en su pico (0-70% del tramo, igual que el
74.75% del footer), que es justo el cambio de la sección anterior.

### Verificación

Captura sin scroll + zoom x2 sobre la foto de la fila 0: el efecto se
nota arriba pero ya no invade el resto de la foto ni las filas
siguientes, sigue sin línea.

### `?v=N` subido

`css/components.css` (45→46).

## `.top-fade` — "rayas" sobre la cara difuminada: bandas de Mach, no una línea real

El usuario mandó una captura muy de cerca de una cara difuminada y
señaló unas "rayas" — acertó con la causa probable: los cambios de color
del degradado. No eran una costura real (un salto de opacidad de golpe),
sino **bandas de Mach**: con solo 6 paradas en el tramo de caída (70% a
100%, cada una a 6 puntos de distancia), el ojo percibe el cambio de
pendiente en cada parada como un anillo de contorno, aunque el degradado
sea matemáticamente continuo — el mismo fenómeno por el que un cielo
degradado con pocas paradas muestra "escalones" visibles aunque los
números sean correctos.

**El arreglo real**: la misma curva coseno, pero con paradas cada 2 puntos
en vez de cada 6 (16 paradas en el tramo de caída en vez de 6) — no
cambia la forma de la curva en absoluto, solo la resolución con la que
CSS la dibuja, y eso basta para que el ojo deje de percibir escalones.

### Verificación

Captura ampliada x4 con la misma técnica que detectó las rayas (zoom
directo sobre una cara difuminada): ya no se ven anillos ni bandas, el
desvanecido se percibe liso.

### `?v=N` subido

`css/components.css` (46→47).

## `.top-fade` — la "ralla grande" era el punto donde la máscara llega a 0 en mitad de la foto (medido, no a ojo)

El usuario mandó otra captura: seguía viendo una raya grande, distinta de
las bandas de Mach ya resueltas. Antes de tocar ningún número, se midió
con `getBoundingClientRect()` (inyectando un script temporal, sin fiarse
de la vista) dónde caía cada cosa en "dentro de un álbum" sin hacer
scroll:

- Fila 0 (la foto): de 135px a 303.5px (padding-top 135px + foto de
  168.5px — 393px de pantalla menos 2×20px de margen menos 16px de hueco,
  entre 2 columnas).
- `.top-fade` con 224px de alto: su punto de opacidad/blur 0 caía en
  224px — un 53% dentro de la propia foto.

La curva en sí es suave (ya sin quiebros ni bandas), pero **termina de
desvanecerse en mitad de una foto con detalle**, no en el hueco entre
filas — así que la mitad de abajo se ve nítida de golpe justo ahí, y eso
se percibe como una raya aunque matemáticamente no haya ningún salto.

**El arreglo real**: subir `.top-fade` de 224px a 312px, para que el
punto de 0 caiga ya pasado el borde real de la foto (303.5px), dentro
del hueco antes de la fila 1 — sin nada ahí que revele el corte.

**Contrapartida, para que quede anotada y no haya sorpresas**: con esta
altura, la fila 0 entera queda con algún grado de difuminado (antes solo
la mitad de arriba) — es la única forma de que el punto de "cero" no
caiga dentro de la propia foto. Si esto se ve como "demasiado" otra vez,
la única palanca real es esta (dónde cae el cero respecto al borde de la
fila), no el blur ni el pico de opacidad.

### Verificación

`getBoundingClientRect()` antes de tocar CSS (para confirmar el
diagnóstico con datos) + captura ampliada x2 después del cambio: ya no
hay ningún corte visible en la unión con la fila 1.

### `?v=N` subido

`css/components.css` (47→48).

## `.top-fade` — el planteamiento entero estaba mal: no es una capa siempre visible

Toda la saga anterior de esta sesión (altura, curva, blur, bandas) parte
de un supuesto que resultó ser falso: que `.top-fade` debía verse SIEMPRE,
igual que `.bottom-fade`. El usuario mandó el frame de Figma
"02.1.1b_Álbum" (sin "(scroll)", el estado de reposo) — ahí la fila 0
sale totalmente nítida, sin blur ni velo blanco. El frame
"02.1.1b_Álbum (scroll)" (el que se usó para calibrar el blur unas
secciones más arriba) es un ESTADO APARTE, no la misma capa vista de otra
forma: el header solo se difumina una vez que el usuario ha hecho scroll
— exactamente como la barra de navegación de iOS con "large title", o
como el botón flotante "bajar/volver arriba" de esta misma pantalla
(`data-scroll-toggle`, ya usaba scroll para cambiar de estado antes de
esta sesión).

Esto explica TODA la sensación de "whack-a-mole" de las últimas
secciones: cada altura/curva se estaba juzgando contra capturas en
REPOSO, donde según el propio Figma no debería verse nada — así que
cualquier altura que cubriera lo suficiente para no dejar una costura en
el borde de la fila 0 en reposo, por definición, iba a cubrir DE MÁS
(porque en reposo no debería cubrir nada en absoluto).

**El arreglo real**:
- `.top-fade` pasa a `opacity: 0` con `transition: opacity 0.2s ease`, y
  una clase `.is-visible` (`opacity: 1`) que le añade `js/app.js`.
- `js/app.js`: nuevo listener de `scroll` sobre `.screen-content` (uno por
  pantalla que tenga `.top-fade`), que alterna `.is-visible` con el mismo
  umbral de 4px que ya usaba el botón flotante — mismo instante en que
  cambia uno cambia el otro.
- Altura devuelta a 224px (la de antes de este experimento) — con la capa
  oculta en reposo, los 312px ya no hacían falta para evitar una costura
  ahí; si al comprobar la capa YA VISIBLE durante scroll aparece algún
  corte, esta es la próxima cifra a revisar, pero con el contexto correcto
  esta vez (visible ↔ en scroll).
- `.bottom-fade` NO se ha tocado — el footer (el botón "Volver") está
  siempre presente en pantalla haga o no scroll, así que su capa
  siempre-visible sí es correcta tal cual estaba.

### Verificación

Captura en reposo (sin scroll): totalmente nítido, coincide con el frame
de Figma sin "(scroll)". Captura disparando un evento `scroll` con
`scrollTop=260`: `.top-fade` aparece con el blur sobre la fila 0, coincide
con el frame "(scroll)".

### `?v=N` subido

`css/components.css` (48→49), `js/app.js` (14→15).

## `.bottom-fade` — mismo criterio que el header, pero al revés: apagarlo al llegar al final de verdad

El usuario, tras confirmar que el header ya estaba bien ("no modifiques
ya el header, déjalo así"), pidió aplicar la misma idea al footer: al
llegar al final real del scroll (con el botón flotante de bajar), las
últimas fotos deben verse nítidas, igual que ahora pasa arriba en reposo
— antes se quedaban difuminadas para siempre bajo el botón "Volver",
aunque no hubiera ya nada más oculto debajo que avisar.

**El arreglo real**: mismo patrón que `.top-fade.is-visible`, pero
invertido — `.bottom-fade` sigue visible por defecto (avisa de que hay
más contenido oculto bajo el botón), y `js/app.js` le añade la clase
`.is-at-end` (`opacity: 0`) en cuanto `scrollTop + clientHeight` llega al
`scrollHeight` de `.screen-content` (con 2px de margen por redondeo) —
no un `scrollTop` fijo, porque cada pantalla tiene una cantidad de
contenido distinta. Aplicado de forma genérica a las 6 pantallas que
llevan `.bottom-fade` (Álbumes, Álbum-detalle, Álbum-seleccionar, Yo, Mis
documentos, Detalle de foto) con el mismo bucle que ya usa `.top-fade`,
sin tocar el header.

`detalle-foto` no tiene `.screen-content` (no es una lista con scroll) —
el código lo detecta (`if (!fade || !content) return`) y deja su
`.bottom-fade` en el comportamiento de siempre, sin aplicar el nuevo
criterio ahí.

### Verificación

Tres capturas: en un punto intermedio del scroll (no al final), el
`.bottom-fade` sigue mostrando el blur; al llegar al final real
(`scrollTop = scrollHeight`), las últimas fotos se ven completamente
nítidas.

### `?v=N` subido

`css/components.css` (49→50), `js/app.js` (15→16).

## Corrección de rumbo: no era apagar el footer, era dejar sitio para la última fila por ENCIMA de él

El usuario aclaró que el cambio anterior (apagar `.bottom-fade` al llegar
al final) no era lo que pedía, y pidió explícitamente no volver a tocar
el footer. **Revertido por completo**: quitada la clase `.is-at-end` y su
regla CSS, y quitado el listener de scroll correspondiente en
`js/app.js` — `.bottom-fade` vuelve a su comportamiento de siempre
(visible sin condiciones).

Lo que pedía de verdad: que al llegar al final real del scroll, la
última fila de contenido pueda subir **por encima** del botón "Volver",
en vez de quedar a medio tapar detrás de él. Causa real: `.screen-content`
llega hasta `bottom:0` sin reservar ningún hueco para el footer, así que
el final natural del scroll deja el contenido justo a la altura del
propio botón, no por encima.

**El arreglo real**: `padding-bottom: 8.75rem` (140px, el mismo alto que
`.bottom-fade`) en las 5 pantallas que tienen footer con `.screen-content`
(Álbumes, Álbum-detalle, Álbum-seleccionar, Yo, Mis documentos) — así el
final real del scroll deja la última fila ya por encima de la zona del
botón, no tapada por él.

### Verificación

Captura con `scrollTop = scrollHeight` (final real): la última fila
queda completamente por encima del botón "Volver", nítida y sin tapar.

### `?v=N` subido

`css/components.css` (50→51), `js/app.js` (16→17).

## Home — el carrusel "Mis recuerdos" dejaba la siguiente tarjeta cortada, incluso en reposo

El usuario pidió arreglar el scroll de Home: las tarjetas del carrusel
"Mis recuerdos" se veían cortadas a medias. Comprobado con captura en
reposo (sin tocar nada, `scrollLeft: 0`): efecto NO era un fallo del
scroll-snap (que sí estaba bien puesto, `scroll-snap-align: start` en
cada tarjeta) — era que `.carousel` no tenía un ancho fijo, así que
ocupaba los 353px disponibles dentro de `.screen-content` (393px de
pantalla menos 2×20px de margen), más ancho que una sola tarjeta (300px).
Esos 53px de sobra siempre dejaban asomar un trozo de la tarjeta
siguiente, cortada, en cualquier posición de scroll — incluida la
posición de reposo.

**El arreglo real**: `.carousel { width: 18.75rem; }` (300px, el ancho
real de una tarjeta) — así el "visor" del carrusel solo enseña una
tarjeta completa cada vez, y el scroll-snap sigue encajando la siguiente
entera al pulsar la flecha, sin ningún corte a medias en ningún punto.
Los botones flotantes (`.carousel-next`/`.carousel-prev`) no se han
tocado — ya estaban posicionados en absoluto respecto al lienzo completo,
no respecto a `.carousel`, así que no dependían de su ancho.

### Verificación

Captura en reposo (ya no se ve ningún trozo de la 2ª tarjeta) + captura
tras simular un clic en el botón "avanzar" (la siguiente tarjeta se ve
completa, tampoco cortada).

### `?v=N` subido

`css/components.css` (51→52).

## Revertido: `.carousel` vuelve a sin ancho fijo (el usuario prefiere el "peek")

Tras ver el resultado del cambio anterior, el usuario pidió volver a la
versión de antes ("has hecho esto, vuelve a la versión anterior"),
mostrando una captura de la tarjeta 2 ("Un día especial") con las dos
flechas (atrás/adelante) flotando en el hueco en blanco bajo la tarjeta,
no encima de ella.

**Comprobado antes de revertir, no asumido**: se probó también SIN el
`width: 18.75rem` (la versión de antes de esta sesión) navegando a la
tarjeta 2 — el hueco en blanco bajo la tarjeta y la posición de ambas
flechas es IDÉNTICO con o sin el `width` fijo; la única diferencia real
que hacía el `width` era quitar el "peek" (asomo) de la tarjeta 3 a la
derecha. Es decir, el hueco bajo las flechas ya existía desde antes de
tocar nada esta sesión — no es una regresión de este cambio. Aun así, el
usuario prefiere la versión con "peek" tal cual estaba, así que se ha
revertido sin más.

Queda anotado por si se retoma en el futuro: el hueco en blanco entre la
tarjeta (termina sobre los ~700px) y las flechas (fijas en `top: 728px`)
es un patrón ya existente, no relacionado con el ancho del carrusel — si
algún día se pide "que las flechas queden pegadas a la tarjeta", el
ajuste real sería ese `top` de `.carousel-next`/`.carousel-prev`, no el
ancho de `.carousel`.

### `?v=N` subido

`css/components.css` (52→53).

## Carrusel "Mis recuerdos" — franja blanca entre el asomo de la tarjeta y el borde real

El usuario señaló una franja blanca entre el asomo (peek) de la siguiente
tarjeta y el borde real de la pantalla. Causa: `.screen-content` tiene
`padding-right: 20px` (el margen de página), y `.carousel` no lo
compensaba — así que el asomo se recortaba justo en el borde interior
del padding, dejando 20px de fondo blanco antes del borde real de la
pantalla, en vez de que la tarjeta siguiera sangrando hasta el borde.

**El arreglo real**: `margin-right: -1.25rem` en `.carousel`, que cancela
ese padding solo para esta fila — el asomo llega ahora hasta el borde
real, sin franja. No afecta al lado izquierdo (la primera tarjeta sigue
empezando justo en el margen de página, como antes).

### Verificación

Captura + zoom x2 sobre el borde derecho: el asomo de la tarjeta llega
directo hasta el borde del lienzo, sin ninguna franja blanca de por
medio.

### `?v=N` subido

`css/components.css` (53→54).

## Carrusel "Mis recuerdos" — también el margen izquierdo, y la tarjeta activa centrada con asomo a los dos lados

El usuario pidió lo mismo que en el margen derecho, pero además que la
tarjeta que se está viendo esté siempre centrada (asomando la anterior a
la izquierda Y la siguiente a la derecha, no solo la siguiente).

**El arreglo real**:
- `.carousel` pasa a tener `margin-left: -1.25rem` además del
  `margin-right` ya existente — su ancho real pasa a ser la pantalla
  entera (393px), sangrando por los dos lados.
- `padding-left`/`padding-right: 2.90625rem` (46.5px = (393-300)/2) en
  `.carousel` — deja hueco a los dos lados para que la tarjeta activa
  pueda centrarse de verdad, con el asomo correspondiente de la vecina a
  cada lado.
- `.carousel .photo-card--tall`: `scroll-snap-align` cambia de `start` a
  `center` — antes la tarjeta activa se pegaba contra el borde del
  contenedor (por eso solo asomaba la siguiente); ahora se centra de
  verdad dentro del hueco que deja el padding de arriba.

No hizo falta tocar `js/app.js` — el paso de "avanzar/retroceder"
(cardWidth + gap) sigue siendo válido con el nuevo padding, y el botón
"atrás" sigue apareciendo/ocultándose igual (se basa en `scrollLeft`, que
no cambia con el padding).

### Verificación

Captura en reposo (tarjeta 1: centrada, sin asomo a la izquierda porque
no hay tarjeta anterior, asoma la 2ª a la derecha) + captura tras simular
un clic en "avanzar" (tarjeta 2: centrada, asoma la 1ª a la izquierda Y
la 3ª a la derecha, ambas sangrando hasta el borde real).

### `?v=N` subido

`css/components.css` (54→55).

---

# Sesión 4 (19 sept) — Personas rediseñada + "Ver recuerdos de esta persona" real

## Personas (692:2107)

Pantalla `personas` rehecha desde Figma: cabecera/footer compartidos con Álbumes y Yo
(`.top-fade` + `.bottom-fade` + Volver azul, avatar con anillo, fondo blanco), grupos en
fila con scroll lateral, personas en círculos de 116px (3 columnas). Estilos en
`css/personas.css` (nuevo). Los overrides antiguos de `[data-screen="personas"]` en
`base.css` se quitaron. Las fotos son recortes exportados de Figma
(`people-nieta-1/2.jpg`, `people-hombre.jpg`, `people-grupo-venecia.jpg`).

**Consecuencia a tener en cuenta:** la vieja Personas era la única pantalla desde la que se
llegaba a las fotos con `PERSON_ZONES` (prueba-selector, people-group-*). Al rehacerla dejaron
de ser accesibles, así que ahora cada círculo es un botón que abre `persona-fotos` (ver
abajo), y esa pantalla sí lista esas fotos.

## Identificar persona al tocar → sus fotos

Fuente: `~/Desktop/identificar-persona-al-tocar.md` (face-api.js + `findPersonAtPoint`).

**Decisión del usuario: identificación SIMULADA con datos, no reconocimiento real.** El .md
depende de `faceRecognition.js`/`personClusters.js` (`accesibilidad.md`, sección 2), que no
existen en el prototipo. Además la detección de la persona ya se hace por polígono
(Vision framework), no por caja de cara.

- `PERSONAS` en `js/persona.js`: id → `{ name, photos[] }` (clara / ainhoa / sinnombre;
  nombres provisionales, "Persona sin nombre" es el fallback del .md).
- Cada zona de `PERSON_ZONES` lleva `personId` y `face: [cx, cy, ancho]` (recuadro de la
  cara en % del recorte 393×390, ajustado mirando recortes reales, no a ojo).
- El menú del pollito se mantiene. "Ver recuerdos de esta persona" ahora va a la pantalla
  nueva `persona-fotos` (nombre + avatar con su cara + cuadrícula de sus fotos), rellenada
  por `fillPersonaScreen()` al seleccionar. El avatar NO usa `<canvas>` (Safari): es la foto
  ampliada dentro de un círculo con `overflow:hidden`.
- Las fotos de `persona-fotos` son `.photo-card`, así que abren el detalle y se puede
  encadenar (pulsar sobre otra persona → sus fotos).
- `app.js`: `personaReturn` para que "Volver" en `persona-fotos` vuelva a la pantalla que
  había antes (Personas, o el álbum de origen), no al detalle (haría ping-pong).
- Del .md se respeta: sin recorte para guardar/compartir; el recuadro de cara es solo avatar.
  **No** se respeta lo de "silencioso si no se reconoce" — el flujo actual (mantener pulsado
  sobre una persona con zona) siempre lleva a algo (CLAUDE.md §6, nunca un callejón).

### ⏰ RECORDATORIO — cambiar a reconocimiento real (opción 2) más adelante

El usuario pidió que se recuerde: **cuando vaya a meter las imágenes reales que se tocan,
hay que pasar de la identificación simulada a face-api.js (opción 2)**. Lo que hará falta:
1. Implementar antes el #2 de `accesibilidad.md` (`faceRecognition.js`, `personClusters.js`,
   modelos de face-api.js servidos desde `/models`).
2. Sustituir `PERSONAS`/`personId`/`face` por `findPersonAtPoint()` del .md (o mezclarlo con
   los polígonos de Vision: polígono para el contorno, face-api solo para "quién es").
3. `personClusters` sustituye la tabla `photos[]` de `PERSONAS` para listar fotos.
4. Decidir el caso "cara detectada pero no reconocida" (el .md dice silencio; el criterio
   del proyecto pide una salida clara).
Avisar al usuario de este punto en cuanto hable de fotos reales.

### Verificación

Chrome headless + CDP (mouse real): Personas → círculo → `persona-fotos` (nombre + 3 fotos);
foto → detalle → mantener pulsado sobre la persona del centro → menú → "Ver recuerdos" →
`persona-fotos` "Ainhoa nieta" con su cara; Volver → Personas. **Ojo al probar:** el vídeo
de bienvenida (5s) sigue disparando `showScreen('pre-registro')` por su cuenta (bug ya
anotado en la sesión 3) — en tests de más de ~5s pausar los `<video>` primero.

### Corrección (misma sesión): "mantener pulsado no hace nada"

Causa: al rehacer Personas dejaron de ser accesibles las fotos con zonas, y las fotos
nuevas (grupo de Venecia, `album-venecia.webp`, `album-museo.webp`) no tenían zona. Arreglo:
segmentación real (Vision) de esas 3 fotos + zonas en `PERSON_ZONES` con `personId`/`face`, y
las tarjetas de grupo de Personas ahora son `.photo-card` (abren el detalle). `PERSONAS`
lista también esas fotos. Verificado con Chrome headless: grupo → detalle → mantener pulsado →
menú → "Ver recuerdos" → "Clara" con su cara → Volver a Personas. Toda foto NUEVA que se
quiera seleccionar necesita su zona (misma receta: `tools/segment-personas.swift`).

---

# Sesión 5 (20 sept) — logo de Pre-registro en azul de marca

Figma `571:7578`: el logo "nido" de la primera pantalla tras el vídeo del huevo es
`#516DFF`; el vídeo `pollito-fotos.mp4` lo traía horneado en azul marino (RGB 38,53,130).

- **`tools/recolor-logo-video.py`** (nuevo): cada píxel del logo es una mezcla blanco↔marino, se
  estima la proporción por proyección sobre esa recta y se sustituye el marino por el azul
  nuevo (`p' = p + a·(nuevo − marino)`). Lo que no cae en la recta (pollito, fotos) no se toca.
  Resultado comprobado en frames 0/34 (incluido el pollito tapando el logo): sin halo apreciable.
- El vídeo previo se guarda como `pollito-fotos.original-logo-navy.mp4` (el crudo anterior sigue
  como `...original-fondo-crudo.mp4`). No hay ffmpeg en este Mac: todo con `cv2` + `avc1`.
- **Hallazgo:** el fondo "blanco" del vídeo se decodifica en el navegador como ~(250,254,251), no
  #fff (deriva de H.264 4:2:0; re-codificar con el blanco a 255 no lo arregla). Se veía un
  rectángulo verdoso contra el #fff de la pantalla — ya pasaba tras la Sesión 4 del 18 sept.
  Arreglo: `filter: brightness(1.025)` en `.pre-registro-video` (`css/pre-registro.css`); el fondo
  llega a 255 y el resto sube un 2,5 %. Verificado con captura: (255,255,255) en la zona del vídeo.
- Caché: `pollito-fotos.mp4?v=6`, `pre-registro.css?v=5`.
- **Diferencia menor con Figma sin tocar:** el logo del vídeo queda ~11px más abajo que en el
  frame de Figma (el pollito coincide). No afecta al color.

---

# Sesión 5 (20 sept) — Registro 2 · teléfono rediseñado (Figma 590:6924)

- Fondo blanco (antes `--bg-app`), logo azul (`wordmark-nido.svg`), título/subtítulo en su sitio
  (140px/216px), caja del número sin relleno con borde azul 1px y cursor parpadeante (`::after`),
  teclado a 353px con teclas `#f4f5fc` 72px sin sombra y cifras de 32px regular, última fila
  alineada a la derecha (0 bajo el 2, borrar bajo el 3), icono `icon-delete-blue.svg` (asset de
  Figma, descargado tal cual), footer con `.bottom-fade` y botón "Enviar código" a 744px.
- **Todo acotado a `.registro-2`** (final de `css/registro.css`): `registro-3` (código) comparte
  `.registro-keypad`/`.registro-key` y sigue con el aspecto anterior (teclas oscuras, fondo
  lavanda) hasta que se rediseñe — quedará inconsistente entre las dos pantallas mientras tanto.
- Caché: `registro.css?v=8`. Verificado con captura (autorrelleno 612345678 + cursor).

## Registro 3 · código rediseñado (Figma 590:6973)

Mismo tratamiento que Registro 2: el bloque de `css/registro.css` "registro-2 · teléfono,
rediseño" ahora aplica a `.registro-2` y `.registro-3` (fondo blanco, teclado claro, footer con
`.bottom-fade`, botón a 744px). Solo cambia lo propio del código: 4 cajas de 67px con borde azul
1px sin relleno (top 273px, left 39px, hueco 16px), logo azul, icono de borrar azul. Botón
"Reenviar código" con su icono de siempre. Ya no queda ninguna pantalla del flujo con el teclado
oscuro. `registro.css?v=9`. Verificado con captura (autorrelleno 6-2-…).

## Registro 4 · loader tras el código (Figma 704:1730)

Fondo blanco, logo azul 131×48 a 359px, spinner (`assets/icons/spinner-loader.svg`, asset de
Figma tal cual) de 45,57px a 435px que gira con CSS (`registro-spin`, 0,9s; más lento con
`prefers-reduced-motion`). El paso automático a Home a los 1,8s no se ha tocado. `registro.css?v=10`.

## Registro · saludo de Nidi (Figma 765:5974) — pantalla nueva

- Nueva pantalla `registro-nidi`, **entre el modal "Ayúdanos" y el loader**: los dos botones del
  modal (Permitir / Quiero saber más) van ahora a `registro-nidi`; esta pasa a `registro-4`
  (loader) → Home. Flujo: código → modal → **Nidi** → loader → Home.
- Sin botón (solo toca): avanza sola a los 3,5s (`REGISTRO_NIDI_MS` en `js/app.js`) o al tocar
  en cualquier sitio (`data-nav` en la propia `<section>`).
- Ilustración `assets/img/nidi-saludando.webp`: recortada de la fuente de Figma (2752×1536 RGBA)
  con la misma caja que usa el frame (346×424, `left −65.65 %`, `w 219.97 %`).
- **Bug de la sesión 3 arreglado de paso:** `ended` de los vídeos de bienvenida/pre-registro solo
  navega si esa pantalla sigue activa (antes, con un deep-link `#pantalla`, a los ~5s te sacaba de
  ella). `app.js?v=20`, `registro.css?v=11`.
- Verificado con CDP: Permitir → nidi → (3,5s) → registro-4; y tocar en nidi → registro-4.

---

## Onboarding rediseñado — paso 1 (Figma 759:4445)

- Tour reactivado: `registro-4` (loader) → `onboarding-1` → (Álbumes **o** Siguiente) → siguiente paso.
  Flujo completo: … código → modal → Nidi → loader → onboarding → Home.
- `onboarding-1`: copia estática de Home (sin `data-nav`/carrusel, `tabindex=-1`) + velo
  `rgba(41,41,41,.6)` + blur 6 + botón Álbumes destacado (`#f5f5f8`, sombra marcada, icono azul
  `icon-image-01-blue.svg`, asset de Figma) + bocadillo 192×70 + pollito nuevo señalando
  (`pollito-onboarding-1-v2.webp`, recortado y espejado del asset de Figma con la caja del frame) +
  botón "Siguiente →". Álbumes y Siguiente llevan `data-onboarding-next`. Estilos en
  `css/onboarding.css` (se vuelve a enlazar, `?v=4`).
- La primera tarjeta del carrusel de fondo arranca en x=20 (como Figma), no centrada como el Home actual.
- **Pendiente:** solo se pasó el frame del paso 1. De momento "siguiente" va a `home`. Los pasos
  Personas / Yo / Mis recuerdos necesitan sus nodos de Figma (el HTML viejo de los 4 pasos sigue en
  `_archive/onboarding-4-pantallas.html`; `onboarding.css` aún conserva las reglas viejas de los pasos 2-4,
  que ya no se usan).

## Onboarding — paso 2 "Personas" (Figma 759:4520)

`onboarding-2`: misma construcción que el paso 1 (copia estática de Home + velo). Diferencias
según Figma: botón destacado Personas en x=142/y=143 (icono `icon-users-01-blue.svg`), bocadillo
216×90 con la cola abajo a la izquierda ("Aquí puedes ver las fotos de tus personas favoritas."),
pollito a la izquierda (`pollito-onboarding-2-v2.webp`, recorte espejado de la fuente, caja 250×312 en
x=−30, y=449). Paso 1 → paso 2 → `home` (provisional hasta tener el paso 3). Personas y
Siguiente avanzan igual. `onboarding.css?v=5`.

## Onboarding — paso 3 "Yo" (Figma 759:4608)

`onboarding-3`: botón destacado Yo en x=266/y=140 (`icon-face-smile-blue.svg`), bocadillo 248×90
en x=125/y=347 ("Aquí tienes todo lo que tú creas y tus documentos importantes.", cola abajo a la
izquierda), pollito señalando a la derecha (`pollito-onboarding-3-v2.webp`, misma fuente que el paso 1
pero otro recorte, sin espejar y girado −0,52° con CSS en el contenedor, como Figma). Cadena:
paso 1 → 2 → 3 → `home` (provisional: si existe un paso 4 "Mis recuerdos" hay que pasar su nodo).
`onboarding.css?v=6`.

## Onboarding — paso 4 "Mis recuerdos" (Figma 759:4688) — último paso

`onboarding-4`: sin botón destacado; el título "Mis recuerdos" se repite en blanco (x=24, y=252) sobre el
velo; bocadillo 216×90 en x=15/y=320 (cola abajo a la derecha, "Aquí puedes explorar recuerdos que hemos
creado para ti."); pollito de espaldas señalando (`pollito-onboarding-4-v2.webp`, recorte del asset de
Figma 264×330 en x=129/y=445). Solo "Siguiente" avanza → `home`. **Tour completo: pasos 1→2→3→4→Home**,
encadenado tras el loader. Se borraron de `css/onboarding.css` las reglas viejas de los pasos 2-4
(ya no se usaban y el paso 4 antiguo tenía velo blanco). `onboarding.css?v=7`. El antiguo
`_archive/onboarding-4-pantallas.html` queda solo como referencia histórica.

## Onboarding dentro de Álbumes (Figma 757:4368)

- Pantalla nueva `onboarding-albumes`: copia estática de Álbumes + velo, botón "Álbum nuevo" destacado a
  ancho completo (misma doble capa `.albumes-new-wrap` + `.albumes-new-btn`), bocadillo 207×70 en
  x=147/y=391 ("Aquí puedes crear un álbum a tu gusto."), pollito de `pollito-onboarding-2-v2.webp` (misma
  imagen y caja que el paso 2 del tour de Home) y "Siguiente →". `onboarding.css?v=8`.
- **Cuándo sale:** la primera vez que se navega a Álbumes desde cualquier botón (`albumesOnboardingSeen`
  en `js/app.js`, en memoria: se reinicia al recargar). "Siguiente" entra a Álbumes de verdad; las
  siguientes veces va directo. Un deep-link `#albumes` no lo dispara (no pasa por el click).
- **Diferencia con Figma sin tocar:** en este frame el botón "Álbum nuevo" ocupa todo el ancho y no hay
  "Buscar"; la pantalla Álbumes real de arriba sí tiene "Buscar". Se mantiene la real tal cual
  (no se pidió cambiarla); solo el onboarding copia el frame.

## Onboarding de Álbumes — paso 2 "Todas tus fotos" (Figma 765:5243)

`onboarding-albumes-2`: sin botón destacado; "Todas tus fotos ›" repetido en blanco sobre el velo
(`.onboarding-caption`, x=46/y=423), bocadillo 207×70 en x=156/y=309 ("Pulsa aquí para ver todas tus
fotos."), mismo pollito. Cadena: primera vez en Álbumes → paso 1 (Álbum nuevo) → paso 2 → Álbumes real.
En el fondo de este frame no hay "Buscar" (se oculta solo ahí, la pantalla real no cambia).
`onboarding.css?v=9`.

## Onboarding de la pantalla de detalle de foto/vídeo (Figma 765:5320, "detalle foto onboarding 1")

- Es una **capa dentro de la propia pantalla `detalle-foto`** (`.detalle-onboarding`, z-index 60), no una
  pantalla aparte: la foto de detrás es la real que se ha abierto (en las otras pantallas de onboarding el
  fondo es una copia estática). Se enciende en `openDetalle()` la primera vez (`detalleOnboardingSeen`, en
  memoria: se reinicia al recargar) y se cierra con "Siguiente" o pulsando "Felicitación"
  (`data-detalle-onboarding-close`), o al salir de la pantalla.
- Contenido: botón "Felicitación" destacado (230px, `.albumes-new-wrap` + `icon-star-06-blue.svg`),
  bocadillo 239×83 en x=26/y=368 ("Pulsa aquí para crear felicitaciones personalizadas"), pollito de
  `pollito-onboarding-1-v2.webp` (misma caja que el paso 1 del tour de Home: x=146/y=451, 258×308).
  Animación de entrada del pollito con `Mascota.enterOnboardingPollito`. `onboarding.css?v=10`, `app.js?v=23`.
- Verificado: abrir foto → capa visible; Siguiente → se cierra; Volver y abrir otra → ya no sale.
- **Paso 2 "Eliminar" (765:5385, "detalle foto onboarding 2")**: misma capa, dos grupos `data-detalle-step`
  1/2. "Siguiente" (o pulsar el botón destacado) avanza del 1 al 2 y en el 2 cierra. Botón Eliminar
  destacado en x=266/y=135 (107×85, `.albumes-search-btn` + `icon-trash-01-blue.svg`), bocadillo 239×71
  en x=131/y=361 ("Pulsa aquí para eliminar las fotos que no quieras."), pollito **sin espejar**
  (`pollito-onboarding-1-v2-derecha.webp`, mismo recorte que el paso 1 pero apuntando a la derecha) en
  x=−7/y=450. `onboarding.css?v=11`, `app.js?v=24`. Verificado: 1 → 2 → cerrar, y no vuelve a salir.
- Nota: el usuario mandó por error la captura de Álbumes "Todas tus fotos" para este paso; se siguió el
  nodo de Figma (confirmado después con la captura correcta, la de Eliminar).

## Personas — versión actualizada de Figma (692:2107, "02.1.2_Personas")

El mismo nodo se actualizó en Figma tras la primera implementación; se rehízo `personas`:
- Grupos: tarjetas de **165×188** (antes 131×182), 3 (Venecia "Clara y Ana", museo sin nombre, museo
  "Clara y Ainhoa"). La del museo usa `object-position: 50% 49.3%` (solo dentro de `.persona-group`, para
  que la imagen clonada en el detalle no cambie y sus zonas de persona sigan valiendo).
- Flecha → (`.personas-next`, 64px, x=309/y=387) avanza los grupos (`data-carousel`; el gap del carrusel se
  lee ahora de CSS en vez de fijar 18px) y flecha ↓ flotante (`.albumes-more` + `data-scroll-toggle`) baja la lista.
- Personas: filas 1-2 con círculos de **112px repartidos a ancho de página** y nombres de 16px azul oscuro
  (el 1º de cada fila sin nombre, como Figma); filas 3-4 con el estilo anterior (116px, nombres en negrita
  de 15,48px). Los círculos siguen abriendo `persona-fotos`. `personas.css?v=6`, `app.js?v=25`.
- Verificado: flecha → mueve 165px, flecha ↓ baja la lista, círculo → `persona-fotos`, tocar el grupo abre el detalle.

---

# Sesión 6 (20 sept) — Persona, Imágenes/Vídeos y nuevo flujo de selección de persona

## Pantallas nuevas (Figma 692:2188, 692:2241, vídeos, 765:5999, 765:6044, confirmación)

- **`persona-fotos`** (692:2188 "02.1.2_Persona") rehecha: título con el nombre ("Ainhoa Nieta"), dos filas
  "Imágenes >" y "Vídeos >" (tarjetas 165×188 con pie, reutilizan `.personas-groups`/`.persona-group`), una
  flecha → por fila (`data-carousel-target` en `js/app.js`: cada flecha mueve su carrusel) y Volver. **El
  avatar de la cabecera es el pollito** (como Figma), ya no la cara recortada del .md: se quitó `buildAvatar`.
- **`persona-imagenes`** (692:2241) y **`persona-videos`**: título 131px, cuadrícula 2×N (`.album-grid`), flecha
  ↓ flotante y Volver (`data-nav="persona-fotos-keep"`, vuelve a la ficha sin cambiar a dónde vuelve ésta).
  Los frames de Vídeos y de "confirmación" **no llegaron con enlace, solo con captura**: se montaron desde la
  imagen. Las fotos de las cuadrículas son las de la persona repetidas (datos de ejemplo).
- `persona.js`: `PERSONAS` ahora lleva `name` (título) y `ask` (texto de la confirmación) además de las fotos;
  `CAPTIONS_FOTO` pone los pies de foto; `fillPersonaScreen(id)` rellena las 3 pantallas.

## Nuevo flujo de selección en el detalle (sustituye al menú del pollito)

Mantener pulsado sobre una persona → contorno azul → **pregunta por voz** (`.persona-ask`, 765:6044: dos
bocadillos, pollito "quita el interrogante" a −50,99° horneado en `pollito-pregunta-nombre.webp`, micrófono
`mic-escuchar.svg` del propio Figma, Cancelar) → al tocar el micro "escucha" 1,8s (simulado, no hay voz real;
`LISTEN_MS`) → **confirmación** (`.persona-confirm`, reutiliza el modal de "Ayúdanos": "¿Quieres ver más fotos
de tu nieta Ainhoa?") → "Sí, enséñame más" abre la ficha de la persona; "En otro momento"/Cancelar cierran.
- **Contorno azul** (a petición del usuario, como 765:5999): solo un trazo `#516DFF` de 5px con desenfoque de
  3px — se quitaron el núcleo blanco y el "levantar" de la persona. **Ojo:** `filter: blur()` sobre un elemento
  SVG usa unidades del viewBox (1 ud ≈ 3,9px), por eso es `blur(0.76px)`; con `blur(3px)` el trazo desaparecía.
- El menú antiguo (Ver recuerdos / **Crear algo con esta persona** / Salir) sigue en el HTML/JS pero ya no se
  abre desde ningún sitio; "Crear algo" (Cloudflare) queda inaccesible hasta decidir dónde vive.
- Verificado con CDP: círculo → ficha, flechas, Imágenes/Vídeos ↔ ficha ↔ Volver; grupo → detalle → mantener
  pulsado → pregunta → micro → confirmación → Sí → ficha. `persona.css?v=26`, `personas.css?v=7`, `app.js?v=26`.

## Felicitación → crear imagen con IA (Figma 733:2997, "02.2.2_Crear felicitación")

- El botón **Felicitación** del detalle (`data-persona-action="felicitacion"` + `data-nav="felicitacion-estilo"`)
  lleva a una pantalla nueva **"Elige un estilo"** con 4 tarjetas de 125px: Cumpleaños, Aniversario, Año nuevo,
  Feliz navidad (ilustraciones recortadas de los assets de Figma → `assets/img/felicitacion-*.webp`).
  Se quitaron de la UI Amistad y Retrato (siguen soportados en `crear-imagen.js`).
- **Actualización (759:5047):** elegir una tarjeta ya NO lanza la creación: la marca (borde azul de 2px,
  `.is-selected`) y hace aparecer "Continuar →" junto a Volver en el footer (`.bottom-action-row`); al abrir la
  pantalla siempre empieza sin nada elegido. "Continuar" (`data-persona-action="felicitacion-continuar"`) es lo que
  vuelve al detalle y lanza `createWithPerson(style)` sobre la foto que
  se estaba viendo (`createSource`, se recuerda al pulsar Felicitación; ya no hace falta seleccionar a nadie):
  "Creando tu recuerdo..." → resultado a pantalla completa (Volver / Compartir) o error con reintentar.
  La UI de cargando/resultado/error es la que ya existía (no hay Figma nuevo para ellas).
- **Necesita el servidor de funciones:** `python3 -m http.server` no sirve `netlify/functions`. Se usa
  `npx netlify-cli dev --port 8888` (lee `.env`) → http://localhost:8888/. Verificado de punta a punta con una
  llamada real a Cloudflare: Felicitación → estilo → Cumpleaños → resultado "¡Feliz cumpleaños!".
- El menú antiguo del pollito y su paso "¿Qué quieres crear?" (`estilo`) ya no se abren; quedan en el código.

## Felicitación — loader a pantalla completa (Figma 759:5110)

- Nueva pantalla `felicitacion-cargando`: fondo blanco, pollito pintando (276×369 en x=59/y=190) y "Creando imagen"
  (20px azul, y=478). El pollito NO trae `<img>` en el código de Figma (nodo sin asset exportable), así que se
  recortó de la captura `Downloads/02.2.2._ Crear felicitación (loader).png` y se pasó a transparente por
  diferencia con el blanco → `assets/img/pollito-pintando.webp`. Sube y baja suavemente (2,4s); sin animación con
  `prefers-reduced-motion`.
- Flujo: "Continuar" (ya sin `data-nav`) → `createWithPerson()` muestra el loader con `NidoNav.show()` (nuevo,
  expuesto en `js/app.js`) → al terminar (mínimo 1,2s) vuelve al detalle con el resultado o el error. "Volver a
  intentarlo" del error vuelve a pasar por el loader. El paso "Creando tu recuerdo..." de la tarjeta del detalle ya
  no se usa. Verificado con una llamada real: Continuar → loader → detalle con el resultado.

## Felicitación generada (Figma 763:5138) + solo 4 estilos + Compartir → WhatsApp

- Nueva pantalla `felicitacion-generada`: cabecera "Felicitación" + avatar, imagen a ancho completo (393×471, y=188,
  sombra de Figma) con el pie HTML encima (las mismas tipografías por estilo de siempre) y Volver / Compartir.
  Sustituye a la vista de resultado dentro del detalle (`.persona-create-result`, ya sin uso; el error sigue
  saliendo en la tarjeta del detalle). Flujo: Continuar → loader → `felicitacion-generada`. Volver → detalle.
- **Compartir** abre `https://wa.me/?text=…` en otra pestaña (mensaje "Mira la felicitación que he creado con Nido").
  Un enlace no puede adjuntar la imagen: eso queda para el share sheet nativo de la app real.
- **Solo Cumpleaños, Aniversario, Año nuevo y Navidad.** Amistad y Retrato archivados en
  `_archive/estilos-amistad-retrato.md` (prompts, pie y botones, con instrucciones para recuperarlos) y quitados de
  `crear-imagen.js`, `persona.js` y del menú antiguo. Las reglas CSS del pie de Amistad se dejan por si acaso.
- Diferencia con Figma: la mockup lleva "¡FELIZ CUMPLEAÑOS!" dorado abajo dentro de la imagen; aquí el pie va
  arriba y en la tipografía de cada estilo (la IA no escribe bien texto, ver crear-imagen.js). Sin tocar.
- Verificado con llamada real: Continuar → loader → pantalla generada → Compartir (URL de wa.me) → Volver.

## Onboarding: todo lo destacado avanza + detalle con selección/felicitación desde cualquier sitio

- **Onboarding** (`js/app.js`, `onboarding.css?v=12`): además de "Siguiente", avanzan al tocarlos el elemento destacado,
  la burbuja, el pollito (antes `pointer-events:none`) y el texto repetido sobre el velo ("Todas tus fotos", "Mis
  recuerdos"). Un manejador en captura reenvía el toque al `.onboarding-cta` de esa pantalla. Verificado en los pasos
  1, 4, Álbumes 1 y el del detalle (tiene 2 pasos: avanza 1→2). Ojo al probar con deep-link `#onboarding-albumes-2`: el
  destino `albumes` pasa antes por su onboarding porque el flag "ya visto" no se ha puesto.
- **Detalle (foto/vídeo) desde cualquier origen** tiene selección de persona + Felicitación: se segmentaron con Vision
  las 3 fotos del carrusel de Home (`memory-baby/kids-costumes/wedding`) y se añadieron a `PERSON_ZONES`. Las fotos de
  documentos y creaciones no tienen gente. Felicitación acepta también vídeo: toma el fotograma actual con un canvas
  (`videoFrameToBase64`, no probado con un vídeo real ni en Safari). La selección de persona **no** funciona en vídeo
  (haría falta segmentar cada fotograma). Verificado: Home → foto → mantener pulsado → pregunta → confirmación, y
  Felicitación → Navidad → resultado.

## Compartir con foto + galería real (20 sept)

- **Compartir → WhatsApp con la imagen:** `shareToWhatsApp()` en `js/persona.js`. Dibuja el pie de foto (HTML) sobre la
  imagen de la IA con un canvas y: en móvil usa `navigator.share({files})` (aparece WhatsApp con la foto adjunta); en
  ordenador copia la imagen al portapapeles + aviso "Pégala en WhatsApp" + abre wa.me; si el portapapeles falla la descarga.
  Verificado el camino de ordenador y la imagen compuesta; el share sheet del móvil NO probado (no hay dispositivo).
- **Galería real:** "Permitir" del modal abre un `<input type=file accept=image/*,video/* multiple>` (fototeca en móvil,
  explorador en ordenador; un navegador no puede leer la galería sin que la persona elija, ese es el "permiso"). Las
  elegidas (máx. 60) sustituyen a las de ejemplo en el carrusel de Home (8), en "Todas tus fotos" y en el contador de
  fotos. Si cancela, quedan las de ejemplo. Felicitación funciona con ellas (se reducen a 1280px antes de enviarlas).
  **Limitación:** las fotos reales no tienen contorno de persona (la segmentación se hace a mano con Vision en el Mac),
  así que seleccionar personas no funciona en ellas; es el punto donde tocaría pasar a face-api.js (ver Sesión 4).

## Crear álbum · nombre por voz (Figma 757:3993)

"Álbum nuevo" (Álbumes) abre `.persona-ask[data-album-ask]`, el mismo componente que la pregunta de nombre de persona (misma geometría en
Figma): dos bocadillos ("¿Cómo quieres llamar a tu nuevo álbum?" / "Toca en el micrófono y dímelo."), pollito, micrófono y Cancelar sobre
Álbumes difuminado. El micro late 1,8s ("escucha", simulado) y **de momento no pasa a ningún sitio**: falta el diseño del siguiente paso.
Cancelar cierra. De paso se corrigió el padding de los bocadillos (17,5px, como Figma) que partía el texto en 3 líneas. `personas.css?v=17`.

## Crear álbum · escuchando (Figma 757:4072)

Segundo estado de la misma capa (`data-album-ask`): al tocar el micrófono aparece la respuesta ("....", burbuja azul clara `#dde2fb`
209×63 en x=23/y=376, esquina inferior izquierda recta) y el micro cambia a `mic-escuchando.svg` (icono azul, asset de Figma). Se queda así
(sin cerrarse) hasta Cancelar, que lo deja todo como al principio. Sigue sin haber pantalla posterior: falta el siguiente diseño.
`personas.css?v=18`, `persona.js?v=31`.

## Crear álbum · confirmar nombre (Figma 757:4223)

Tras 1,8s "escuchando", el micro y los dos bocadillos se sustituyen por: el nombre "oído" arriba (burbuja azul clara 209×63 en x=23/y=144, "Calle concordia" =
`ALBUM_NOMBRE_DEMO`, simulado), "¿Quieres que tu álbum se llame así?" (209×90 en 23/247), botón suave "Sí, crear álbum" (y=658, 353×65) y Cancelar.
"Sí, crear álbum" **añade un álbum nuevo el primero de "Mis álbumes"** con ese nombre y "0 fotos" (portada de ejemplo) y cierra; falta el diseño de qué
ocurre después (elegir fotos, etc.). Cancelar restablece todo. Geometría verificada con `get_metadata` del nodo. `personas.css?v=20`, `persona.js?v=32`.

## Álbum nuevo vacío + su onboarding (Figma 746:3458 y 765:5185)

- "Sí, crear álbum" ahora abre la pantalla nueva `album-nuevo`: título = nombre elegido (`data-album-title`), solo la celda "Añadir"
  (168×168 en x=21/y=135, reutiliza `.album-grid__add-wrap`, va a `album-seleccionar`), Volver → Álbumes.
- La 1ª vez sale encima el onboarding (capa `.detalle-onboarding[data-onboarding-layer]`, `albumNuevoOnboardingSeen` en memoria): "Añadir"
  destacado sobre el velo, bocadillo 216×70 en 33/391, pollito (mismo recorte que el paso 1 del tour, en 146/451) y "Aceptar" (y=736, 65px).
  Aceptar, "Añadir" (destacado), la burbuja y el pollito cierran la capa (el manejador genérico de onboarding en `app.js` ya los cubre).
  Medidas de `get_metadata`. Verificado con CDP: crear → album-nuevo con "Calle concordia" + onboarding → Aceptar → Añadir → selección.
- `album-seleccionar` (pantalla ya existente para elegir fotos) sigue sin añadir realmente nada al álbum nuevo. `personas.css?v=21`, `persona.js?v=33`, `app.js?v=31`.

## Elegir fotos y álbum con fotos (Figma 685:8075 y 668:9100)

- "Elige las fotos a añadir" (`album-seleccionar`): ahora **un toque marca/desmarca** (antes: mantener pulsado; un toque abría el detalle) y ya no hay velo
  oscuro sobre las elegidas, solo el check azul (como la captura actual). Vale también con la galería real (`data-select-grid` se rellena al permitir).
- "Añadir" / "Volver" de la selección vuelven al origen (`data-nav="select-back"`, variable `selectTarget` = `nuevo` | `todas`, fijada al pulsar "Añadir" en cada álbum).
  En el álbum nuevo, "Añadir" **copia las elegidas** a su cuadrícula (celda "Añadir" + fotos, como "Todas tus fotos") y actualiza "N fotos" en Álbumes.
  Crear otro álbum lo deja vacío otra vez. Verificado: crear → Aceptar → Añadir → 3 fotos → Añadir → álbum con 3 + contador.
- `app.js?v=32`, `albumes.css?v=9`, `personas.css?v=22`.

## Yo · onboarding 1 (Figma 765:5758, "02.4_Yo (onboarding 1)")

Capa `.detalle-onboarding.ob-yo[data-onboarding-layer]` dentro de `yo`, la 1ª vez que se entra (`yoOnboardingSeen`, en `showScreen()`, se reinicia al recargar): "Mis documentos"
destacado (230×85 en 20/135), bocadillo 272×91 en 101/353 (esquina inferior izquierda recta), pollito del paso 2 del tour (−30/449) y "Siguiente" (y=736).
Todo lo destacado cierra la capa (manejador genérico). **"Siguiente" de momento solo cierra**: el nombre del frame dice "onboarding 1", faltan los siguientes pasos.
De paso, el cierre de capas usa la capa tocada (`closest`) en vez de la primera de la página. `onboarding.css?v=13`, `app.js?v=33`.

## Yo: onboarding 2 (765:5909) y pantalla "Mis felicitaciones" (687:8356)

- **Onboarding de Yo en 2 pasos** dentro de la misma capa (`data-layer-step` 1/2, `data-onboarding-layer-next` / `-close`): paso 2 = "Ajustes" destacado (266/135, 107×85), bocadillo 217×69 en 136/373
  ("En ajustes puedes gestionar tu cuenta."), pollito apuntando a la derecha (−7/450). "Siguiente" o tocar lo destacado avanza; el último paso cierra.
- **Pantalla Yo** (687:8356): título "Mis felicitaciones" y el botón "Generar" pasa a **"Felicitación"** (mismo icono de destellos). Ese botón abre la pantalla de estilos usando como foto
  la primera de "Todas tus fotos" (no hay foto abierta); "Volver" (estilo y resultado) vuelve a Yo (`window.felicitacionOrigin`). **La felicitación creada se añade la primera a la cuadrícula de Yo.**
  Si la IA falla desde Yo: vuelve a Yo con un aviso. Se arregló la cuadrícula (`minmax(0,1fr)`; el texto largo ensanchaba la 1ª columna). `onboarding.css?v=14`, `yo.css?v=3`, `app.js?v=34`, `persona.js?v=36`.
- Pendiente: la foto de origen desde Yo es fija (la 1ª); habría que decidir si Yo → Felicitación debe primero pedir elegir una foto.

## Documentos: detalle (687:8746) y "eliminar foto por primera vez" (687:8416)

- El detalle de un documento es la misma pantalla `detalle-foto` (Felicitación / Eliminar / Volver / Compartir) — ya existía, sin cambios (la foto del frame mide 393×451; la nuestra 393×390, ver notas anteriores).
- **Eliminar foto ahora elimina de verdad:** "Eliminar foto" (aviso grande de la 1ª vez) y "Eliminar" (tarjeta compacta de las siguientes) llevan `data-eliminar-hecho`; `app.js` quita
  la tarjeta visible de la pantalla de origen (`detalleCards`) y vuelve. Otras pantallas con esa misma foto la conservan ("eliminar del álbum"). En el álbum nuevo actualiza el contador.
  Verificado en Mis documentos: 9 → 8 tarjetas.
- **Pollito del aviso corregido:** el recorte anterior (−63,91°) se veía boca abajo; ahora usa `pollito-pregunta-nombre.webp` (−50,99°) a la derecha, ×1,12 y en 147/143. `eliminar-foto.css?v=4`, `app.js?v=35`.

## Ajustes (Figma 692:2425)

Pantalla `ajustes`: "Yo" → botón "Ajustes" (`data-nav="ajustes"`) → cuatro filas de 68px (Cambiar teléfono, Ver términos y condiciones, Cerrar sesión,
Eliminar cuenta en rojo `--color-error`), iconos de Figma (`icon-phone/arrow-up-right/log-out/x-close-red.svg`), Volver → Yo. Estilos al final de `css/yo.css` (`?v=4`).
**Las filas todavía no llevan a ningún sitio** (llevan `data-ajustes="telefono|terminos|cerrar|eliminar"` para engancharlas): esperan las páginas de dentro.

## Ajustes → Cerrar sesión (Figma 746:3139)

Modal sobre Ajustes (reutiliza `.registro-modal-overlay`/`.registro-modal`, sin foto): "¿Quieres cerrar sesión?" / "Para entrar de nuevo tendrás que volver a introducir tu número." /
"Sí, cerrar sesión" (azul) / "Cancelar". Mecanismo genérico nuevo en `app.js`: `[data-modal-open="x"]` abre `[data-modal="x"]`, `[data-modal-close]` cierra (y navega si lleva `data-nav`).
**Supuesto:** "Sí, cerrar sesión" lleva a `registro-1` (valor + Entrar), el inicio del flujo de acceso; no cambia ningún dato. `app.js?v=36`.

## Ajustes → Eliminar cuenta (Figma 746:3229)

Segundo modal de Ajustes (mismo mecanismo `data-modal-open`): "¿Estás seguro de eliminar?" / "Si eliminas tu cuenta toda la información se perderá." / "Sí, eliminar cuenta" / "Cancelar".
**Supuesto:** "Sí" lleva a `registro-1` (inicio del acceso), como cerrar sesión; no borra nada del prototipo.

## Ajustes → Cambiar teléfono (Figma 746:3317)

Pantalla `ajustes-telefono`: copia de `registro-2` (mismo teclado y autorrelleno, porque lleva la clase `registro-2`) con el título "¿Cuál es tu nuevo número de teléfono?" y el subtítulo desplazado.
Fila "Cambiar teléfono" de Ajustes → aquí. **"Enviar código" ya lleva a `ajustes-codigo`**: no está definido qué viene después (el usuario dijo "después te lleva a esta" pero solo llegó una captura);
no se reutiliza `registro-3` porque terminaría en el modal "Ayúdanos" y el onboarding. `registro.css?v=13`.

## Ajustes → Introduce el código (Figma 746:3365)

`ajustes-codigo`: copia de `registro-3` sin el modal "Ayúdanos" (mismo teclado, 4 cajas, autorrelleno "6294" y "Reenviar código"). "Enviar código" de `ajustes-telefono` lleva aquí.
**Al completar el código (+0,9s) vuelve a Ajustes con un aviso "Teléfono guardado"** (decisión del usuario). No se vuelve a pedir el permiso de fotos: es del dispositivo, no del número (`scheduleModalReveal` en `app.js`): no hay diseño de confirmación posterior; provisional. `app.js?v=37`.

## Ayuda del pollito (avatar) + paso 5 del tour (sin Figma)

- **El avatar de arriba a la derecha ya no lleva a Yo: abre la ayuda** (`data-help`, 14 pantallas). Capa global creada desde `js/app.js` (`.ayuda-layer`, z-index 70): bocadillo "¿En qué te ayudo?", pollito y
  **3 opciones + Cerrar**: "Explícame esta pantalla" (texto corto por pantalla, `AYUDA_TEXTOS`; no repite el onboarding), "Hablar" (Web Speech API `es-ES`, palabras clave: álbumes/personas/documentos/ajustes/yo/inicio;
  sin soporte lo dice) e "Ir al inicio". Yo se abre solo desde el botón "Yo" de Home. **Diseño propio, no de Figma.** Pendiente: aparecer por inactividad (~20s) y qué hace "Hablar" con órdenes más libres.
- **Paso 5 del tour de Home (`onboarding-5`)**: destaca el avatar con "Pulsa aquí cuando necesites ayuda. Estaré contigo." Cadena 1→2→3→4→5→Home. Composición propia (copia del 4). `onboarding.css?v=15`, `app.js?v=39`, `personas.css?v=23`.

## Varios álbumes creados (arreglo)

Crear "Álbum nuevo" ya no sustituye al anterior: `window.NidoAlbums` (en `app.js`) guarda una lista de álbumes `{id, name, photos}`; cada creación añade una tarjeta nueva la primera de "Mis álbumes" (con `data-album-id`),
tocar su tarjeta abre sus fotos (`data-album-open`) en la pantalla única `album-nuevo` (que se rellena con el álbum abierto), "Añadir" copia las elegidas al álbum actual sin duplicar, la portada pasa a ser su 1ª foto
y el contador se actualiza; eliminar una foto la quita de ese álbum. Los nombres "oídos" rotan (`ALBUM_NOMBRES_DEMO`: Calle concordia, Vacaciones en Venecia, Cumpleaños de Clara, Domingo en familia).
El onboarding del álbum vacío solo sale con el primero. Verificado: 2 álbumes (uno con 2 fotos, otro vacío) y reabrir el primero. `app.js?v=40`, `persona.js?v=38`.

---

# Sesión 7 (21 sept) — Reconocimiento REAL de personas (face-api.js) + persona no reconocida

Cumple el recordatorio de la Sesión 4 ("pasar a face-api.js"). Todo en el dispositivo; ninguna foto sale a un servidor.

- **Librería y modelos dentro del proyecto** (sin CDN): `js/vendor/face-api.js` (@vladmandic/face-api 1.7.13) y `assets/models/` (SSD MobileNet + landmarks 68 + reconocimiento, ~12 MB). Se cargan la 1ª vez que se abre un detalle (`Reconocimiento.load()`).
- **`js/reconocimiento.js` (`window.Reconocimiento`)**: `detect(img)` (caras + huella de 128 números, foto reducida a 800px, con caché), personas guardadas en `localStorage` (`nido-personas-v1`, umbral de distancia 0,55; refuerza hasta 6 huellas por persona),
  `photosOf()` (recorre la biblioteca), `faceAt()`, y `bustPolygon()`: **contorno "busto" (cabeza + hombros) calculado desde la cara** — aproximado, no la silueta exacta; el trazo azul es el mismo de persona.js.
- **Flujo (`persona.js`)**: mantener pulsado 650ms en una foto SIN silueta hecha a mano (fotos reales de la galería, o fuera de una silueta) → `recognizeAt()` detecta la cara tocada ("Buscando a la persona…") → dibuja el contorno →
  si la huella coincide con una persona guardada: directo a "¿Quieres ver más fotos de X?"; si no: "No he reconocido a esta persona / Toca en el micrófono y dime quién es" (idea del usuario) → `hearName()` (voz del navegador; sin voz/permiso usa un nombre de ejemplo) → se guarda la persona,
  aparece su círculo en Personas (recorte con CSS) y se buscan sus fotos en la biblioteca (`refreshPersonPhotos`). Sin cara en ese punto: mismo aviso de no reconocida.
- Las siluetas hechas a mano con Vision (`PERSON_ZONES`) siguen para las fotos de ejemplo (conviven; las dos rutas terminan igual). Al meter las fotos reales de la familia convendría quitar las de ejemplo y depender solo del reconocimiento.
- **Bug encontrado**: soltar el dedo cancelaba el contorno si la detección tardaba poco (pulsación efectiva de 1,3s). Las zonas dinámicas ya no se cancelan al soltar.
- **Verificado en Chrome headless**: nombrar una cara en una foto de la galería → en otra imagen con la misma cara sale sola "¿Quieres ver más fotos de Ainhoa?" (1,4s), su ficha y su círculo. Primera detección ~19s en headless (CPU sin GPU + descarga de modelos); en un navegador con WebGL será mucho menos. **No probado**: caras distintas (falsos positivos), móvil real, Safari.
- Privacidad (para la memoria del TFM): las huellas faciales se guardan en el navegador de cada persona (`localStorage`), no en un servidor; borrar datos del sitio las borra. Falta una opción de "olvidar a esta persona".
- `reconocimiento.js?v=1`, `persona.js?v=42`.

## Álbumes final (Figma 649:7468) — decisiones del usuario (21 sept)

- **"Buscar" eliminado** de Álbumes (y de las copias en los onboardings de Álbumes): "Álbum nuevo" ocupa todo el ancho, como en Figma. `.albumes-search-btn` sigue existiendo solo en Yo (Ajustes) y en el detalle (Eliminar).
- **Segundo álbum = "Mis nietas · 55 fotos"** (antes repetía "Todas tus fotos · 104"). `albumes.css?v=10`.
- **"Ver términos y condiciones" se queda sin pantalla a propósito** (decisión del usuario): la fila está en Ajustes sin acción. No es un pendiente.

## Confirmaciones y errores (21 sept)

- **Tarjetas de Home:** son recuerdos al azar, no carpetas; la flecha ">" solo indica que se puede pulsar para abrir la foto. **Comportamiento actual correcto, sin cambios** (decisión del usuario).
- **"Foto eliminada · Deshacer"** (`nidoToast` en `app.js`, `.nido-toast`): tras eliminar, aviso 7s en la pantalla de origen; Deshacer devuelve la foto a su sitio (también en álbumes creados). Verificado en Mis documentos (9→8→9).
- **"Álbum «X» creado"** al crear un álbum. **Selector de fotos cancelado**: "Sin problema: de momento verás fotos de ejemplo." **Sin conexión / de nuevo con conexión**: avisos globales.
- Errores de la IA: ya existían (tarjeta con reintentar en el detalle; aviso al volver a Yo si falla desde Yo). `app.js?v=42`, `persona.js?v=43`, `personas.css?v=25`.

## Onboarding: posiciones exactas + efecto "aquí" (21 sept)

- **Los elementos destacados estaban desalineados** 2,7-7,3px (Home) y 3,6px (Yo) respecto al botón real de debajo, porque copiaban las cifras de cada frame de Figma (que difieren entre sí). Ahora `css/onboarding.css` (bloque final)
  fija cada uno a las medidas EXACTAS del botón real (medidas con offsetLeft/Top/Width/Height): Home 20/143/266 × 135, 107×86; Álbumes 353×90; álbum nuevo 168,5²; Yo 20/266 × 139; detalle 135, 90 de alto. Verificado con diferencia 0 en los 7 casos visibles (los pasos 2 ocultos de Yo/detalle usan las mismas cifras, sin medir).
- **Efecto de señalar** (referencia: vídeo de Mimo del 17-sep, aro morado alrededor del botón): aro azul fijo (`outline`) + halo blanco que se expande y desvanece en bucle (1,8s, como el pulso del micro) sobre todo `.onboarding-highlight` y el avatar del paso 5. Desactivado con `prefers-reduced-motion`. `onboarding.css?v=16`.
- Ajuste (mismo día, a petición del usuario): el aro y los halos pasan a **blanco** (el azul no se veía sobre el velo), aro separado 8px y halos que llegan a ~36px. `onboarding.css?v=18`.

## Órdenes por voz en la ayuda del pollito (21 sept)

`ayudaEntender()` en `app.js` (antes solo entendía nombres de pantalla): normaliza lo dicho (minúsculas, sin tildes) y decide por prioridad: **persona por su nombre** (de ejemplo o reconocida; `PersonaSelect.personIdByName`/`openPerson`) → "enséñame las fotos de Clara";
**álbum creado por su nombre**; "todas mis fotos"; **"crea un álbum"** (abre la pregunta por voz); **"hazme una felicitación"**; y pantallas (álbumes, personas, documentos, ajustes, yo, inicio). Si no entiende, dice lo que ha oído y sugiere 3 frases; muestra lo que va entendiendo mientras se habla (`interimResults`),
prueba las alternativas del navegador y da mensajes específicos para micrófono denegado / sin voz / sin conexión. Verificado el intérprete con 10 frases (9 acciones correctas y una rechazada). **El micrófono real no se ha probado** (Chrome headless no tiene). `app.js?v=43`, `persona.js?v=44`.

## Onboarding: botón de abajo alineado, texto con efecto y colas de bocadillo (21 sept)

- **Botón inferior** de todos los onboardings, de la pregunta por voz, del aviso de eliminar, de la ayuda y del registro: ahora **y=746, 68px**, igual que Volver/Compartir de las pantallas (antes 736-744 y 65-68px). Medido: 12 botones iguales.
- **Textos destacados** ("Todas tus fotos ›", "Mis recuerdos"): mismo aro blanco separado y halos que los botones.
- **Cola de bocadillo al revés** en 3 sitios (Álbumes paso 1, Álbumes paso 2, detalle paso 2): según Figma (`rounded-br/tl/tr`) la esquina cuadrada es la inferior IZQUIERDA. Corregido. `onboarding.css?v=20`.
- **Efecto "aquí" rehecho más limpio** (a petición del usuario, "como el efecto de la voz"): fuera el aro suelto y los halos en línea; ahora **dos bandas translúcidas concéntricas** (blanco 34 % dentro, 16 % fuera) que respiran despacio (1,8 s) alrededor del botón, del texto o del avatar, siguiendo su forma. `onboarding.css?v=21`. No se pudo abrir la grabación de pantalla del usuario (carpeta temporal protegida): se interpretó por su descripción.

## Álbumes y personas automáticos, voz real, texto duplicado de la IA (21 sept, tarde)

- **Al añadir fotos Nido organiza solo** (`app.js` + `persona.js`, evento `nido:gallery`): fechas por EXIF (`js/vendor/exifr.js`; sin EXIF, fecha del archivo — las capturas y reenviadas por WhatsApp no la traen), orden por más recientes,
  "Todas tus fotos" con su portada y contador reales, se quita el álbum de ejemplo inventado ("Mis nietas · 55"), y se crean **álbumes automáticos por año, Navidad (15-dic a 6-ene) y Verano (21-jun a 22-sep), mínimo 3 fotos**, colocados detrás de "Todas tus fotos" (`NidoAlbums.upsert` con clave).
- **Personas**: `Reconocimiento.organize()` recorre toda la biblioteca, agrupa las caras (umbral 0,55; ignora caras <6 % del ancho de la foto), reconoce las guardadas y crea personas SIN nombre cuando una cara sale en ≥2 fotos distintas. La pantalla **Personas se rehace**: fuera los círculos y grupos de ejemplo, círculos reales (recorte de la cara con CSS), grupos solo
  cuando se conocen los dos con nombre, y un mensaje de estado vacío. Las personas sin nombre se nombran con una pulsación larga sobre su cara (Nido pregunta "¿quién es?"); al nombrarlas se crea su álbum "Fotos de X". Aviso de progreso "Buscando personas… n de N".
- **Voz real** (`escuchar()` en `persona.js`): el nombre del álbum y de las personas se oye con el reconocimiento de voz del navegador (antes el álbum siempre se llamaba "Calle concordia"). Si no oye o falla el micrófono lo dice y deja reintentar; solo si el navegador no tiene voz usa un nombre de ejemplo. Verificado sin voz real (headless).
- **Texto duplicado de la IA** ("New Year Year"): los prompts de `crear-imagen.js` ya no nombran la ocasión (cumpleaños/Navidad/Año Nuevo), que hacía que el modelo dibujara su propio rótulo; se describe solo el aspecto y se pide un cielo continuo sin formas parecidas a letras. Probado con 4 generaciones de Año nuevo + 1 de cada otro estilo: sin texto en ninguna (7/7).
- Verificado con 3 fotos (mismas caras): álbumes "Todas tus fotos · 3", "2026 · 3", "Verano 2026 · 3", personas y toast de resultado. `app.js?v=45`, `persona.js?v=45`, `reconocimiento.js?v=2`.

## Sesión 8 (21-sep) · Asistente de voz con ElevenLabs Agents
- Decisión: voz predeterminada de ElevenLabs (Jessica), **sin clonar la voz de nadie** → la sección 12 del master doc (voz familiar) queda aparcada; desaparece el problema del consentimiento, sigue valiendo "el asistente no se hace pasar por una persona".
- Agente "Nidi" en ElevenLabs (`agent_6001m325cmttf4ns277mgny82k4d`, LLM Claude Haiku 4.5 por latencia ~0,7 s, español). Prompt con las reglas de la sección 9.
- Código: `netlify/functions/agente-voz.js` (URL firmada; usa el secreto `ELEVENLABS_API_KEY`), `js/agente.js` (conversación), `js/vendor/elevenlabs-client.js` (SDK empaquetado con esbuild, se carga solo al pulsar Hablar), integración en `app.js` (`ayudaHablar` → asistente; sin acceso cae al reconocimiento del navegador de siempre; pastilla "Nidi te escucha" cuando la capa de ayuda se cierra).
- El asistente no ve fotos: recibe por `sendContextualUpdate` pantalla, nombres de personas y álbumes (`NidoAgenteContexto`). Mueve la app con la herramienta cliente `abrir_en_la_app(pedido)`, que reutiliza `ayudaEntender`.
- Pendiente en el panel de ElevenLabs: crear la herramienta cliente `abrir_en_la_app` y cambiar la regla "no puedes abrir pantallas".
- Pendiente: guardar `ELEVENLABS_API_KEY` como secreto en Netlify y probar con micrófono real (Safari iOS).
- Clave de ElevenLabs `nido-netlify`: caduca a los 30 días (**21-oct-2026**), permisos solo ElevenAgents→Escribir, con tope de crédito. Al caducar, Hablar cae a la escucha del navegador. Renovar: crear otra clave y repetir `netlify-cli env:set ELEVENLABS_API_KEY "$(pbpaste)" --secret --context production` + redesplegar.
- Depuración de voz (21-sep): probado el agente por WebSocket con voz sintética (`say` → pcm 16 kHz): transcribe, llama a `abrir_en_la_app({pedido:"fotos de Clara"})` y responde bien → el backend está OK. En el iPhone se cortaba el saludo (eco del micrófono que interrumpía a Nidi + audio sin desbloquear dentro del toque). Arreglo en `agente.js`: `AudioContext.resume()` + `getUserMedia` dentro del toque, y `setMicMuted(true)` mientras Nidi habla (turnos claros, sin barge-in). El botón Hablar muestra "Habla ahora / Nidi te está hablando…".
- Coste Netlify: cada despliegue a producción gasta créditos (plan gratis 300/mes, ciclo 18-sep→17-oct); desplegar por bloques, probar antes en local.
- Onboarding paso 5 (ayuda): rehecho con la misma composición que el resto (pollito `2-v2` de frente abajo-izquierda, bocadillo `tail-bl` con esquina inferior izquierda recta). Antes era composición propia con el pollito de espaldas.
- Vídeo de bienvenida (`pollito-huevo.mp4`, 5 s, 24 fps): defecto en los fotogramas 67-71 (el pollito se emborrona y la cáscara cambia de forma de golpe; el resto es nítido). Probada interpolación por flujo óptico: deja doble imagen, se descarta. El fondo del vídeo (~242-247 gris claro) ya casi coincide con el degradado de la pantalla. Coherencia entre pollitos: `pollito-huevo` (más naranja y pequeño), `pollito-fotos` (más redondo y amarillo) y las poses del onboarding son personajes algo distintos → solución real = regenerar los clips con imagen de referencia del mismo pollito (imagen a vídeo, primer fotograma = la pose canónica).
- "Todas tus fotos" ya no lleva botón Añadir (es la galería del teléfono, las fotos entran solas). En álbumes automáticos (`album.auto`) tampoco; solo en los que crea la persona (`albumRender`).
- Bocadillo de respuesta/aviso (`.persona-ask__reply`): altura mínima en vez de fija (los avisos largos se salían); avisos de micrófono acortados a 3 líneas.
- Micrófono en iPhone (Web Speech): `not-allowed` = permiso denegado; `service-not-allowed` = dictado desactivado. Ajustes iPhone → Safari → Micrófono; Privacidad y seguridad → Reconocimiento de voz → Safari; General → Teclado → Activar dictado.
- Capa de ayuda rehecha según Figma "Ayuda 1" (594:7343) y "Ayuda 2" (594:7395): bocadillo blanco de Nidi (20,234, 209×90, esquina inferior dcha. recta), pollito, micrófono de 158 px (118,556) y Cancelar (736, 68 px). Al hablar: tu frase en bocadillo lila (20,133; esquina inf. izq. recta), respuesta de Nidi en blanco (51,251) y el botón pasa a "Gracias". Ya no hay los botones "Explícame esta pantalla" / "Ir al inicio": se piden hablando ("¿qué significa esto?", "llévame al inicio"). El avatar del pollito no se ha tocado. Recorridas las 32 pantallas sin errores de consola.
- Onboarding de Personas (Figma 806:7232): capa `.ob-personas` dentro de la pantalla, solo la 1ª vez (`personasOnboardingSeen`). Título "Grupos de personas" en blanco (20,131), bocadillo 245×90 (15,320, esquina inf. dcha. recta), pollito de espaldas `4-v2` (129,445, 264×330), Siguiente (20,736, 68 px). La pantalla de Personas de fondo ya coincidía con 806:7232.
- Aviso "Foto eliminada" / feedback (`.nido-toast`, Figma 803:7122): ahora abajo (top 747 px), 353×~60, radio 20, padding 20, texto 16 px; "Deshacer" en negrita y subrayado (no botón).
- Eliminar foto (759:4941): los botones suaves medían 52 px y Figma pide 68; tops corregidos (Eliminar foto 558, Cancelar 638, Volver 744); texto "¿Quieres eliminar la foto de la app?".
- Biblioteca real (21-sep): originales en `~/Desktop/TFM/fotos-reales/` (47 archivos, 5 duplicados exactos por md5 → 42 únicos: 38 fotos + 4 vídeos). Convertidas a JPG ≤1400 px con solo la fecha en el EXIF (sin GPS) → `assets/img/biblioteca/AAAA-MM-DD-NN.jpg` (7,9 MB); vídeos a 720 px, ≤10 s, sin audio (cv2 no lo conserva) → `assets/video/biblioteca/` (2,5 MB). `assets/biblioteca.json` la lista; `cargarBiblioteca()` (app.js) la carga al llegar a Home si la persona no ha elegido sus fotos, por el mismo camino que la galería (`cargarGaleria`). 34/38 fotos con fecha EXIF real; 4 (guardadas de WhatsApp/capturas) llevan la fecha del archivo (21-sep-2026).
- Prueba en headless con las fotos reales: 12 personas distintas detectadas (caras nítidas, umbral 0,55 y cara mínima 6 %), 5 álbumes automáticos (Navidad 2024 · Navidad 2025 · Verano 2026 · 2025 · 2026). Pendiente: nombres de las personas (hoja `~/Desktop/TFM/personas-detectadas.jpg`), tiempo de la primera detección en móvil, posibles personas partidas en dos.
- Corregido: la portada de un álbum salía rota si su primera foto era un vídeo (`albumSync` usa la primera IMG).
- Nombres de la biblioteca (dados por la usuaria sobre la hoja `personas-detectadas.jpg`): Clara nieta = personas 1 y 10; Carlos hijo = 5; Ana nieta = 6 y 12; Joaquín = 9; Sergio hijo = 8. Quedan sin nombre 2, 3, 4, 7 y 11 (para enseñar el nombrado por voz). Huellas en `assets/biblioteca-personas.json` (hasta 8 por persona), cargadas por `Reconocimiento.sembrar()` en `cargarBiblioteca()`: si ya hay una persona guardada con esa cara se le pone el nombre, no se duplica. Resultado con navegador limpio: 10 personas (5 con nombre), álbumes "Fotos de …" (Clara 11, Ana 8, Joaquín 5, Carlos 3, Sergio 2) y grupos "Clara nieta y Ana nieta", "Sergio hijo y Joaquín".
- Ojo al probar con Chrome de pruebas: las personas se guardan en localStorage entre pasadas; para orden estable, borrar el perfil (`rm -rf prof2`).
- Personas 7 y 11 = la misma (confirmado por la usuaria): semilla sin nombre con las huellas de ambas (`name: null` en biblioteca-personas.json); `sembrar()` ahora une todas las personas guardadas con esa cara.
- **Bug corregido**: la misma foto salía contada 2-3 veces (rejilla, carrusel de Home y selector creaban una URL distinta por archivo) → álbumes de persona inflados y un grupo falso ("Sergio hijo y Joaquín", una sola foto). Ahora una URL por archivo (`urlDeArchivo`, WeakMap). Cifras reales con fotos únicas: Clara 9, Ana 7, Joaquín 3, Carlos 2, Sergio 1; solo queda el grupo "Clara nieta y Ana nieta". Las caras que salían en una sola foto ya no se convierten en "persona sin nombre" (hacen falta ≥2 fotos distintas).
- Umbral MATCH_DIST 0,55 mantenido: 0,50 pierde fotos correctas (Ana 7→3). Fallo conocido: "Fotos de Joaquín" incluye la foto 2025-09-24-01 (señora con gato) — probablemente la misma señora de 7+11, parecida a Joaquín en la huella; se arreglaría añadiendo su cara a la semilla sin nombre si la usuaria lo confirma.
- La señora del gato (2025-09-24-01) = misma que las personas 7 y 11 (confirmado). El falso positivo en "Fotos de Joaquín" NO era ella: el detector marcaba **la cara del gato** como persona (2.ª cara de la foto, 13,8 % del ancho) y se parecía a Joaquín. Arreglo: `minConfidence` del detector SSD de 0,5 a 0,75 en `reconocimiento.js` (probado: solo se pierde esa foto; Clara 9, Ana 7, Carlos 2, Sergio 1, Joaquín 2). Añadida además la cara de la señora a la semilla sin nombre (4 huellas).
- **Netlify: cambio de cuenta (21-sep, noche).** La cuenta antigua (equipo "mucoai's team", sitio `zingy-monstera-08c616`) agotó los 300 créditos del mes (ciclo 18-sep→17-oct) por ~16 despliegues en un día; quedó con 30 créditos operativos y los despliegues a producción pausados. Nuevo sitio en la cuenta `ainhoamcopel@gmail.com` (equipo Barreira, plan Free): **https://nido-0921-22084.netlify.app** (site id 13deb3cf-ca46-4ae5-90e3-48c3e52a4129). Creado con `~/Desktop/TFM/mover-a-otra-netlify.sh` (crea sitio, pone CLOUDFLARE_* y ELEVENLABS_API_KEY como secretos, publica y comprueba). Para desplegar: `cd ~/Desktop/nido-netlify && npx netlify-cli deploy --prod --dir=. --functions=netlify/functions --site 13deb3cf-ca46-4ae5-90e3-48c3e52a4129` (necesita `netlify login` con esa cuenta). **Regla: un despliegue por bloque de cambios cerrado; probar antes en localhost.** Cada visita a Home descarga ~10 MB de biblioteca (gasta ancho de banda). Clave ElevenLabs nueva: caduca a los 30 días (~21-oct).
- **Bloque 22-sep (noche): cambios tras probar en móvil real.**
  - Vídeo de bienvenida: arranque automático por código (`play()` en loadeddata/canplay/pageshow + primer toque si Safari lo bloquea; con el modo de bajo consumo del iPhone Safari NO deja autoplay: sale la portada y arranca al tocar; si en 10 s no arranca pasa solo a pre-registro).
  - Mis recuerdos: vídeos y fotos alternados (hasta 4 vídeos), con portada (`nidoPoster`, del `biblioteca.json`) y reproducción muda en bucle; los vídeos usan `#t=0.001` para que Safari pinte el primer fotograma (antes tarjetas grises).
  - Pantalla de persona: `refreshPersonPhotos` ya no vacía la lista si la búsqueda falla (móvil justo de memoria); sin fotos no se pinta "assets/img/undefined"; personas reales muestran cada foto una vez y "Todavía no hay vídeos de esta persona."; las personas de ejemplo dejan de contar (`hayReales`) para que "fotos de Clara" abra a Clara nieta.
  - Asistente de voz: nueva herramienta cliente **`gestionar_albumes`** (acciones crear / anadir / renombrar; criterio: persona, año, navidad, verano, vídeos, todas) → `gestionarAlbumes()` en app.js. "Crea un álbum llamado X" ya crea el álbum con ese nombre (antes reabría el flujo que pregunta el nombre). Si el micrófono falla al poner nombre (permisos/dictado o 2 fallos), el álbum se crea igualmente como «Álbum N» y se abre.
  - Botón "Añadir" devuelto a todos los álbumes salvo "Todas tus fotos".
  - Peso de la biblioteca: fotos a 1000 px, q78, progresivas (7,9 → 3,8 MB); huellas recalculadas (`biblioteca-personas.json`; las huellas cambian con la resolución de la foto). Cifras: Clara 9, Ana 9, Joaquín 2, Carlos 1, Sergio 1. Detección cede el paso al móvil entre fotos (25 ms).
  - PENDIENTE en ElevenLabs (lo hace la usuaria): crear la herramienta `gestionar_albumes` y actualizar el prompt (ver mensaje).
- Desplegado (22-sep): además, si el asistente crea el álbum por `abrir_en_la_app`, `ayudaEntender` parte «llamado X con las fotos de Y» en nombre + criterio y le devuelve al asistente el resultado real (`ultimoResultadoAlbum`). Comprobado hablando con el agente por WebSocket (texto): con el prompt nuevo llama a `gestionar_albumes` (crear/Vacaciones/Clara). Prompt: nunca crear/cambiar/borrar álbumes sin que se lo pidan.
- **Crash en iPhone (22:58): Safari "ha generado problemas repetidamente" = la página se cerraba por memoria/decodificadores de vídeo.** Causa: demasiados vídeos activos a la vez (12+ de la biblioteca con preload=auto, más 6 copias del recuerdo en bucle `pollito-loop.mp4` —Home + 5 tutoriales— que se reproducían aunque estuvieran ocultas). Arreglo: vídeos de la biblioteca con `preload=none` + portada (sin reproducir); copias de los tutoriales pausadas salvo la pantalla visible; el recuerdo de ejemplo "Un día especial" vuelve al carrusel (2.ª posición) y es el único que suena solo (portada `assets/img/recuerdo-boda-poster.jpg`). Con esto: 1 vídeo reproduciéndose en Home.
- Vídeos de bienvenida y pre-registro: `videoConRespaldo()` → si el navegador bloquea el vídeo (modo de bajo consumo), se muestra la misma animación como WebP animado (`assets/video/pollito-huevo.webp` 0,65 MB, `pollito-fotos.webp` 1,1 MB) y se avanza por temporizador (5,3 s / 3 s). Antes pre-registro llamaba a `play()` sin capturar el rechazo y se quedaba parado. Probado con `HTMLMediaElement.prototype.play` rechazando: bienvenida → pre-registro (~6 s) → registro-1 (~11 s).
- **Página "muerta" al abrir en móvil**: `face-api.js` (1,3 MB) se cargaba como script bloqueante antes de `app.js`; tras un despliegue la 1.ª descarga puede tardar decenas de segundos (caché fría del CDN: medido 58 s vs 0,7 s la 2.ª vez) y la app no respondía a nada hasta terminar. Ahora `reconocimiento.js` lo descarga aparte la 1.ª vez que hace falta (`cargarLibreria()`), y `exifr` va con `defer`. Los 12 CSS siguen siendo bloqueantes (candidato a unir en uno).
- Asistente de voz probado con Chrome + micrófono de prueba (con audio sin silenciar: sonó en el portátil de la usuaria; **usar siempre `--mute-audio`**): conecta y saluda en ~2,4 s (getUserMedia 0,5 s · URL firmada 1,5 s · WebSocket 0,3 s). Si Safari niega el micrófono, mensaje con los pasos («aA» → Ajustes del sitio web → Micrófono → Permitir) en vez de caer al reconocimiento de Safari; aviso si la conexión tarda >7 s.


## Estado al cierre del 22-sep (noche) — qué hay, qué está publicado y qué falta

**Publicado en Netlify (sitio nuevo) — última versión desplegada:** todo lo de arriba hasta "Página muerta al abrir en móvil" (app.js v60, reconocimiento.js v6, persona.js v49, agente.js v5).
**Solo en local (nada pendiente de publicar ahora mismo):** ninguno; la carpeta de despliegue y el proyecto están sincronizados.

**Hecho hoy:** biblioteca real (38 fotos + 4 vídeos) con personas con nombre y álbumes automáticos; asistente de voz ElevenLabs (Nidi) con herramientas `abrir_en_la_app` y `gestionar_albumes` (crear/añadir/renombrar); capa de ayuda según Figma; tutorial de Personas; aviso "Foto eliminada" y botones de eliminar foto según Figma; botón Añadir en todos los álbumes menos "Todas tus fotos"; vídeo de bienvenida con respaldo animado; correcciones de memoria/crash en iPhone; cambio a cuenta Netlify nueva.

**Pendiente / por confirmar en el iPhone real:** que la página ya no se cierre sola; cuánto tarda en salir "He encontrado 7 personas"; si el vídeo del inicio arranca (o se ve la animación de respaldo); si el asistente responde (y permiso de micrófono de Safari); si la herramienta `gestionar_albumes` crea/añade/renombra bien; capas nuevas vs Figma.
**Otros pendientes:** vídeo de bienvenida más fluido y pollito consistente (regenerar clips con imagen de referencia); nombre de la señora de las personas 7/11; unir los 12 CSS en uno para cargar más rápido; onboarding con botón alternativo a "mantén pulsado"; pollito de ayuda tras ~20 s de inactividad; anterior/siguiente en detalle de foto; auditoría de textos pequeños; recuerdos en vídeo; privacidad en la memoria del TFM (fotos y nombres en un sitio público; huellas faciales en el navegador). La clave de ElevenLabs caduca ~21-oct.

## Onboarding 1-4: pollito nuevo y burbujas recolocadas (24-sep)

- Figma actualizado en `759:4445`, `759:4520`, `759:4608`, `759:4688` (mismo archivo Prototipo). Cambian las 4 poses del pollito y las burbujas bajan a y=426-461.
- Pollitos nuevos: `assets/img/pollito-onboarding-{1,2,3,4}-v3.webp` (WebP con transparencia, 14-16 KB, calidad 90). Salen de los PNG originales de Figma (1024², RGBA) con la transformación real del frame (espejo, giro −7,15° en el 2, −0,52° en el 3) **ya aplicada en la imagen**; por eso `.ob-step-3 .onboarding-pollito` ya no lleva `transform: rotate`. Método: emparejar por SIFT el PNG original contra la exportación 2× del frame y volver a proyectarlo (error medio ≈0,5-1/255 en los píxeles del pollito).
- La caja CSS de cada pollito es el contorno visible (recorte al alfa), no la caja del frame de Figma: 1 → 179, 553,5, 197,5×193,5 · 2 → 37,5, 545,5, 189×203 · 3 → 32, 536,5, 196×217,5 · 4 → 177,5, 536, 175×209,5.
- Burbujas (px del lienzo 393×852): 1 → 84, 461 (192×70, cola abajo-dcha.) · 2 → 133,5, 436,5 (216×90, cola abajo-izq.) · 3 → 125, 426 (248×90, cola abajo-izq.) · 4 → 34, 426 (216×90, cola abajo-dcha.). Colas y textos ya estaban bien; solo cambian posiciones.
- `css/onboarding.css?v=26`. El paso 5 (ayuda) sigue con `pollito-onboarding-2-v2.webp`; los `-v2` no se han borrado porque otras pantallas los usan.
- Botón "Siguiente" de los pasos 1-5: vuelve a y=736 como Figma (`.ob-step-N .onboarding-cta`, `?v=27`), para que el pollito quede sentado sobre él (los pies lo pisan ~10px). El 746 de las demás pantallas (Volver/Compartir) no cambia: allí sí hay pantalla real debajo. El pollito del paso 5 sube 10px para conservar su relación con el botón. El halo "aquí" se mantiene (decisión anterior); es la única diferencia que queda frente a Figma.
- Verificado renderizando en local (Chromium aislado) y comparando con las exportaciones de Figma.
- **Avatar nuevo (24-sep):** `assets/img/avatar-pollito.png` ahora es `~/Desktop/TFM/pollito/avatar.png` (128×128, cara del pollito con el anillo azul ya dentro, como "Ellipse 1" de Figma). El de antes (400 px, pollito entero) queda en `_archive/avatar-pollito-cuerpo-entero-400px.png`. `.avatar--ring` (`css/base.css?v=14`) ya no dibuja su borde azul de 3px para no duplicar el anillo. Las 23 referencias en `index.html` pasan a `?v=4`.
- **Pollitos al mismo tamaño en todo el tour (24-sep):** el del paso 5 (y los de Álbumes 1-2, Yo 1-2, Detalle 1-2 y Álbum nuevo) eran ~250×265 px, casi un 30 % más grandes que los nuevos. Ahora usan los sprites `-v3` según la pose: waving abajo-izq. (`3-v3`) en paso 5, Álbumes 1-2 y Yo 1; `2-v3` en Yo 2 y Detalle 2; `1-v3` en Detalle 1 y Álbum nuevo. Pies sobre el botón: mismas coordenadas que los pasos 1-3, con +10px en las pantallas cuyo botón está a 746 (Álbumes, Yo, Detalle). El de Personas sigue siendo `4-v2` (de espaldas) a 0,8× con los pies a ~754px. Solo se movió una burbuja: la del paso 5 (top 425,5px, a 20px de la cabeza del pollito). Las burbujas de las demás pantallas siguen en las posiciones de sus frames de Figma, así que en algunas quedan más separadas del pollito; se recolocarán cuando lleguen sus frames nuevos. `onboarding.css?v=28`, `personas.css?v=37`.
- **Burbujas pegadas al pollito en todo el tour (24-sep, tarde):** en Álbumes 2 la burbuja quedaba junto a «Todas tus fotos» y lejos del pollito. Regla única, la misma de los pasos 1-4: la burbuja termina 20px por encima de la cabeza del pollito (top = top del pollito − 20 − alto de la burbuja), sin tocar su `left`. Aplicada a Álbumes 1-2, Yo 1-2, Detalle 1-2, Personas y Álbum nuevo (`onboarding.css?v=29`, `personas.css?v=38`). Los comentarios `/* x, y, w×h */` de esas burbujas siguen con las coordenadas viejas de Figma. Cuando lleguen los frames nuevos de esas pantallas, prevalecen sobre esta regla.
- **Pilas de álbumes con las fotos de cada álbum (24-sep, tarde):** antes solo "Todas tus fotos" cambiaba la carta girada de detrás; los demás álbumes arrastraban la foto de relleno `album-paella.webp`. Ahora `albumSync` (app.js) pone delante la 1ª foto y detrás la **2.ª foto (imagen)** del álbum, mediante `albumStackTrasera()`. Con una sola imagen (o ninguna) la pila lleva `.album-stack--single` y **no se dibuja la carta de detrás** (`css/albumes.css?v=11`, `app.js?v=62`). Decisión: una pila con la misma foto repetida, o con una foto de relleno, insinuaría que hay más contenido. Un vídeo no cuenta como carta (no se pinta como imagen): un álbum con vídeo + 1 foto se ve como una sola carta. Las dos tarjetas de ejemplo estáticas del HTML (sin `data-album-id`) no se tocan.
- **Ayuda del avatar con la composición de Figma `814:13870` "02.2.2_Foto" (24-sep, tarde):** el avatar abre `ayuda-layer` (app.js `ayudaBuild`). Ahora, en su primera pantalla, lleva dos bocadillos como el frame: saludo `¡Hola! ¿En qué te puedo ayudar?` (redondo, 20,69, 209×90, fijo) y debajo el bocadillo de Nidi (20,171, cola abajo-dcha.) con `Pulsa en el micrófono y dime qué necesitas.` y los avisos («Te escucho…», «Conectando…», errores de micrófono). Los textos de Figma eran de otro flujo (nombre: «Cuéntame un poco de ti» / «dime cómo te llamas»); estos son los equivalentes para pedir ayuda. Pollito nuevo `assets/img/pollito-ayuda-v3.webp` (contorno visible con el giro de −4,97° aplicado, 145,272, 248×262, recortado por el borde derecho) y micrófono a 117,5×548,5. Con respuesta (`--respuesta`, «Ayuda 2») el saludo se oculta y queda como antes (bocadillo lila + respuesta + «Gracias»). «Cancelar» sigue a 746/68px (Figma 744,5). `personas.css?v=39`, `app.js?v=63`. `pollito-pregunta-nombre.webp` sigue en la pantalla de nombrar personas y en Eliminar foto.
- **«Enviar código» (registro-2 y ajustes-codigo):** la flecha pasa a la derecha del texto (`btn--icon-trailing`, como «Siguiente →»); a la izquierda solo van las de volver («← Volver»).
- **Título «Grupos de personas» del tour de Personas = «Mis recuerdos» del paso 4 (24-sep):** `.ob-personas__title` ocupaba los 353px de ancho y sin esquinas redondeadas, así que el halo «aquí» salía como un rectángulo. Ahora es `width: fit-content`, con el mismo aire (padding/margen negativo), radio de 12px y sin sombra de texto que `.ob-step-4 .onboarding-glow-title` (`onboarding.css?v=30`). Queda en x=20 (Figma 806:7232), el del paso 4 en x=24 (Figma 759:4688).
- **Álbumes 2, burbuja vuelve a su sitio de Figma (24-sep):** con la regla de «20px sobre la cabeza» la burbuja quedaba pegada al halo de «Todas tus fotos». Se devuelve `.ob-albumes-2 .onboarding-tooltip` a 156,309 (Figma 765:5243: arriba a la derecha, sobre el texto destacado) y solo esa pantalla sale de la regla; el pollito nuevo se queda. `onboarding.css?v=31`. Criterio para el resto: si la burbuja tiene que señalar un elemento destacado que está cerca (como aquí), manda su frame de Figma; si solo acompaña al pollito, va a 20px de su cabeza.
- **Pantalla «Hola, soy Nidi» (registro-nidi, Figma 765:5974) con el pollito nuevo (24-sep):** `assets/img/nidi-saludando-v3.webp` (contorno visible de la pose, sin giro, 642×577 a 2×) en 33,5 · 480,5 · 321×288,5 (`registro.css?v=16`); el `nidi-saludando.webp` de antes ya no se usa aquí. Comparado con el frame: solo difieren los bordes.
- **Orden del flujo (sin cambiar todavía):** hoy va huevo (`bienvenida`) → teléfono (`registro-2`) → código (`registro-3`) → modal de la galería → `registro-nidi` → loader `registro-4` → tour. Recomendación dada a la usuaria: `registro-nidi` justo después del huevo (numeración de Figma: `01.1a_log in (splash)` va antes de `01.1b_log in`). Cambiar = `bienvenidaVideo`/`videoConRespaldo` → `registro-nidi`; `registro-nidi` (timer `enterRegistroNidi` y `data-nav`) → `registro-2`; los dos botones del modal (`data-nav="registro-nidi"`, index.html ~210 y ~214) → `registro-4`.
- **Orden del registro CAMBIADO (24-sep):** ahora huevo (`bienvenida`) → **`registro-nidi`** → teléfono (`registro-2`) → código (`registro-3`) → modal «Ayúdanos» → loader (`registro-4`) → tour. Cambios: `bienvenidaVideo` y `videoConRespaldo` → `registro-nidi`; `enterRegistroNidi` y `data-nav` de la pantalla → `registro-2`; los dos botones del modal → `registro-4`. Comprobado con un recorrido completo en local (5,3 s huevo → 3,3 s Nidi → teléfono → código → modal → loader → `onboarding-1`, sin errores). «Cerrar sesión» y «Eliminar cuenta» siguen llevando directos a `registro-2` (no repiten el saludo). `app.js?v=64`. Sustituye a la nota anterior de «sin cambiar todavía».
- **Todas las burbujas con el mismo aire arriba y abajo (24-sep):** token `--bubble-pad-y: 0.75rem` (12px) en `tokens.css`; alto = texto + 24px (2 líneas = 69px, 3 = 91,5px), **sin alto ni min-height fijos**. Aplicado a los `onboarding-tooltip` (todas las pantallas del tour), `ayuda-layer__bubble` (saludo, Nidi, tú), `persona-ask__bubble` / `--confirm` / `__reply` (también en `.is-confirming`) y `eliminar-foto-bubble`. Los anchos y el padding horizontal siguen los de Figma. Las burbujas con cola abajo conservan su borde inferior (por eso el `top` de cada una cambió unos px, ver comentarios) para no separarse del pollito: paso 5 pasa de 91 a 69px de alto (era el caso de la captura). En «Ayuda» y en las preguntas por voz el par de burbujas queda a 12px entre sí; el 1.º de `persona-ask` va anclado por abajo (`bottom: calc(100% - 15.9375rem)`) para que su versión de 3 líneas («¿Cómo quieres llamar a tu nuevo álbum?») crezca hacia arriba y no pise al 2.º. Ojo: en Ayuda 1 y en las preguntas por voz esto se aparta de Figma (bocadillos de 90px con 2 líneas); es lo que pidió la usuaria. `onboarding.css?v=32`, `personas.css?v=41`, `tokens.css?v=8`, `eliminar-foto.css?v=9`.
- **Polaroids del modal «Ayúdanos» (24-sep):** `assets/img/registro-polaroid-photos-v2.webp` (944×544, transparente, 62 KB; salida de `~/Downloads/ChatGPT Image 24 sept 2026, 17_39_43 1.png`, 3304×1904, mismo aspecto que la caja de 236×136) sustituye a `registro-polaroid-photos.webp` (que queda en la carpeta, sin uso). Sin `?v=` porque el nombre ya es nuevo.
- **Aviso «Sin problema: de momento verás fotos de ejemplo.» ya no interrumpe el alta ni el tour (24-sep):** salía 600 ms después de cerrar el selector de fotos (que se abre al pulsar «Permitir») y duraba 5 s, encima de «Siguiente». Ahora, si se cierra el selector estando en `registro-*` u `onboarding-*`, se guarda (`avisoGaleriaPendiente`) y sale al llegar a Home (0,9 s después, 3,5 s de duración). Si se cierra ya fuera del tour, sale enseguida pero con 3,5 s. Probado en local con el evento `cancel`: nada durante el tour; en Home aparece a ~1 s y se va a los ~4,5 s. `app.js?v=65`.
- **Aviso de la galería, ahora SOLO en la pantalla de carga (24-sep, 2.ª versión; sustituye a la nota anterior de «aplazar a Home»):** al pulsar «Permitir» se abre el selector del sistema y a la vez se entra en `registro-4`; ahora esa pantalla **espera a que el selector se cierre** (`galeriaAbierta`, `splashSelectorCerrado`, `app.js?v=66`). Cerrar sin elegir → «Sin problema: de momento verás fotos de ejemplo.» sobre la carga y el tour empieza 4 s después (`REGISTRO_SPLASH_AVISO_MS`). Elegir fotos → sigue como antes (mín. 1,8 s de carga). «Quiero saber más» (sin selector) → 1,8 s como siempre. Tope de 12 s (`REGISTRO_SPLASH_TOPE_MS`) por si el navegador no avisa del cierre o tarda mucho eligiendo. Si el cierre llega ya durante el tour, no sale nada; fuera del alta/tour (p. ej. desde Álbumes) el aviso sale enseguida, 3,5 s. Probado en local: cancelar → aviso + tour a los ~4 s; elegir foto → tour a 1,8 s; sin selector → 1,8 s; sin evento → tour a los 12 s.
- **Preguntas por voz con la composición de la Ayuda (24-sep):** las dos capas `persona-ask` (nombre del álbum `data-album-ask` y nombre de una persona `data-persona-ask`) ya no llevan el pollito grande de estrellas: usan `pollito-ayuda-v3.webp` en su sitio (145,272, 248×262), micrófono a 117,5×548,5 y la pareja de bocadillos con el borde inferior del 2.º a 261px (1.º anclado por abajo, 12px encima). Mientras la app «oye» (`.persona-ask__reply` visible), la frase oída (lila) ocupa el sitio del 1.º (`:has(...)`) y el 2.º se queda debajo, como Ayuda 2; al confirmar el nombre del álbum, la pregunta «¿Quieres que tu álbum se llame así?» ocupa el sitio del 2.º. **No tocada aún:** la capa «Eliminar foto» (`eliminar-foto-layer`), que tiene otra estructura (bocadillo + dos botones) y sigue con `pollito-pregunta-nombre.webp`.
- **«Llevas un rato aquí» (Figma 847:2539) = pollito de ayuda por inactividad (pendiente antiguo de las notas):** tras `IDLE_MS = 20000` sin tocar nada (`pointerdown/touchstart/keydown/wheel/scroll`, y cambiar de pantalla también cuenta) se abre `ayuda-layer` con la clase `--inactividad`: un bocadillo («Llevas un rato aquí. Toca el micrófono si quieres que te ayude.», borde inferior a 259,4px) y la pose que guiña (`assets/img/pollito-inactividad-v3.webp`, 116,279,5 · 241,5×256,5, giro −4,97° incluido). Micrófono y Cancelar como la Ayuda; tocar el micrófono sigue el flujo normal. Reglas: una vez por visita a cada pantalla (`idlePantalla`), nunca en `bienvenida`, `registro*`, `onboarding*`, `ajustes-codigo/telefono`, `detalle-foto`, ni con otra capa/modal/aviso abierto ni con la conversación de voz en marcha (`IDLE_SIN_AYUDA`, `IDLE_CAPAS` en app.js). Probado en local: 21,5 s quieto en Álbumes → sale; Cancelar → no se repite en esa pantalla; Home tras cambiar → sale; tour → no sale. Bug cazado al probar: `IDLE_MS`/`idleTimer`/`idlePantalla` deben declararse arriba (showScreen se ejecuta al cargar, antes que el bloque de la ayuda: TDZ). `app.js?v=67`, `personas.css?v=43`.
- **Revisión de los flujos 02.2.1 «Crear álbum» y 02.4.2 «Ajustes» contra Figma (24-sep):** recorridos con toques reales en local (Playwright). **Crear álbum**: Álbumes → «Álbum nuevo» → pregunta por voz → escuchando → confirmar → «Sí, crear álbum» → álbum vacío + tour («Pulsa aquí para añadir imágenes al álbum» → Aceptar) → «Añadir» → «Elige las fotos a añadir» → seleccionar → «Añadir» → álbum con fotos: las 7 pantallas de Figma existen y se encadenan. **Bug encontrado y arreglado:** «Sí, crear álbum» (`.persona-ask__crear`) estaba a 746px, exactamente donde «Cancelar», que lo tapaba: en el móvil no se podía tocar (mi ajuste de «mismo y que los botones de abajo» lo movió). Ahora va a 662px (746 − 68 − 16), encima de Cancelar, como en Figma. `personas.css?v=44`. **Ajustes**: Ajustes → Cambiar teléfono → Enviar código → código (autorrelleno) → vuelve a Ajustes con «Teléfono guardado»; Cerrar sesión (modal → «Sí, cerrar sesión» a `registro-2` / Cancelar); Eliminar cuenta (modal → `registro-2` / Cancelar). «Ver términos y condiciones» no lleva a ninguna pantalla (no hay frame en Figma).
- **«Elige un estilo» con los pollitos de Figma 891:4115 (24-sep):** las 4 tarjetas usan ahora `assets/img/felicitacion-{cumpleanos,aniversario,anonuevo,navidad}-v2.webp` (WebP con transparencia a 3×; salen de los PNG que exporta Figma: 1024×572, pensados para ESTIRARSE a la caja 131/148/152 × 134 → `object-fit: fill` en `.felicitacion-card__img`, ya no `width:auto`). Cumpleaños = gorro de fiesta, Aniversario = tarta con los dos pollitos casándose, Año nuevo = gafas 2026 + matasuegras, Navidad = gorro de Papá Noel (la misma imagen que `~/Desktop/TFM/pollito/quitale el gorro y ponle un gorro de papa noel … (1).png`, la antigua era un pollito peludo con disfraz). Clase `--w134` → `--w148` (Aniversario mide 148, no 134). La pregunta «¿Qué tipo de felicitación quieres crear?» pasa a 18px y una línea (353px), como en 891:4119 (antes 20px en dos líneas, 733:2997): las tarjetas suben 20px y quedan donde Figma. `personas.css?v=46`. Diferencia que queda: en ese frame la cabecera (título y avatar) está ~5px más arriba que en el resto de pantallas; se ha dejado a 56/74px como las demás (consistencia dentro de la app). Los antiguos (`felicitacion-*.webp`, sin `-v2`) siguen en la carpeta, sin uso.

## Sesión 9 (24-sep) · Nidi nuevo: herramientas + arreglos tras la verificación en navegador

- **Qué hay:** 10 herramientas cliente (`abrir_en_la_app`, `gestionar_albumes` en `agente.js`; `ver_contexto`, `abrir_persona`, `nombrar_persona`, `ver_foto`, `abrir_foto`, `senalar`, `crear_felicitacion`, `subir_fotos` en `agente-acciones.js`), visión en `netlify/functions/ver-foto.js` y todo lo que hay que pegar en ElevenLabs en `agente/` (`PROMPT.md`, `HERRAMIENTAS.md` —generado desde `agente/fuente/herramientas.json` con `node agente/fuente/generar.js agente/HERRAMIENTAS.md`; se edita el JSON, nunca el .md a mano—, `LEEME.md` con claves, privacidad y 26 pruebas para el iPhone). El agente se crea a mano en el panel; nada desplegado.
- **Arreglos tras las pruebas (e2e, visión, revisión)**, todos vueltos a probar en Chromium sin ventana contra una copia del servidor (`PORT=8998 node servidor-local.mjs`, parada al acabar):
  - Las herramientas que abren algo (`abrir_persona`, `abrir_foto`, `nombrar_persona`) cierran antes la capa de ayuda: la ficha/foto quedaba detrás del velo y «Cancelar» cortaba a Nidi. `abrir_foto` espera a que la foto esté abierta de verdad.
  - Pastilla «Nidi te escucha» **arriba**, sobre la barra de estado (`personas.css?v=47`): abajo tapaba «Elegir fotos» (tocarla terminaba la conversación), «Ver más vídeos» y parte de «Ver más recuerdos».
  - Ficha abierta: `personaAbiertaId` se apunta solo en `fillPersonaScreen` (también desde la cara de una foto → «Sí, enséñame más»); un refresco tardío no pinta encima de otra ficha. `nombrar_persona` solo guarda en la ficha que se ve (antes renombraba la última abierta desde Home). Si la abre Nidi, no llega el aviso duplicado «pregúntale quién es» (`window.NidoAgenteFichaPreguntada`).
  - Nombres: deletreo junto («J-O-S-É» → «José»), parentesco en minúscula («Maite cuñada»), «Ana» con «Ana nieta» ya en la lista se rechaza con pregunta; `personIdByName` da prioridad al nombre completo exacto.
  - Cifras de personas: `Reconocimiento.photosOf` usa el mismo criterio que `organize` (cara ≥ 6 % y más parecida a esa persona que a ninguna otra; `reconocimiento.js?v=7`). Antes Clara pasaba de 9 a 12 al abrir su ficha.
  - `gestionar_albumes`: nombre de álbum estricto en todas las acciones («Casa de verano» ya no cae en «Casa»; se ignoran «el álbum de…» delante), renombrar a un nombre existente se rechaza, crear con criterio no entendido o sin foto abierta no crea nada, «estas fotos» dentro de un álbum = las de ese álbum, «4 vídeos» en vez de «4 fotos».
  - Con Nidi hablando: sin tours de primera vez (detalle, álbum nuevo, Personas, Yo; no se dan por vistos) y «crea un álbum» sin nombre ya no abre la pregunta vieja con otro micrófono.
  - Subir fotos **suma** a las que hay (antes sustituía: 42 → 2); cerrar el selector desde el botón de Nidi o con fotos propias ya no enseña «verás fotos de ejemplo».
  - `senalar`: parcial solo con ≥ 3 letras y al principio de una palabra. `ver_foto`: guarda para Safari sin `AbortSignal.timeout`.
  - `ver-foto.js`: modelos `gemma-4-26b-a4b-it` (mediana 2,3 s) y de respaldo `gemini-3.5-flash-lite` (mediana 11 s); plazo total 18 s (Netlify deja hasta 60 s a una función síncrona; comprobado en la web publicada: crear-imagen 9,6 s → 200), sin reintentar tiempos agotados ni cuota diaria; quita las partes de razonamiento y descarta respuestas cortadas; cada nombre va con su posición («a la izquierda, la 1.ª de 4…») y el prompt prohíbe poner un nombre dudoso; JSON no-objeto → 400. `servidor-local.mjs`: `PORT` configurable y una función que falla responde 500 en vez de tumbar el servidor.
- Versiones: `app.js?v=70`, `persona.js?v=55`, `agente-acciones.js?v=3`, `agente.js?v=7`, `reconocimiento.js?v=7`, `personas.css?v=47`.
- **Pendiente:** reiniciar el servidor del 8990 (arrancó antes de que existiera la ruta de `ver-foto`: da 404); crear el agente y las 10 herramientas en ElevenLabs; probar con voz real en el iPhone; `js/vendor/tfjs-backend-wasm-simd.wasm` no existe (404 en consola, anterior a esta tarea).

### 25-sep · Poner nombre: se guarda al momento y se deja corregir (decidido con la usuaria)
- Problema: una persona mayor dice el nombre, cree que ya está guardado y no contesta al «¿lo guardo?» → el nombre se perdía sin que lo supiera. Se probó primero un modal «¿Se llama José?» con Sí/No y recordatorio; se descartó (bloqueaba la ficha, doble confirmación tras el deletreo, y si callaba el nombre se perdía igual).
- Ahora `nombrar_persona` guarda en cuanto Nidi oye el nombre (deletreado antes solo si era dudoso) y Nidi lo lee: «Ya lo he guardado como José. ¿Está bien?». En pantalla: «Guardado: José · Deshacer» (8 s, `nidoToast`). Corregir el nombre que acaba de poner Nidi no pide `sobrescribir`; «Deshacer» (botón, o `deshacer=true`) devuelve la ficha a como estaba antes de Nidi y, si se queda sin nombre, quita su álbum «Fotos de …» (`NidoAlbums.removeKey`, app.js). Si toca Deshacer, Nidi recibe un aviso y pregunta de nuevo. Ya no existen `confirmado` ni `cancelar`.
- `agente/PROMPT.md` («Poner nombre a una persona» + ejemplos) y `agente/fuente/herramientas.json` → `HERRAMIENTAS.md` regenerado. **En ElevenLabs hay que pegar la versión nueva de ambos.**
- Probado en Chromium sin ventana (copia del servidor en el 8999): 12/12 (guardar en todas partes, aviso con Deshacer tocable, corregir, Deshacer → sin nombre y sin álbum, deshacer=true, fuera de la ficha, nombre previo pide sobrescribir, duplicado, ya no hay modal).

### 25-sep · Revisión de PROMPT.md y HERRAMIENTAS.md contra el código (sin gastar créditos)
- Corregido: «Todas tus fotos» ya no se llama «la galería del teléfono» (chocaba con «subir fotos del móvil a Nido»; también en 2 frases de gestionar_albumes en app.js); el botón de borrar en la foto es «Eliminar» (luego «Eliminar foto»); crear_felicitacion elige foto en este orden: persona dicha → foto abierta → ficha abierta (usar_foto_abierta=true fuerza la abierta); nombrar_persona solo rechaza nombre repetido o nombre de pila suelto que choca («Ana» con «Ana nieta»), no «Ana prima»; privacidad: la felicitación también manda una foto (a Cloudflare); ejemplo «Sois cuatro» → «Hay cuatro personas»; quitado «fíate de los números»; pantallas de presentación y de cambiar teléfono añadidas a la lista; ver_foto: plazo 18 s (no 9).
- Encontrado y NO arreglado: mantener el dedo sobre una cara que Nido no conoce abre «Toca en el micrófono y dime quién es» (reconocimiento del navegador), un segundo micrófono que choca con Nidi. El prompt ya no lo sugiere; si la persona lo hace sola con Nidi activo, sigue saliendo.

### 25-sep · «Elige las fotos a añadir» con círculo en cada foto (Figma 685:8075)
- Antes solo aparecía el check al elegir (y la guía hablaba de mantener pulsado): no se veía que las fotos se pudieran marcar. Ahora TODAS llevan velo negro 40 % + círculo vacío de 40 px (`assets/icons/icon-circle-empty.svg`, exportado de Figma); elegida = check azul de 44 px (`icon-check-circle-44.svg`, exportado de Figma). Un toque marca/desmarca (ya era así en app.js).
- Ojo: `.photo-card img` (components.css) estira toda imagen de la tarjeta; los iconos del círculo usan `.photo-card .select-overlay …` para ganarle.
- La cuadrícula ya se rellena con las fotos que hay en la app (cargarGaleria), en el mismo orden que «Todas tus fotos»; las 9 del HTML son de relleno. Comprobado en Chromium sin ventana con la biblioteca real: 42/42, marcar y desmarcar, sin errores.
- «Añadir» dice cuántas hay marcadas («Añadir 2»; sin ninguna, «Añadir»), `contarSeleccion()` en app.js; se pone a cero al volver a entrar y al rehacer la cuadrícula. Probado sin ventana: marcar 3 → «Añadir 3», desmarcar 1 → «Añadir 2», añade 2 al álbum, al volver sale «Añadir» sin nada marcado.

### 25-sep · Mantener el dedo sobre una cara con Nidi escuchando (sin segundo micrófono)
- Antes: con una cara que Nido no conoce salía «No he reconocido a esta persona · Toca en el micrófono y dime quién es» (reconocimiento de voz del navegador), un segundo micrófono que chocaba con Nidi.
- Ahora, SOLO si Nidi está activo (`nidiEscucha()` en persona.js): cara sin nombre → se abre su ficha (se crea la persona si Nido no la tenía), «Volver» lleva a la foto, y Nidi recibe «Ha mantenido el dedo sobre una persona… pregúntale quién es… nombrar_persona». Sin cara → Nidi recibe «ahí no he encontrado ninguna cara…». Persona de ejemplo → «¿Quieres ver más fotos de …?» sin micrófono. Cara con nombre: igual que siempre («¿Quieres ver más fotos de …?»). Sin Nidi, todo igual que antes.
- PROMPT.md: ahora sí le dice a Nidi que pida mantener el dedo sobre la cara, y explica los avisos.
- Probado sin ventana con la biblioteca real y Nidi simulado: cara sin nombre → ficha + aviso, sin otro micrófono; «Volver» → foto; foto sin caras → aviso; sin Nidi → sale la pregunta de siempre. Sin errores.

### 25-sep · Micro-animaciones antes de probar a Nidi con voz
1. **Pastilla de Nidi con el turno** (app.js `pastillaEstado`, personas.css): mientras Nidi habla el micrófono está cerrado, y la pastilla decía siempre «Nidi te escucha». Ahora `data-estado`: hablando → 3 barritas de sonido + «Nidi está hablando»; escuchando → punto verde con onda + «Habla ahora»; conectando → punto gris parpadeando + «Conectando con Nidi…» (sin «Toca para terminar», para que quepa). «· Toca para terminar» más pequeño (15px) para que quepa en móviles estrechos (hablando: 333px).
2. **Elegir fotos**: el check aparece con un «pop» (0,24 s, crece de más y se asienta); el círculo vacío vuelve con un fundido corto; el número de «Añadir N» da un saltito al cambiar. Con «reducir movimiento», sin animación.
3. **Nombre guardado**: la cabecera de la ficha se ilumina en blue-light y se apaga en 1,4 s (persona.js `aplicarNombre`, también al deshacer). Solo fondo y sombra: el título es absoluto.
- Probado sin ventana: los 3 estados de la pastilla (capturas, caben en el ancho y no tapan el avatar); pop/salto/vuelve y destello se disparan (getAnimations) y el destello se apaga (fondo transparente a 1,7 s). Sin errores.

### 25-sep · Onboarding de Personas: «Siguiente» exactamente encima de «Volver»
- `.ob-personas .onboarding-cta` pasa de `top: 46rem` (736px, 10px más arriba; asomaba el borde de «Volver») a `bottom: 2.375rem`, la misma regla que `.bottom-action`. El pollito baja 10px (top 34.60625rem) para seguir sentado sobre el botón. Medido sin ventana: los dos botones ocupan el mismo recuadro. Otros onboardings con `top` fijo (Yo 736px, Home 738px) no se han tocado.

### 25-sep · Tras la primera prueba con voz real (ordenador): panel de sugerencias, Nidi proactiva, felicitación libre
Feedback de la usuaria tras probar con voz: la pastilla pesaba; Nidi dijo que solo había 4 felicitaciones; se salió sin querer de la felicitación y hubo que repetirla; «los abuelos no saben decir cosas técnicas»; Nidi debería dar más apoyo sin que se lo pidan.
- **Pastilla compacta**: 36px de alto, top 7px (acaba a 43px, dentro de la franja de la hora), 15px de letra.
- **Panel de Nidi** (app.js `ayudaModoNidi`, clase `.ayuda-layer--nidi`): con Nidi activo, en vez del pollito grande, 3 botones de sugerencia según la pantalla (`SUGERENCIAS`); tocar uno = `NidoAgente.decir(texto)` + bocadillo lila, como si lo hubiera dicho. Sin saludo fijo (Nidi ya saluda). Bocadillo de Nidi con tope de 9rem. Abajo «Ver pantalla» (cierra el panel, la conversación sigue) y «Terminar».
- **Tocar el pollito en plena conversación** abre el panel tal cual (antes lo reiniciaba con el micrófono parado).
- **Arreglo**: la frase de Nidi ya no se sustituye por «Te escucho» cuando termina de hablar (`nidiHaDicho`).
- **Nidi proactiva** (`agentePista`): al llegar la persona sola a una pantalla y quedarse 5 s callada, aviso a Nidi para que cuente en una frase qué se puede hacer ahí (`PISTAS`) y ofrezca 2 opciones; una vez por pantalla y conversación; no si la pantalla la ha abierto Nidi (`ultimaAccionNidi`) ni en una ficha sin nombre. Prompt: sección «Acompañar sin esperar a que te lo pida».
- **Felicitación libre** (`estilo=otra` + `titulo` + `decoracion`): crear-imagen.js mete la decoración (limpia, ≤160) en la misma plantilla; el título lo pone la app (Fredoka blanca con borde azul, `caption--otra`, también al compartir). Probado de verdad: «¡Feliz santo, Clara!» con flores y mariposas, 9 s.
- **Volver a la felicitación** sin repetirla: abrir_en_la_app «vuelve a la felicitación» (`abrirUltimaFelicitacion`); «mis felicitaciones» → Yo; «atrás» pulsa el Volver visible.
- En ElevenLabs hay que actualizar: el prompt, `crear_felicitacion` (enum con «otra» + parámetros `titulo` y `decoracion` + descripción) y la descripción de `abrir_en_la_app` (y su parámetro `pedido`).
- Probado sin ventana con Nidi simulado: 13/13 (panel, texto no pisado, sugerencia, Ver pantalla, pollito sin reiniciar, pista, sin pista si la abre Nidi, atrás, libre sin datos pide, libre real, volver a la felicitación, «hazme una felicitación» sigue abriendo estilos, pastilla).

### 25-sep · Espera de Nidi proactiva, «Mis felicitaciones» y álbumes por persona
- `PISTA_ESPERA_MS` 5 s → 12 s: con 5 s Nidi interrumpía a quien solo estaba mirando (las personas mayores leen y deciden despacio; CLAUDE.md §13: la mascota sale cuando alguien se queda bloqueado).
- **«Mis felicitaciones» (Yo)**: tocar una felicitación la abre en su pantalla (`mostrarFelicitacion` en persona.js), con título, letra, «Compartir» y «Volver» → Yo. Antes se abría como una foto normal (sin título, con «Felicitación» y «Eliminar», y el tour de fotos encima). Las nuevas guardan `data-felicitacion-estilo`.
- **Sin álbumes «Fotos de …» por persona** (decidido con la usuaria): repetían en Álbumes lo que ya está en Personas, y delante de los de fechas. Ya no se crean (`personAlbum` fuera). Álbumes = Todas tus fotos + los suyos + automáticos de fechas (año, Navidad, verano). Nidi sigue haciendo álbumes «con las de Clara» (filtrarPorCriterio usa la ficha). Prompt y gestionar_albumes actualizados.
- Probado sin ventana: Álbumes sin «Fotos de …»; álbum «Mi nieta» con las de Clara (9); nombrar/deshacer; felicitación guardada → su pantalla con título y Volver → Yo. Sin errores.

### 25-sep · Mis documentos y charla de recuerdos (feedback: «me ha dicho que la app no servía para el horario del bus»)
- **Mis documentos**: el contexto de Nidi lista los papeles (alt de las tarjetas: Tarjeta sanitaria, DNI, Tarjeta sanitaria europea, Horario de autobús, Horario de tren, Cartel de fiestas, Entrada de espectáculo). abrir_en_la_app abre un papel por su nombre o por lo que es (`DOCUMENTOS_VOZ`, `documentoDe`, `abrirDocumento` en app.js; «¿a qué hora pasa el bus?» → Horario de autobús en grande) y Nidi lo lee con ver_foto. ver-foto.js: los datos de un documento se leen EXACTOS y, si no se ve bien un número, lo dice en vez de adivinar. Sugerencias propias para Mis documentos. Prompt: nunca «la app no sirve para eso».
- **OJO, imágenes de documentos diminutas**: doc-bus-schedule.png es 320×400 px (todas las doc-*.png ≤400 px). Gemini leyó bien la ruta (C-3 València–Buñol) y la primera hora (6:05) pero dijo «último a las 23:38» cuando la imagen pone 23:28. Para la demo, sustituirlas por versiones de alta resolución (≥1200 px).
- **Charla de recuerdos**: pistas nuevas (`pistaDe`): foto abierta por la persona y 12 s en silencio → Nidi la mira con ver_foto y pregunta por quién sale, dónde fue, qué recuerda (una vez por foto); ficha con nombre → pregunta por esa persona; papel de Mis documentos → ofrece leerlo. Prompt: sección «Charlar de los recuerdos» (iniciativa, una pregunta cada vez, escuchar y volver a lo contado, no interrogar, ofrecer guardar nombres, recuerdos tristes con calma).
- Probado sin ventana: 7/7 (contexto con documentos, abre el horario del bus, lectura real con Gemini 4 s, pista de foto a los 12 s, pista de ficha, sin Nidi abre el tren, «¿qué hora es?» no abre nada).
- **Privacidad de la charla de recuerdos (25-sep, acordado con la usuaria)**: la iniciativa de Nidi con una foto ya NO usa ver_foto. `avisoFoto` (app.js) manda a Nidi lo que sabe el móvil (`PersonaSelect.agente.infoFotoAbierta`: fecha + quién sale y dónde, reconocimiento del dispositivo) y le prohíbe mirar la foto por su cuenta; ver_foto solo si ella lo pide o pregunta algo que exige verla. Prompt, ver_foto y LEEME (privacidad) actualizados. Probado sin ventana: aviso con fecha y nombres, 0 peticiones a ver-foto/crear-imagen.

### 25-sep · Agente de ElevenLabs revisado y corregido por la API (con permiso de la usuaria)
- Agente nuevo: `agent_2101m3bpkj11ftz8k88bnzvvmqza` (cuenta nueva; clave y id en `.env`, `ELEVENLABS_API_KEY` / `ELEVENLABS_AGENT_ID`).
- Leída la configuración publicada (GET /v1/convai/agents/{id}) y comparada con PROMPT.md y HERRAMIENTAS.md: herramientas 10/10 con parámetros y enums bien, PERO: el tiempo de espera de las 10 herramientas estaba en **1 s** (el panel lo deja así si no se toca), la autenticación desactivada, el prompt publicado era uno antiguo (141 líneas) y temperatura 0,04 / turnos «normal» 7 s.
- Corregido por la API: PATCH /v1/convai/tools/{id} con el `tool_config` completo (response_timeout_secs 30 en ver_foto y crear_felicitacion, 10 en el resto) y PATCH /v1/convai/agents/{id} (prompt = PROMPT.md, temperatura 0,3, turn_eagerness patient, turn_timeout 12, platform_settings.auth.enable_auth true). Verificado leyendo otra vez: todo OK y la app sigue consiguiendo la URL firmada.
- Para comprobar de nuevo sin gastar: el script de comparación está descrito aquí (GET del agente + comparar prompt y `tools` con agente/PROMPT.md y el JSON final de HERRAMIENTAS.md). Solo lectura: no abre conversación.

### 25-sep · Ficha de persona: flechas de los carruseles dentro de su fila
- Antes (fijas de Figma 692:2188): la de Imágenes flotaba entre las dos filas y la de Vídeos quedaba medio tapada por el difuminado y «Volver»; además salía aunque no hubiera vídeos.
- Ahora cada flecha va dentro de `.persona-fila` (index.html), centrada en el alto de las fotos (188px → top 62px) y al borde derecho, encima de la foto que asoma, con sombra más marcada. `flechaFila` (app.js): se oculta si no hay nada más que ver y gira (`is-al-final`) al llegar al final, porque tocarla entonces vuelve al principio. Fuera `.personas-next--2`.
- Probado sin ventana (ficha de Clara): flecha centrada en sus fotos (±2px), sin flecha de vídeos, gira al final y vuelve al principio. Cambia respecto a Figma: pasarlo al diseño.

### 25-sep · Pollito de Yo, flecha flotante y revisión de burbujas
- **Yo**: el avatar era decorativo (`class="avatar" aria-hidden tabindex=-1`, sin `data-help`): tocarlo no hacía nada. Ahora igual que el resto (`avatar avatar--ring`, `data-help`). Probado: abre la ayuda.
- **Flecha flotante de bajar/subir** (.albumes-more, 640–712px): al final de la lista tapaba lo último de la columna derecha («Sin nombre» en Personas, «Navidad 2024» en Álbumes, la última foto en Todas tus fotos). `padding-bottom` de 140 → 220px en personas, albumes, album-detalle, album-seleccionar, persona-imagenes y persona-videos (albumes.css). Probado: nada tapado al final en las 5 medidas.
- **Burbujas**: revisadas las 22 (onboardings, ayuda, preguntas de Nidi, eliminar foto). Todas usan `--bubble-pad-y` 12px + interlineado 1.25; medido en píxeles (captura ×3), del borde a la altura de mayúsculas ≈15px y de la línea base al borde ≈15px en todas. Sin cambios.

### 25-sep · «Sin nombre» gris, pollitos del onboarding del inicio y Ajustes centrado
- **Personas**: una persona sin nombre y sin cara guardada (avatar null; en el navegador de la usuaria, de pruebas antiguas) salía como círculo gris «Sin nombre». `addPersonaCircle` ya no la pinta y `personasParaAgente` no se la ofrece a Nidi (tampoco las que ya no existen en Reconocimiento). Las «Sin nombre» con cara siguen saliendo (Nidi pregunta quiénes son).
- **Onboarding del inicio, pasos 1 y 2**: los pollitos v3 eran más grandes (258 y 250px) que los de los pasos 3–5 y la cabeza tapaba la burbuja (28 % y 13 %); el del paso 2 además salía 30px por la izquierda. Ahora mismo alto que 3–5 (217px, pies a 754px), su proporción, debajo de la burbuja: 0 % tapado, dentro de la pantalla.
- **Ajustes**: textos centrados en cada fila (relleno 48px a cada lado, `nowrap`); el icono, absoluto a 16px de la derecha; «Eliminar cuenta» centra icono + texto. «Ver términos y condiciones» cabe en una línea pero queda a ~3px del icono (393 y 375 de ancho).
- Probado sin ventana: todo lo anterior con medidas; sin errores.
- Ajustes: «Ver términos y condiciones» → «Ver términos» (decidido con la usuaria): mismo patrón verbo + palabra que el resto y como lo dice la ayuda; ya no queda pegado al icono.

### 25-sep · Tras otra prueba con voz real
- **Colgar al despedirse**: activada la herramienta de sistema `end_call` en el agente por la API (`built_in_tools.end_call`) y sección «Terminar la conversación» en el prompt (despedirse en una frase y colgar; si «ya está» es ambiguo, preguntar). Al colgar, `onDisconnect` → estado «cerrado» → la app cierra micrófono, panel y pastilla. Copia previa del agente en el scratchpad.
- **Voz**: Jessica no suena a español de España. La clave de la app solo tiene permiso de agentes (no `voices_read`), así que la voz se elige en el panel (biblioteca, español de España). Modelo de voz: `eleven_flash_v2_5` (multilingüe).
- **Panel**: bocadillo lila con máximo 3 líneas (no se mete bajo el de Nidi); el de Nidi a todo el ancho, en bloque y con tope hasta las sugerencias (no se corta la última línea).
- **Personas**: no se pintan las personas sin nombre cuya cara apunta a una foto que ya no existe (blob de otra sesión, o que no carga); nombres centrados bajo el círculo. **Ficha**: la flecha se oculta si la fila no tiene fotos y se repasa al enseñar cada pantalla; fila de imágenes vacía con «Todavía no hay fotos de esta persona.».
- **«Hola, soy Nidi»**: texto + pollito como un bloque (40px entre ellos) centrado: 155px arriba y abajo; pollito centrado por su peso visual (centro de masa al 54 %).
- Panel de Nidi (ajuste final): el lila corta en 3 líneas sin asomar la 4.ª (aire de abajo como borde transparente, fuera del recorte); el texto de Nidi va en `.ayuda-texto__in`, que es lo que se desplaza: si no cabe se enseña el FINAL del mensaje (donde va la pregunta) con el texto difuminado arriba, sin tocar el fondo ni las esquinas del bocadillo. Probado sin ventana con frase larga + respuesta larga: sin solapes.
- Voz cambiada por la usuaria en el panel a una de español de España: `1CeqBeXMOqCleeQjfYfO` (antes `r1KmysJdVYZjJCm4mL3b`), modelo eleven_flash_v2_5, velocidad 1. Verificado por la API que el resto sigue igual (prompt, end_call, 10 herramientas, autenticación, temperatura 0,3, turnos pacientes 12 s).
- Onboarding del inicio: burbujas de los pasos 1 y 2 subidas (461→449,6px y 436,5→426px) para dejar el mismo hueco hasta la cabeza del pollito que en los pasos 3–5. Medido en píxeles del dibujo (no la caja): 18, 18, 19, 18, 18px.

### 25-sep · Navegar fotos con Nidi (diagnosticado leyendo la transcripción de ElevenLabs, GET /v1/convai/conversations)
- «Enséñame las fotos de Clara» → Nidi abría la primera foto (no tenía forma de abrir la cuadrícula). Ahora `abrir_persona` con `todas=true` abre «Imágenes» (persona-imagenes); y sin Nidi, «fotos/todas de X» también va a la cuadrícula («vídeos» a la de vídeos).
- «Pasa a la siguiente» → `abrir_foto` intentaba abrir «la 2» y decía «no hay fotos». Ahora, con una foto en grande, `abrir_foto` acepta `direccion` (siguiente/anterior) o `posicion` dentro del carrusel; avisa en la primera y la última.
- «Atrás» decía «Hecho» sin moverse: en detalle-foto hay 3 «Volver» (dos en capas ocultas con opacidad 0) y se pulsaba el primero. `botonVolverVisible()` coge el que se ve (prefiere el de abajo) y `hooks.abrir` comprueba que la pantalla cambia de verdad y lo dice.
- El contexto decía «puedes mirarla con ver_foto» y Nidi la miraba por su cuenta: quitado; ahora dice «la 3 de 9» para poder navegar.
- Herramientas `abrir_persona` y `abrir_foto` y el prompt actualizados en agente/ y en el agente por la API (verificado). Sugerencias nuevas para persona-imagenes y detalle-foto («Pasa a la siguiente»).
- Bocadillos del panel «como siempre»: ajustados a su texto (hasta 272px), el de Nidi con su sangría de 51px, colocado 12px bajo el tuyo por `colocarPanel()` y con alto libre hasta las sugerencias.
- Probado sin ventana: 10/10 (cuadrícula de Clara 9 fotos, foto 1, siguiente, anterior, primera, atrás real, sin Nidi, bocadillos).

### 25-sep · Felicitación desde Yo con foto elegida y «Creando imagen» centrado
- **Yo → Felicitación** ya no usa la primera foto de la biblioteca: lleva a «Elige una foto» (album-seleccionar en modo `selectTarget = 'felicitacion'`: título «Elige una foto», una sola foto, botón «Continuar» que solo sale con una elegida) → estilos → se crea con esa foto (`PersonaSelect.felicitacionConFoto`). Volver desde ahí → Yo. Voz sin Nidi: «hazme una felicitación» → con foto abierta usa esa; si no, «Elige una foto». Añadir fotos a un álbum sigue igual.
- **«Creando imagen»**: la imagen trae mucho blanco (dibujo en y 114–473 de 552); dibujo + texto centrados en la pantalla (bloque en y=424 de 426) y el dibujo centrado a lo ancho por su centro de masa.
- Probado sin ventana (crear-imagen simulado): 9/9 y la foto enviada es la elegida (hash perceptual idéntico).

### 25-sep · Felicitación «37», título en arcoíris, bocadillos en Safari y pollito de Eliminar foto
- **Título personalizable en los 4 tipos** (`titulo` opcional; obligatorio solo en «otra»): pidió «feliz cumpleaños y un 37» y salía el título de serie. Ahora «¡Feliz 37 cumpleaños!» con la letra de cumpleaños (lo escribe la app). `decoracion` opcional también en los fijos (se añade al prompt). Herramienta y prompt actualizados en agente/ y en el agente por la API.
- **Arcoíris**: `.persona-create-result__caption--cumpleanos` usaba el atajo `background:`, que devolvía `background-clip` a la caja → recuadro arcoíris detrás del texto. Ahora `background-image` → arcoíris dentro de las letras (comprobado en WebKit: background-clip text). Igual en «amistad».
- **Servidor local**: `conFuncion` borra de la caché de `require` las funciones antes de cada llamada (tras cambiar crear-imagen.js seguía la vieja: «"style" no es uno de…»). Servidor del 8990 reiniciado.
- **Bocadillos del panel**: ancho ajustado a la línea más larga (`abrazar` en `colocarPanel`), con el mismo aire a los lados (12/13px); probado en WebKit (motor de Safari, instalado en el scratchpad de pruebas): alto ajustado 11/11px.
- **Eliminar foto**: la imagen ahora es el pollito de cuerpo entero (650×745) y la caja seguía siendo la de la pose antigua (429×416): salía gigante y cortado. Ahora 253×290, a la derecha, bajo la burbuja y apoyado sobre «Eliminar foto».

### 25-sep · Carpeta para publicar en Netlify (cuenta nueva)
- `sh tools/preparar-publicacion.sh` genera `~/Desktop/TFM/nido-publicar` desde el ÚLTIMO COMMIT (git archive) con solo index.html, css, js, assets, netlify/ y netlify.toml, y comprueba que no lleve `.env`, claves ni archivos internos. Sustituye a la copia a mano de `~/Desktop/nido-netlify` (cuenta antigua).
- Las fotos reales de la biblioteca SÍ se publican: la usuaria confirma que tienen el consentimiento de las personas que salen.
- Probada la carpeta sirviéndola sola (WebKit): 42 fotos, ningún archivo que falte, sin errores. Las funciones se prueban ya en Netlify.
- Pendiente para desplegar: login en la cuenta nueva (`npx netlify-cli login`), secretos (ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, GEMINI_API_KEY, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID), UN despliegue cuando la usuaria lo diga y prueba en iPhone. Revisar minutos de ElevenLabs (plan gratis 15 min).
- Cuenta de Netlify NUEVA: la de Clara (hegacla@barreira.edu.es, equipo `hegacla`, plan gratis). Web creada VACÍA: **nido-tfm** → https://nido-tfm.netlify.app (Project ID 9cb401cf-b0e2-4880-9304-a99a150fac4e). Las 5 claves ya están puestas en ella, copiadas de `.env`. Sin desplegar todavía.
- Para desplegar (solo cuando la usuaria lo diga): `sh tools/preparar-publicacion.sh` y luego, desde `~/Desktop/TFM/nido-publicar`: `NETLIFY_SITE_ID=9cb401cf-b0e2-4880-9304-a99a150fac4e npx netlify-cli deploy --prod --dir . --functions netlify/functions`.
- En el agente de ElevenLabs, la lista de dominios permitidos está vacía: acepta cualquier dominio con URL firmada, así que no hay que añadir nido-tfm.
- 25-sep noche: PUBLICADA en https://nido-tfm.netlify.app (despliegue 6ab6942e94e0321bc8fa725c, commit 90a5e74). Comprobado sin gastar créditos: página 200, fotos 200, agente-voz devuelve URL firmada. ver-foto y crear-imagen sin probar (gastan).

### 27-sep · Feedback de la prueba en Android e iPhone (víspera de la entrega)
- **iPhone recargaba la app a mitad de un flujo** (felicitación). Android no. Causa más probable: Safari se queda sin memoria. Cambios:
  - `assets/biblioteca-caras.json` (NUEVO, 73 KB): caras ya calculadas de las 38 fotos de ejemplo (generado en Chromium). `Reconocimiento.precargar` las mete en la caché, así face-api (TensorFlow en la tarjeta gráfica) NO arranca solo por la biblioteca. Si se cambian las fotos de ejemplo, hay que regenerarlo.
  - Bug encontrado: `libraryImages()` cogía también la flechita del rótulo de cada recuerdo (`.photo-card img`) y la analizaba como foto → ahora `.photo-card > img`.
  - Un solo lienzo reutilizado en reconocimiento; lienzos de persona.js se vacían (width=0) al usarlos; `WEBGL_DELETE_TEXTURE_THRESHOLD=0`.
  - SIN comprobar en un iPhone real (solo simulado en Chromium y WebKit de Mac).
- **Títulos de los recuerdos** (antes «Personas especiales»/«Un día especial» repetidos): quién sale («Con Clara y Ana», del reconocimiento del dispositivo) o, si no hay nadie con nombre, la fecha («Hoy», «Ayer», «Navidad de 2024», «21 de septiembre de 2026»). `tituloRecuerdo` (app.js) y `titularRecuerdos` (persona.js). `organizarBiblioteca` se repite si la galería cambia mientras busca.
- **Álbumes**: «Todas tus fotos» siempre arriba; debajo, los de la persona (el más nuevo primero) y luego los automáticos (`data-album-auto`).
- **Papeles a Mis documentos solos**: al subir fotos, cada una va a `ver-foto` en modo `clasificar` (512 px, sin EXIF) → identificativo / horario / documento / foto. Los papeles pasan a su apartado de Mis documentos, salen de recuerdos y de Todas tus fotos, y un aviso lo dice («He guardado «DNI» en Mis documentos. Ver»). Solo fotos subidas, nunca la biblioteca. Probado de verdad (Gemini gratis): DNI → identificativo 9,7 s; foto de Navidad → foto 5,7 s. PROMPT.md actualizado y subido al agente por la API.
- **Pendiente (27-sep, dicho por la usuaria):** en ANDROID los recuerdos de Home cambiaron después de generar una felicitación («se añadía»). En la simulación (Chromium, felicitación con imagen falsa, versión actual) Home sale IGUAL antes y después y el código solo añade la felicitación a «Mis felicitaciones» (Yo). No reproducido: faltan los pasos exactos (desde qué pantalla, con Nidi o tocando). Se aparcó para hacer primero GitHub; «luego volvemos con el resto de temas».
- Resto de temas aparcados: probar el arreglo de memoria en iPhone real; ¿botón «ver el tutorial otra vez» en Ajustes? (sin decidir); imágenes de horarios de 320 px (Nidi puede leer mal la hora); commit + despliegue cuando lo diga.
- GitHub: `gh` 2.101.0 instalado en `~/.local/bin/gh` (no hay Homebrew). Falta `gh auth login` de la usuaria y subir a hegacla-bot/Nido (carpeta `Prototipo/` sin confirmar).
- 27-sep: SUBIDO a GitHub → hegacla-bot/Nido, carpeta `Prototipo/` (commit 5775e8d, cuenta ainhoa-stack, permiso push). Sale de prototipo-v3 commit con README nuevo; sin _archive ni test-blur.html; sin claves. Para actualizarlo: clonar, reemplazar Prototipo/ con git archive HEAD y push. El README principal del repo (de Clara) aún enlaza a nido-0921-22084.
- 27-sep: RESUELTO lo de Android (los recuerdos «cambiaban» tras una felicitación): no era la felicitación (recorrido tocando botones, versión publicada y actual: Home igual). Era la descarga de la biblioteca, que empezaba al llegar a Home: con datos móviles Home enseñaba unos segundos las 3 fotos de ejemplo del HTML y al volver ya estaban las reales. Reproducido con red lenta simulada. Ahora `descargarBiblioteca()` empieza al abrir la app (solo descarga; se enseña al llegar a Home y solo si no eligió sus fotos).
- 28-sep · **Mis documentos con imágenes nuevas y nítidas** (las de 320 px hacían que Nidi leyera mal horas): `doc-bus-horario.png` (líneas 21/23/24), `doc-tram-horario.jpg` (TRAM L4, alt «Horario del tranvía»), `doc-tram-mapa.jpg` (nuevo, «Mapa del tranvía»), `doc-sip.jpg` (tarjeta SIP con datos difuminados), `doc-dni.jpg` (DNI de muestra oficial, 1500 px). Sin EXIF. Borrados los 4 antiguos. Horarios encuadrados por la izquierda. Voz: «tranvía/tram/tren/L4/Luceros» → horario del tranvía; «mapa/paradas» → mapa. Nidi lee los papeles a 1600 px (`MAX_VER_DOC`) y sin buscar caras. Lecturas reales (Gemini gratis): tranvía 10:30 → Lucentum 10:47 ✔, primer bus L23 sábado 06:50 ✔. Prompt actualizado en ElevenLabs.
- 28-sep · **Registro: «Quiero saber más»** (Figma 919:2723): dentro del mismo velo de «Ayúdanos», cambia a «¿Para qué necesitamos el acceso?» con Permitir (abre la galería, como siempre) y Más tarde (a registro-4 sin elegir fotos: fotos de ejemplo). `registroModalPaso` (app.js); vuelve a «Ayúdanos» al reentrar o al reenviar el código. Probado simulado: se ve igual que Figma, Más tarde → registro-4, sin errores.
- 28-sep: GitHub con HISTORIAL: Prototipo/ de hegacla-bot/Nido sustituida por los 34 commits de prototipo-v3 (23-28 sep), reescritos con git filter-branch dentro de Prototipo/ y sin _archive ni test-blur.html. Historial revisado antes: sin claves ni .env en ninguna versión.
- 28-sep · **Álbum vacío** (Figma 979:2967): pollito asomando del agujero (`pollito-album-vacio.webp`, recortado de Figma) + «Álbum vacío» + «Todavía no hay fotos, pulsa en añadir para elegirlas.» (texto de Clara tal cual). Se oculta en cuanto el álbum tiene fotos (albumRender). Apagado el tour de primera vez del álbum nuevo (`ALBUM_NUEVO_TOUR = false`): decía lo mismo encima. Nombre de ejemplo «Calle Concordia». NO se puso el pollito en la ficha de persona: la fila de vídeos de las personas reales siempre está vacía y saldría en todas (mascota omnipresente).
