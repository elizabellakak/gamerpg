"""Convert every .glb under a folder to an embedded-buffer glTF JSON (<name>.gltf.json)."""
import base64, json, os, struct, sys

def convert(path):
    data = open(path, 'rb').read()
    magic, version, length = struct.unpack_from('<III', data, 0)
    assert magic == 0x46546C67, path
    off = 12
    doc, binchunk = None, b''
    while off < length:
        clen, ctype = struct.unpack_from('<II', data, off)
        chunk = data[off + 8: off + 8 + clen]
        if ctype == 0x4E4F534A: doc = json.loads(chunk)
        elif ctype == 0x004E4942: binchunk = chunk
        off += 8 + clen
    if doc.get('buffers'):
        doc['buffers'][0]['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(binchunk).decode()
    out = path[:-4] + '.gltf.json'
    with open(out, 'w') as f: json.dump(doc, f, separators=(',', ':'))
    os.remove(path)

root = sys.argv[1]
for d, _, fs in os.walk(root):
    for f in fs:
        if f.endswith('.glb'): convert(os.path.join(d, f))
