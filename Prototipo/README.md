# Nido · v3 — contenido real de Figma

Implementación de la sección **"UI PROTOTIPADO (NO TOCAR)"** de la página *UI* en Figma
(`node-id=425-7405`) — las 8 pantallas con fotos reales, el pollito y el componente
Button real, no el flujo de wireframes numerados de `prototipo/` y `prototipo-v2/`.

```
cd "TFM/prototipo-v3"
python3 -m http.server 8934
```

## Las 8 pantallas

**Home** — fila Álbumes/Personas/Yo + "Mis recuerdos" (3 fotos)
**Onboarding 1-4** — tour de bienvenida sobre Home, con el pollito señalando cada botón
**Álbumes** · **Personas** · **Yo** — cada una con su botón "Volver"

Navegación: tocar Álbumes/Personas/Yo desde Home, tocar el avatar (lleva a Yo), o usar
el **panel de la demo** (arriba a la derecha, fuera del marco del móvil — no es parte
del diseño de Figma) para saltar directamente a cualquier pantalla o relanzar el tour.

## De dónde sale cada cosa

- **Botón (Assets, `315:4751`)** — fuente de verdad, 11 variantes (Type 1/2/3/Create ×
  Big × Horizontal/Vertical), verificado contra su uso real en las 8 pantallas, no
  contra instancias sueltas.
- **Iconos** — de la página *Icons* (17 categorías, ~1.120 en total): solo se extrajeron
  los que realmente aparecen en estas 8 pantallas (`image-01`, `users-01`,
  `face-smile`, `arrow-left`, `search-md`, `plus`, `settings-01`, `arrow-narrow-right`).
- **Fotos** — reales, no placeholder. Las 3 de "Mis recuerdos" (boda, bebés, disfraces)
  son fotos de archivo familiar; las de Personas/Álbumes/Yo son fotos de ejemplo
  reutilizadas por Figma como contenido de demostración (también reales, no bloques
  grises). Todas descargadas y comprimidas para web.
- **Tokens** (`css/tokens.css`) — auditados con `get_variable_defs` contra Assets y las
  8 pantallas: 7 colores, escala tipográfica Atkinson Hyperlegible, sombras de tarjeta
  y de botón. El espaciado (margen 20px, gap 16/20px, radio 12px) no está tokenizado
  como variable en Figma — se tomó de la geometría real, muy consistente entre pantallas.

## Componente Photo — no se usó

Existe un COMPONENT_SET "Photo" en la página *UI* (sección "Recursos editables",
`298:10300`, 2 variantes) que aún no está en Assets. **Las 8 pantallas reales no lo
instancian** — usan rectángulos redondeados con imagen de fondo directamente. Por eso
el prototipo hace lo mismo (`.photo-card` + `<img>`) en vez de esperar ese componente.

## Excepciones de diseño que NO se han "corregido"

Verificadas contra el código real de Figma, no asumidas:

1. **Dos negros distintos.** `#1a1d2c` (texto de la app) y `#1d1d1b` (reloj de la status
   bar, iOS). Se mantienen como dos tokens separados (`--color-black` /
   `--color-ios-black`) por si es intencional.
2. **Título de página sin variable.** "Álbumes" / "Personas" / "Yo" usan 22px en azul,
   un tamaño que no aparece en ninguna variable de Figma (las demás cabeceras usan 20px
   con `Nido normal/Title/Large`). Se mantiene tal cual, marcado en `tokens.css`.
3. **Margen de página: 20px aquí, no 24px.** (El flujo de wireframes de `prototipo-v2/`
   usa 24px — son proyectos distintos, no hay inconsistencia real.)

## Responsive

Base 1rem = 16px a 393px de viewport (`html { font-size: clamp(15px, 4.07vw, 17px) }`),
todo el layout en rem. El marco `.phone` tiene `max-width: 393px` con `aspect-ratio`,
así que escala hacia abajo en móviles pequeños y no crece más allá del ancho de
referencia en pantallas más anchas — la prioridad pedida era que 393×852 se viera
perfecto, por encima de la extrapolación.

## Pendiente de revisar en el navegador

No se ha podido verificar visualmente con Chrome automatizado en esta sesión (la
extensión no estaba conectada). Antes de darlo por bueno, comprobar especialmente:

- Las 4 direcciones del pollito en el onboarding (pasos 1 y 2 llevan espejado
  horizontal aplicado según la transformación real de Figma; 3 y 4 no).
- Las burbujas de diálogo del onboarding (radio asimétrico formando la "cola" hacia
  el pollito) en los 4 pasos.
- El grid de "Personas": Figma reutiliza las mismas 2 fotos de grupo para las 4
  tarjetas individuales (salvo una) — se ha respetado esa reutilización tal cual.
