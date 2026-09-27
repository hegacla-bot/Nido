// Nido · segmenta cada persona de una foto por separado, cuerpo entero
// (incluidos los brazos), usando el framework Vision de Apple — la misma
// tecnología detrás de "Levantar sujeto" en Fotos/Vista previa.
//
// Usa VNGeneratePersonInstanceMaskRequest (API específica de personas),
// NO VNGenerateForegroundInstanceMaskRequest (la genérica de "objeto
// destacado"). Se probó la genérica primero y, sobre una foto con varias
// personas cuyos brazos se tocan (una selfie de 3), la fusionó a las 3 en
// un solo "instance" — hubo que recortar cara por cara y el resultado se
// cortaba en los hombros. La API de personas entiende "persona" como
// concepto (no solo "región de color conectada") y separa a las 3 limpio,
// cuerpo entero, sin recortar nada de antemano. Requiere macOS 14 / Xcode
// command line tools (Vision framework, sin API keys ni red).
//
// Uso:
//   swiftc segment-personas.swift -o segment-personas
//   ./segment-personas ruta/a/foto.jpg carpeta_salida/
//
// Guarda una máscara PNG (blanco y negro) por cada persona detectada, más
// alguna instancia espuria de área muy pequeña que hay que descartar a
// ojo (o por área en píxeles — ver contour-from-mask.py).

import Vision
import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count >= 3 else {
    print("usage: segment-personas <input.jpg> <output_dir>")
    exit(1)
}
let inputPath = args[1]
let outDir = args[2]

guard let nsImage = NSImage(contentsOfFile: inputPath),
      let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("could not load image")
    exit(1)
}

let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
let request = VNGeneratePersonInstanceMaskRequest()

try requestHandler.perform([request])

guard let result = request.results?.first else {
    print("no result")
    exit(1)
}

print("instancias encontradas: \(result.allInstances)")

func saveMask(_ pixelBuffer: CVPixelBuffer, name: String) {
    let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
    let context = CIContext()
    guard let cg = context.createCGImage(ciImage, from: ciImage.extent) else { return }
    let rep = NSBitmapImageRep(cgImage: cg)
    guard let data = rep.representation(using: .png, properties: [:]) else { return }
    let url = URL(fileURLWithPath: outDir).appendingPathComponent(name)
    try? data.write(to: url)
    print("guardada \(url.path) tamaño=\(cg.width)x\(cg.height)")
}

for instance in result.allInstances {
    do {
        let mask = try result.generateScaledMaskForImage(forInstances: [instance], from: requestHandler)
        saveMask(mask, name: "person-instance-\(instance).png")
    } catch {
        print("máscara de la instancia \(instance) falló: \(error)")
    }
}
