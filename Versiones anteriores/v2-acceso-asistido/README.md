# Nido · versión 2

**Las mismas pantallas y el mismo flujo que la v1** —vuestros wireframes— adaptados al
lenguaje de **Acceso Asistido de iPhone**. No cambia el producto: cambia cómo se
presenta y cómo se navega.

La [versión 1](../prototipo/) sigue intacta para comparar.

```
cd "TFM/prototipo-v2"
python3 -m http.server 8745
```

## Qué se ha tomado de Acceso Asistido

### 1 · La losa de Atrás
Desaparece el botón redondo de la esquina. En su lugar, una **losa de ancho completo
anclada abajo**, en el mismo sitio en todas las pantallas, con flecha *y* palabra.
Es la pieza más reconocible del sistema de Apple y la que resuelve el «no sé cómo
volver» sin depender de un gesto ni de la memoria.

### 2 · Las acciones viven en el contenido, no en la franja de abajo
Como el botón amarillo *Take Photo* de la cámara de Acceso Asistido: la acción está
dentro de la pantalla, grande, y la franja de abajo queda **solo para Atrás**. Por eso
«Ponerle nombre», «Hacer un vídeo» o «Mandársela a Lucía» están en el cuerpo y no
compiten con la salida.

### 3 · Icono y palabra, siempre
No hay un solo botón que sea únicamente un icono. Ni volver, ni pasar foto, ni el
micrófono. Es la regla más simple del sistema de Apple y la que más barre de golpe.

### 4 · Dos disposiciones: **En lista** y **En cuadrícula**
Las mismas *Rows* y *Grid* de Acceso Asistido. Mismo contenido, mismas acciones, solo
cambia la densidad. La v2 **abre en lista**, que es la más legible; la cuadrícula queda
para quien la prefiera. Se cambia en *Tus cosas* o en el panel de la demo.

### 5 · Tipografía dos peldaños más arriba
Misma escalera que la v1 (18 · 20 · 24 · 28 · 34 · 40 · 46 · 52), pero el cuerpo
arranca en **24** en vez de 20. Acceso Asistido es notablemente más grande que una app
normal; puestas al lado se ve por qué.

Los tres modos siguen siendo peldaños sobre la misma escalera, con etiquetas relativas:
**Como está · Un poco más · Mucho más**. Se leen como «ajustar sobre lo que ya tengo»,
que es lo que hacen.

### 6 · Color por función
Acceso Asistido le da a cada app su color y lo repite en el icono, el fondo de la
pantalla y los botones. Aquí cada zona de Nido tiene el suyo —azul las fotos, ámbar los
álbumes, verde las personas, morado crear— y el fondo se tiñe con él.
**Se reconoce «la verde» antes de leer «Por persona».**

Es lo que más se aleja del design system de Figma, que solo tiene azul y grises.
Va como propuesta, y como hipótesis a validar: que el color ayude a recordar es
razonable, pero no está comprobado con personas de 65+.

### 7 · Ver en grande = Acceso Guiado
El modo visita de vuestros wireframes es, de hecho, el **Acceso Guiado** de iOS y el
**anclaje de pantalla** de Android: una sola cosa a la vista y controles que se ocultan
solos a los 4,5 segundos.

Salir exige **mantener pulsado** 1,2 s, con la barra de progreso rellenando el botón.
Acceso Guiado exige triple clic + código, que pide memoria y precisión; mantener
pulsado pide **solo intención**, y no se dispara con un roce. Con teclado, `Enter`
sale directamente.

## La novedad: compartir por WhatsApp

En la pantalla **09 · Foto**, debajo de las caras, hay un botón que dice
**«Mandársela a Lucía»**. Es lo único que la v2 añade a los wireframes.

### Qué parte de esto se puede construir de verdad

| Paso | ¿Se puede? | Con qué |
|---|---|---|
| Agrupar la misma cara en 58 fotos | **Sí**, y sin nube | Vision (iOS) / ML Kit (Android), en el propio teléfono |
| Ponerle el nombre «Lucía» | **Sí** — pero lo dice la persona, no la IA | La pantalla 10, por voz |
| Enlazar «Lucía» con su contacto | **Sí**, y no hace falta IA | `CNContactStore` (iOS) / `ContactsContract` (Android), con permiso |
| Desambiguar (hay tres Lucías; en la agenda está como «Lucía Pérez») | **Sí**, aquí sí ayuda un modelo | Emparejar nombre + parentesco contra la agenda |
| Mandar la foto al chat de Lucía **sin pasar por el selector** | **No** | `wa.me/<número>` abre el chat, pero **solo admite texto: no adjunta imágenes** |
| Abrir el selector **con Lucía ya arriba** | **Sí** | *Sharing shortcuts* de WhatsApp: el sistema la pone en la primera fila, con su foto |

**Conclusión de diseño:** el botón no puede saltarse el selector del sistema, pero sí
puede dejarlo abierto con Lucía la primera. Un toque más que lo ideal, cero permisos
raros, y honesto con lo que la plataforma permite. Para el tribunal esto suma: enseña
dónde está el límite en vez de dibujar algo que no se puede construir.

En el prototipo, el botón abre un diálogo con la ficha del contacto enlazado
(«Lucía Nieta · +34 611 22 33 44») para poder enseñar el emparejamiento. Si la persona
no está en la agenda, el diálogo lo dice y ofrece elegir a mano — **nunca un callejón
sin salida**.


## Dos hallazgos nuevos de las entrevistas, y qué se ha hecho con ellos

