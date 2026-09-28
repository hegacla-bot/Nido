#!/usr/bin/env python3
# Nido · calcula una vez el lugar reconocible de cada foto de la biblioteca de ejemplo y lo guarda en assets/biblioteca.json ("lugar").
# Usa el mismo modo «clasificar» de ver-foto que la app al subir fotos (foto a 512 px, sin EXIF). Necesita el servidor local en marcha:
#   PORT=8999 node servidor-local.mjs   y luego   python3 tools/lugares-biblioteca.py [puerto]
import base64, json, subprocess, sys, tempfile, urllib.request, concurrent.futures as cf
PUERTO = sys.argv[1] if len(sys.argv) > 1 else '8999'
lista = json.load(open('assets/biblioteca.json', encoding='utf-8'))
def lugar(m):
    if m.get('tipo') == 'video': return None
    out = tempfile.mktemp(suffix='.jpg')
    subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', '512', m['src'], '--out', out], capture_output=True)
    b = base64.b64encode(open(out, 'rb').read()).decode()
    r = urllib.request.Request('http://localhost:%s/.netlify/functions/ver-foto' % PUERTO, data=json.dumps({'imageBase64': b, 'modo': 'clasificar'}).encode(), headers={'Content-Type': 'application/json'})
    try: return json.loads(urllib.request.urlopen(r, timeout=40).read()).get('lugar', '')
    except Exception as e: return None
with cf.ThreadPoolExecutor(2) as ex:
    res = list(ex.map(lugar, lista))
for m, l in zip(lista, res):
    if l is None: continue
    if l: m['lugar'] = l
    else: m.pop('lugar', None)
    print(m['src'].split('/')[-1], '→', l or '—')
json.dump(lista, open('assets/biblioteca.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
