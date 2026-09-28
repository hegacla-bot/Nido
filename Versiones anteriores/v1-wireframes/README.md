# Nido · Prototipo navegable

Prototipo en HTML/CSS/JS sin frameworks de los wireframes del equipo, con una capa
de accesibilidad basada en cómo funcionan **Acceso Asistido** y **Acceso Guiado**
(iOS) y **anclaje de pantalla** y el escalado de fuente del sistema (Android).

**Origen de los diseños**
- Wireframes: Figma `O9nhqFGKGybgtrG9uhGW6P`, página **UX** (nodo `76:2`)
- Sitemap y flujo: FigJam `LVeIrfW6uS2Jbfazm6N944`, sección **Sitemap** (nodo `360:3463`)

## Cómo verlo

```
cd "TFM/prototipo"
python3 -m http.server 8744      # o: npx serve -l 8744 .
```

*(Aquí sí vale `python3 -m http.server`: este prototipo no sirve vídeo, así que no
hace falta soporte de `Range` como en la landing.)*

Abre `http://localhost:8744`. Doble clic en `index.html` (`file://`) también funciona;
lo único que se pierde así es el reconocimiento de voz real del navegador, que
necesita `https` o `localhost` — el prototipo lo detecta y pasa solo a la simulación.

A la derecha del móvil hay un **panel de la demo**. No es parte de la app: está para
que quien enseñe el prototipo pueda cambiar disposición, tamaño de letra y contraste
sin entrar en Ajustes, y para saltar directamente a cualquier pantalla.

## Pantallas

| Pantalla | Nodo Figma | Notas |
|---|---|---|
| 01 · Bienvenida | `272:2` | |
| 02 · Tu número | `272:10` | Teclado numérico propio de 12 teclas grandes |
| 03 · Código de confirmación | `272:42` | Autorrelleno animado + avance automático |
| 04 · Tu foto y tu nombre | `272:58` | |
| 05 · Copia de seguridad | `272:72` | |
| 06 · Permisos | `272:85` | Diálogo sobre la Home, con su "saber más" |
| 07 · Home | `274:2` | Pestañas Fotos / Álbumes |
| 08 · Álbum | `274:37` | |
| 09 · Foto | `274:58` | |
| 10 · Persona no identificada | `276:2` | |
| 11 · Persona identificada | `276:25` | |
| 12 · Crear con IA | `277:2` | Micro con ondas, escucha y confirmación |
| 13/14 · Modo visita | `277:18` / `277:20` | Controles que se ocultan solos |
| Buscar por voz | — | **Añadida**: está en el sitemap y en los wireframes de baja fidelidad, no en los numerados |
| Tu perfil / ajustes | — | **Añadida**: el sitemap tiene "Perfil" y "Cambiar modo vista" sin pantalla |

## La capa de accesibilidad

Cada decisión, de dónde sale y qué hace aquí.

### 1 · Dos disposiciones: **En lista** y **En cuadrícula**
Acceso Asistido de iOS ofrece exactamente dos: *Rows* (lista, más legible) y *Grid*
(cuadrícula, más visual). No es una preferencia estética: 65-89 años no es un grupo
homogéneo (NN/G), y la misma app tiene que servir a quien lee bien la cuadrícula y a
quien necesita una fila por elemento con su nombre al lado.
En el prototipo cambia el mismo contenido y las mismas acciones, solo la densidad.
En la app vive en **Tu perfil**, y el sitemap ya lo contemplaba como *Cambiar modo vista*.

### 2 · Tamaño de letra que arrastra la interfaz entera
Tres escalones —**Normal · Grande · Enorme**— sobre una sola escalera de valores
(16 · 18 · 20 · 24 · 28 · 32 · 36 · 40), donde cada modo sube un peldaño:

| token | Normal | Grande | Enorme |
|---|---|---|---|
| xs  | 16 | 18 | 20 |
| s   | 18 | 20 | 24 |
| m   | **20** | 24 | 28 |
| lg  | 24 | 28 | 32 |
| xl  | **28** | 32 | 36 |
| 2xl | 32 | 36 | 40 |