### «Iban haciendo capturas para tener las fotos otra vez a mano»

Nadie hace una captura porque quiera una copia. La hace porque **la captura va al
final del carrete, o sea, arriba del todo**. Es su manera de decir «esto lo quiero a
mano». Es un *workaround*, y un workaround siempre señala una función que falta.

Dos cosas en el prototipo:

**1 · Un sitio de verdad para eso: «A mano».** Es lo primero de la portada, ocupa el
ancho completo y va relleno de color. No es una tarjeta más entre las de fotos porque
no es lo mismo: es lo único que se abre todos los días. Está siempre en el mismo sitio,
así que **no hay que buscarlo** — que es la mejor forma de encontrar algo.

**2 · Cazar la captura en el momento.** Cuando llega una captura nueva, Nido pregunta
una sola vez: «Acabas de hacer una captura. ¿La quieres tener a mano?», y dice qué cree
que es («parece un horario»). Es **confirmar, no crear**, el principio de la sección 6
aplicado literalmente: la app ya ha hecho el trabajo, la persona solo dice sí o no.
Si dice que sí, el workaround deja de hacer falta.

> Pruébalo con el botón **«Llega una captura de pantalla»** del panel de la demo.

### «Un álbum al que siempre recurrían: DNI, horarios del bus, cosas de todos los días»

Eso **no son recuerdos, son cosas de uso**. Por eso en «A mano» no se ven como fotos:
se ven como **fichas** —icono grande, nombre grande— y se distinguen de un vistazo de
un momento familiar. Dentro hay DNI por las dos caras, horario del bus, tarjeta
sanitaria, la contraseña del wifi y la caja de las pastillas.

Al abrir una ficha, **la pantalla sube al máximo de brillo** y se avisa de ello, como
hacen los pases de embarque de Wallet. Si la abres es para enseñar el DNI o para que te
escaneen el bono: tiene que verse.

Se puede llenar de tres maneras, ninguna de las cuales pide teclear:
- la app lo detecta solo (una captura, algo con texto, un documento);
- desde cualquier foto, con el botón **«Tenerlo a mano»**;
- por voz, desde la propia pantalla.

### ⚠️ La decisión de producto que abre esto

Con «A mano», **Nido deja de ser solo «tus recuerdos» y pasa a ser también «lo que
necesitas hoy»**. Es más superficie, y la sección 9 avisa de que cada función visible
es un sitio más donde equivocarse.

A favor, y pesa: es la razón por la que abrirían la app **a diario** en vez de de vez
en cuando, y **ninguna de las referencias lo resuelve** — ni Google Fotos, ni Aura, ni
Skylight, ni Tinybeans, ni Famileo. Puede ser el hueco más defendible que tenéis.

Pero es un cambio de alcance del producto, no un detalle de interfaz. **Decidirlo
explícitamente antes de que entre en la memoria.**

### Sobre «encontrar las fotos fácil»

Encontrar no es lo mismo que buscar. Lo que piden los dos hallazgos es que **lo
importante esté siempre en el mismo sitio**, no que haya un buscador mejor. Por eso:

- «A mano» va primero y no se mueve nunca.
- La portada sigue entrando por *momento*, por *grupo* y por *persona* — tres caminos
  a la misma foto, que es navegación redundante aplicada al contenido.
- *Buscar por voz* queda como red de seguridad, no como camino principal.

Lo que **no** he metido, y lo digo por si lo echáis en falta: un «lo último que
miraste». Con «A mano» resuelto, sería una función más para el mismo problema.

## Las pantallas

**Alta** — 01 Bienvenida · 02 Tu número · 03 Código · 04 Tu foto y tu nombre ·
05 Copia de seguridad

**Uso diario** — 07 Home (pestañas Fotos/Álbumes, con *Hoy hace 2 años*, *Por grupos
de personas* y *Por persona*) + 06 Permisos · 08 Álbum · 09 Foto ·
10 Persona no identificada · 11 Persona identificada · 12 Crear con IA

**Nuevo, de las entrevistas** — A mano · Ver una ficha

**Extras que ya estaban en la v1** — Buscar por voz · 13/14 Ver en grande · Tus cosas

## Pendiente

- **Fotos reales.** Los degradados distinguen un momento de otro, pero no sirven para
  probar si alguien reconoce a su nieta en una miniatura.
- **El pollito** (sección 13 del contexto). Su sitio natural aquí es
  *10 · Persona no identificada* y el momento en que alguien se queda parado.
- **Validar el color por función** con personas de 65+.
- **Decidir si «A mano» entra** (ver arriba). Es la decisión más grande que queda.
- Comprobar con usuarios si la palabra **«A mano»** se entiende sola. Sale de lo que
  dijeron ellos —«tener las fotos otra vez a mano»— pero eso no garantiza que funcione
  como etiqueta de un botón.
- Cerrar si *Buscar* se queda, dado que la sección 6 dice «sin buscadores»: aquí es
  por voz, que cumple las dos cosas, pero conviene decidirlo explícitamente.

## Referencias

- Apple — [Elegir la disposición de pantalla para el Acceso Asistido](https://support.apple.com/guide/assistive-access-iphone/choose-the-screen-layout-dev683243feb/ios)
- Android 14 — [escalado de fuente no lineal](https://developer.android.com/about/versions/14/features)
- WhatsApp — [deep links: qué permiten y qué no](https://www.appsflyer.com/blog/deep-linking/whatsapp-deep-link/)
