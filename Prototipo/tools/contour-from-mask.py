#!/usr/bin/env python3
"""
Nido · convierte las máscaras de segment-personas.swift en los puntos de
polígono (% de la caja 393x390 de .detail-media) que espera PERSON_ZONES en
js/persona.js.

Uso:
  1. Compilar y correr segment-personas.swift sobre la foto:
       swiftc segment-personas.swift -o segment-personas
       ./segment-personas ruta/a/foto.jpg carpeta_salida/
     Imprime cuántas "instancias" (personas) encontró y guarda
     carpeta_salida/person-instance-N.png por cada una — a resolución
     completa de la foto, sin recortar nada.
  2. Descartar instancias espurias por área (una persona real ocupa muchos
     más píxeles que un falso positivo pequeño — ver el área impresa abajo,
     o mirar las máscaras directamente).
  3. Rellenar IMG_W/IMG_H (sips -g pixelWidth -g pixelHeight foto.jpg),
     MASKS_DIR e INSTANCES (los índices reales, ordenados como se quiera
     nombrar — p.ej. de izquierda a derecha por posición) y ejecutar este
     script.

Por qué existe: la primera versión de esta función trazaba las siluetas a
mano; la segunda usaba VNGenerateForegroundInstanceMaskRequest (genérica) con
recorte cara-por-cara porque fusionaba a las personas que se tocan — el
recorte cortaba el contorno en los hombros. VNGeneratePersonInstanceMaskRequest
(específica de personas) separa a cada persona entera, brazos incluidos, sin
recortar nada — este script asume esa segunda API.
"""
import cv2
import json

IMG_W, IMG_H = 1400, 1050   # tamaño real de la foto (sips -g pixelWidth -g pixelHeight)
BOX_W, BOX_H = 393, 390     # caja de .detail-media, fija — no cambiar salvo que cambie components.css
MASKS_DIR = "masks3"        # carpeta con los person-instance-N.png

# Índices reales tras descartar espurios, en el orden en que se quieran
# nombrar (aquí: izquierda a derecha según el centroide de cada máscara).
INSTANCES = {"izquierda": 3, "centro": 1, "derecha": 4}
SIMPLIFY_FACTOR = 0.004  # más alto = menos puntos/más simplificado; 0.003-0.006 suele ir bien

display_scale = BOX_H / IMG_H
scaled_img_w = IMG_W * display_scale
visible_crop_start_x = (scaled_img_w - BOX_W) / 2 / display_scale

results = {}
for name, idx in INSTANCES.items():
    mask = cv2.imread(f"{MASKS_DIR}/person-instance-{idx}.png", cv2.IMREAD_GRAYSCALE)
    _, binary = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    largest = max(contours, key=cv2.contourArea)
    peri = cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, SIMPLIFY_FACTOR * peri, True)

    pts = []
    for pt in approx.reshape(-1, 2):
        pct_x = (pt[0] - visible_crop_start_x) * display_scale / BOX_W * 100
        pct_y = pt[1] * display_scale / BOX_H * 100
        pts.append((round(float(pct_x), 2), round(float(pct_y), 2)))
    results[name] = pts

    print(f"-- {name} (instancia {idx}, {len(pts)} puntos) --")
    print(", ".join(f"[{x}, {y}]" for x, y in pts))
    print()

with open("contour_points_full.json", "w") as f:
    json.dump(results, f)