El modo Normal es el de los wireframes: `s` 18, `m` 20, `xl` 28.

No es un multiplicador único, es una **tabla**, como el Dynamic Type de iOS: el texto
pequeño crece más que el grande (xs ×1,25 · 2xl ×1,13), que es lo mismo que hace el
escalado no lineal de Android 14 desde su curva propia. Así la jerarquía se comprime
suave arriba (`xl/m` pasa de 1,40 a 1,33 a 1,29) en vez de aplanarse: el titular sigue
siendo un titular justo en el modo que usa quien peor ve.

Las **zonas de toque van atadas al cuerpo de texto** (`--tap-min: fs-m × 3,2`), así que
crecen con él: 64 → 77 → 90 px. Un botón que se queda pequeño mientras la letra crece
es peor que no ofrecer la opción.

Y hay tokens de **interlineado** (`--lh-tight` 1,2 para titulares, `--lh-body` 1,45 para
cuerpo): el tamaño solo no hace legible un texto.

### 2b · Cómo se suma al ajuste del sistema

El ajuste de Nido **no sustituye** al del móvil: parte de él.

- La escalera se declara en `rem`, y la raíz es `font-size: 100%` — **nunca `16px`**.
  Fijar píxeles ahí anula el tamaño de letra que la persona ya tenga puesto.
- El sistema decide de qué peldaño se parte; el modo de Nido sube **uno o dos
  peldaños más**. Se suman rungs, no se multiplican factores, así que no hay forma
  de que el resultado se dispare.

| Sistema | Modo Nido | Peldaño de partida |
|---|---|---|
| 100 % | Normal | 0 |
| 100 % | Grande | +1 |
| 130 % | Normal | +1 |
| 130 % | Grande | +2 |
| 200 % | Normal | +3 |

En la app real:

| Plataforma | Qué hay que usar | Qué NO |
|---|---|---|
| iOS | Dynamic Type: estilos (`.body`, `.title`) o fuente propia con `relativeTo:`. Leer el estado con `dynamicTypeSize` | `.system(size: 20)` fijo |
| Android | Unidades `sp`. Desde Android 14 la curva no lineal se aplica sola. Leer `fontScale` | `dp` para texto |
| Web (este prototipo) | `rem` sobre raíz al `100%` | `px` en los tamaños de letra |

**Un tope, y consciente.** Sistema al 200 % + modo Enorme daría textos que no caben.
El tope está en el propio modelo: la escalera termina en 48 y el desplazamiento total
se limita a +4 peldaños. Es una decisión de diseño, no un efecto secundario.

### 3 · Zonas de toque de 64 px mínimo
Apple pide 44 pt; Material pide 48 dp. Aquí el mínimo es 64 px y el habitual 72 px,
porque el estudio clínico sobre manipulación táctil dice que **la experiencia previa
con el móvil no mejora la precisión motora**: el objetivo grande no es para novatos,
es para todos.

### 4 · La salida siempre en el mismo sitio
Toda pantalla tiene un pie fijo que no hace scroll, con la acción de salida. Es la
lógica del botón Atrás de Acceso Asistido: no cambia de posición ni desaparece al
bajar por el contenido. Encima, cada pantalla conserva el botón redondo de volver
arriba a la izquierda que traían los wireframes → **navegación redundante**: nada
depende de un único gesto ni de un único sitio.

### 5 · Modo visita = Acceso Guiado, pero de diseño
**Acceso Guiado** (iOS) y el **anclaje de pantalla** (Android) hacen lo mismo: dejar
el aparato encerrado en una cosa para que nadie —ni el propio usuario— se pierda.
El modo visita de los wireframes es eso mismo dentro de la app: una foto a pantalla
completa, controles que se ocultan a los 4 segundos, y salir requiere **mantener
pulsada** la equis 1,2 s con un anillo que muestra el progreso.

