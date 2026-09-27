# Nido · prototipo (v3)

App de fotos familiares para que la persona mayor la use ella misma, tocando o hablando con **Nidi**, su asistente de voz.

**Web publicada:** https://nido-tfm.netlify.app

## Qué hay en esta carpeta

| Carpeta / archivo | Qué es |
|---|---|
| `index.html` | Todas las pantallas de la app |
| `css/` | Estilos (colores, tipografía, cada pantalla) |
| `js/` | Lo que hace funcionar la app: navegación, álbumes, personas, felicitaciones, Nidi |
| `assets/` | Imágenes, iconos, vídeos, el pollito y la biblioteca de fotos de ejemplo (con consentimiento de quienes salen) |
| `netlify/functions/` | Las 3 piezas que corren en el servidor: `agente-voz` (conecta con Nidi), `ver-foto` (Nidi mira una foto o detecta si es un documento) y `crear-imagen` (felicitaciones con IA) |
| `agente/` | Todo sobre Nidi: su prompt (`PROMPT.md`), sus herramientas (`HERRAMIENTAS.md`) y cómo montarlo (`LEEME.md`) |
| `SESSION-NOTES.md` | Diario técnico: cada cambio, por qué se hizo y qué falta |
| `servidor-local.mjs` | Para probar la app en el ordenador con las funciones del servidor |
| `tools/preparar-publicacion.sh` | Prepara la carpeta que se sube a Netlify (sin claves ni notas) |

## Qué usa por dentro

- **Nidi (voz):** ElevenLabs Agents. Nidi puede moverse por la app, abrir fotos de alguien, poner nombres, subir fotos, mover fotos de álbum y crear felicitaciones.
- **Ver fotos y documentos:** Gemini (modelo Gemma). Solo se manda la foto abierta, reducida y sin ubicación, y solo cuando hace falta.
- **Felicitaciones:** Cloudflare Workers AI. El título lo escribe la app, nunca la IA.
- **Reconocer caras:** en el propio dispositivo (face-api). Las caras nunca salen del móvil.

## Probarla en el ordenador

Hace falta [Node.js](https://nodejs.org) y un archivo `.env` con las claves (no está en el repositorio, pídelo al equipo):

```
ELEVENLABS_API_KEY=…
ELEVENLABS_AGENT_ID=…
GEMINI_API_KEY=…
CLOUDFLARE_API_TOKEN=…
CLOUDFLARE_ACCOUNT_ID=…
```

Después, desde esta carpeta:

```
node servidor-local.mjs
```

y abre http://localhost:8990 en el navegador (mejor Chrome, y acepta el micrófono para hablar con Nidi).

## Publicarla en Netlify

1. `sh tools/preparar-publicacion.sh` → crea `nido-publicar` con solo lo necesario.
2. Las 5 claves van como variables de entorno en Netlify (nunca en el código).
3. `npx netlify-cli deploy --prod --dir . --functions netlify/functions` desde `nido-publicar`.

## Equipo

Ainhoa · Clara · Josep — TFM de diseño, 2026.
