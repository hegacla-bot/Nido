#!/bin/sh
# Nido · genera la carpeta que se publica en Netlify.
#
# Sale del ÚLTIMO COMMIT (git archive), no de lo que haya a medias en la carpeta, y solo con lo que necesita la app:
# index.html, css, js, assets, las funciones de netlify y netlify.toml. Nunca lleva .env (las claves van como secretos en
# Netlify), ni las notas internas, los documentos del agente, _archive, tools o el servidor local.
#
# Uso, desde cualquier sitio:  sh tools/preparar-publicacion.sh [carpeta]   (por defecto ~/Desktop/TFM/nido-publicar)
set -e
cd "$(dirname "$0")/.."
DEST="${1:-$HOME/Desktop/TFM/nido-publicar}"

if [ -n "$(git status --porcelain)" ]; then
  echo "Aviso: hay cambios sin commit; NO entran en la carpeta (sale del último commit)."
fi

rm -rf "$DEST"
mkdir -p "$DEST"
git archive HEAD index.html css js assets netlify netlify.toml | tar -x -C "$DEST"

# Comprobaciones: nada de claves ni archivos internos.
FALLO=0
for f in .env SESSION-NOTES.md servidor-local.mjs agente _archive tools; do
  if [ -e "$DEST/$f" ]; then echo "ERROR: no debería estar $f"; FALLO=1; fi
done
if grep -rIlE "sk_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|(ELEVENLABS_API_KEY|GEMINI_API_KEY|CLOUDFLARE_API_TOKEN)=[A-Za-z0-9]" "$DEST" >/dev/null 2>&1; then
  echo "ERROR: hay algo con forma de clave dentro de la carpeta:"
  grep -rIlE "sk_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|(ELEVENLABS_API_KEY|GEMINI_API_KEY|CLOUDFLARE_API_TOKEN)=[A-Za-z0-9]" "$DEST"
  FALLO=1
fi
[ "$FALLO" = 0 ] || exit 1

echo "Carpeta lista: $DEST ($(find "$DEST" -type f | wc -l | tr -d ' ') archivos, $(du -sh "$DEST" | cut -f1)) · commit $(git rev-parse --short HEAD)"