Ese detalle es deliberado: Acceso Guiado exige triple clic + código, que pide memoria y
precisión. Mantener pulsado pide **solo intención**, y no se dispara con un roce.
Con teclado, `Enter` sale directamente — mantener no es un gesto accesible por teclado.

### 6 · Confirmar, nunca crear de la nada
No hay ni un campo de texto en toda la app salvo el teclado numérico del alta, que
—según la sección 7 del contexto— completa un familiar. Nombrar un álbum, nombrar una
persona, buscar y crear van **por voz**, y lo dicho vuelve por pantalla entre comillas
para poder corregirlo antes de confirmar.

### 7 · Nunca un callejón sin salida
Todo lo que se puede tocar lleva a algún sitio. Las creaciones antiguas, los recuadros
de fotos, la cara sin identificar: ninguno es decorativo. `Esc` retrocede y cierra
diálogos; el foco vuelve al botón que abrió el diálogo al cerrarlo.

### 8 · Lo que ya estaba y se ha respetado
`prefers-reduced-motion` apaga las animaciones; el foco es siempre visible; los cambios
de estado se anuncian por `aria-live`; los diálogos atrapan el foco; ningún botón es
solo un icono sin etiqueta.

## Dos cosas que hay que decidir antes de seguir

**1 · El sitemap y los wireframes no cuentan lo mismo sobre el alta.**
El sitemap de FigJam tiene *Log in / Registrarse / Correo / Contraseña / Confirmar
contraseña / Reestablecer contraseña*. Los wireframes 02 y 03 —y la sección 7 del
contexto del proyecto— tienen teléfono + código SMS autorrellenado, sin contraseña.
**El prototipo implementa los wireframes.** El sitemap está sin actualizar; si el alta
con correo y contraseña se mantiene, contradice el principio de que la persona mayor
nunca teclea credenciales.

**2 · Buscar es una tensión abierta, no un olvido.**
La sección 6 del contexto dice "sin campos de texto, sin buscadores, en ningún sitio".
El sitemap y los wireframes de baja fidelidad sí tienen *Buscar*. Aquí está resuelto
como **búsqueda por voz con atajos de personas**, que cumple las dos cosas, pero
conviene cerrarlo explícitamente en la memoria.

## Lo que es hipótesis y lo que es hallazgo

Siguiendo la nota de honestidad metodológica del contexto del proyecto:

- **Respaldado por fuente**: tamaños de toque, escalado de fuente, disposición
  lista/cuadrícula, salida en posición fija, evitar callejones sin salida.
  Vienen de NN/G, Pew, Rogers et al., el estudio clínico táctil y la documentación
  de Apple y Google.
- **Hipótesis del equipo, pendientes de validar con personas de 65+**: la pulsación
  mantenida como forma de salir del modo visita, los 4 segundos de auto-ocultado, que
  la voz baste para nombrar personas, y que las sugerencias de parentesco
  ("tu nieta", "tu hijo") se entiendan sin explicación.

## Pendiente

- Fotos reales. Ahora son degradados generados: distinguen un momento de otro, pero no
  sirven para probar si alguien reconoce a su nieta en una miniatura.
- El pollito (sección 13 del contexto): faltan las 4 poses. El sitio natural es el
  empty state de Buscar y el "no encuentro cómo volver".
- Conectar el asistente de voz real (`voz-familiar-demo` + ElevenLabs).
- Revalidar con usuarios reales ahora que la solución es la app.

## Fuentes de las referencias de accesibilidad

- Apple — *Choose the screen layout for Assistive Access on iPhone* (Rows / Grid):
  https://support.apple.com/guide/assistive-access-iphone/choose-the-screen-layout-dev683243feb/ios
- Apple — Human Interface Guidelines, tamaño mínimo de objetivo táctil (44 pt)
- Google — Material Design, tamaño mínimo de objetivo táctil (48 dp) y anclaje de pantalla
