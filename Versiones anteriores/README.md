# Versiones anteriores del prototipo

Cómo ha evolucionado el prototipo de Nido hasta la versión actual (carpeta [`Prototipo/`](../Prototipo)).
Estas versiones no se hicieron con git, así que se suben **tal como quedaron**, sin historial propio. La versión actual sí tiene su historial de cambios.

| Versión | Fecha | Qué es |
|---|---|---|
| [`v1-wireframes`](v1-wireframes) | 10 sep 2026 | Los wireframes del equipo (Figma, página UX) llevados a un prototipo navegable en HTML, con una capa de accesibilidad inspirada en Acceso Asistido y Acceso Guiado de iOS y en el anclaje de pantalla de Android. |
| [`v2-acceso-asistido`](v2-acceso-asistido) | 10 sep 2026 | Las mismas pantallas y el mismo flujo que la v1, adaptados al lenguaje visual y de navegación de Acceso Asistido de iPhone. No cambia el producto: cambia cómo se presenta y cómo se navega. |
| **v3 — actual** ([`Prototipo/`](../Prototipo)) | desde sep 2026 | La app con el diseño UI de Figma, fotos reales, reconocimiento de personas en el dispositivo, álbumes, felicitaciones con IA, Mis documentos y **Nidi**, la asistente de voz. Botones y voz a la vez. |
| [`v4-concepto-conversacional`](v4-concepto-conversacional) | 22 sep 2026 | Exploración a partir del feedback del tutor: una app **solo conversacional**, sin botones. Nidi conversa sobre las fotos, guarda lo que la persona cuenta y escribe la historia del recuerdo. Se evaluó como alternativa; de ella salió el enfoque de la versión actual, que combina botones y voz. |

## Cómo abrirlas

- **v1 y v2:** abre `index.html` en el navegador (o `python3 -m http.server` dentro de la carpeta).
- **v4:** necesita un archivo `.env.concepto` con las claves de ElevenLabs (no está en el repositorio) y `node servidor-concepto.mjs`. Sin claves funciona en modo simulado.
