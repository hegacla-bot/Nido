#!/usr/bin/env python3
"""
Nido · recolorea el logo "nido" que lleva horneado pollito-fotos.mp4.

El vídeo trae el logo en azul marino (RGB 38,53,130) pero Figma (571:7578) lo
pide en el azul de marca #516DFF. Como el logo está sobre fondo blanco puro
(ver Sesión 4 del 18 sept), cada píxel del logo es una mezcla
blanco↔marino: p = blanco*(1-a) + marino*a. Se estima a por proyección sobre la
recta blanco→marino y se sustituye el marino por el azul nuevo:
p' = p + a*(nuevo - marino). Los píxeles que no caen en esa recta (pollito,
fotos, mezclas con pelaje) no se tocan — el residuo alto los excluye.

Además empuja el fondo casi blanco (~251,254,251, deriva del re-encode H.264)
a blanco exacto con el mismo difference-matte de la Sesión 4 del 18 sept:
si no, se ve un rectángulo verdoso donde acaba el vídeo contra el fondo #fff.

Uso: python3 tools/recolor-logo-video.py entrada.mp4 salida.mp4
"""
import sys
import cv2
import numpy as np

SRC, DST = sys.argv[1], sys.argv[2]
WHITE = np.array([255, 255, 255], np.float32)
NAVY = np.array([38, 53, 130], np.float32)       # RGB, medido por mediana en el logo
TARGET = np.array([81, 109, 255], np.float32)    # #516DFF, azul de marca
RES_LOW, RES_HIGH = 14.0, 45.0                   # tolerancia a "no está en la recta"
BG_LOW, BG_HIGH = 6.0, 40.0                      # difference-matte del fondo
Y0, Y1 = 280, 570                                # franja donde vive el logo (800x1406)

d = WHITE - NAVY
dd = float(d @ d)

cap = cv2.VideoCapture(SRC)
fps = cap.get(cv2.CAP_PROP_FPS)
w, h = int(cap.get(3)), int(cap.get(4))
out = cv2.VideoWriter(DST, cv2.VideoWriter_fourcc(*"avc1"), fps, (w, h))
while True:
    ok, frame = cap.read()
    if not ok:
        break
    # 1) fondo -> blanco exacto (bg = mediana de las 4 esquinas de este frame)
    rgb = frame.astype(np.float32)[:, :, ::-1]
    corners = np.concatenate([rgb[:20, :20].reshape(-1, 3), rgb[:20, -20:].reshape(-1, 3),
                              rgb[-20:, :20].reshape(-1, 3), rgb[-20:, -20:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    dist = np.linalg.norm(rgb - bg, axis=2)
    alpha_fg = np.clip((dist - BG_LOW) / (BG_HIGH - BG_LOW), 0, 1)
    rgb = rgb + (1 - alpha_fg)[..., None] * (WHITE - bg)
    frame = np.clip(rgb, 0, 255).astype(np.uint8)[:, :, ::-1].copy()
    # 2) logo marino -> azul de marca
    band = frame[Y0:Y1].astype(np.float32)[:, :, ::-1]           # RGB
    v = WHITE - band
    alpha = np.clip((v @ d) / dd, 0, 1)
    resid = np.linalg.norm(v - alpha[..., None] * d, axis=2)
    weight = np.clip((RES_HIGH - resid) / (RES_HIGH - RES_LOW), 0, 1)
    a = alpha * weight
    new = band + a[..., None] * (TARGET - NAVY)
    frame[Y0:Y1] = np.clip(new, 0, 255).astype(np.uint8)[:, :, ::-1]
    out.write(frame)
cap.release()
out.release()
