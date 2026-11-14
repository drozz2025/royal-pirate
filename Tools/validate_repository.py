#!/usr/bin/env python3
"""Structural checks only; never substitutes Unity compilation or device execution."""
import hashlib
import json
from pathlib import Path
import re
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[1]
checks = 0

def check(condition, label):
    global checks
    if not condition:
        raise AssertionError(label)
    checks += 1
    print('PASS', label)

for name in ['README.md', 'ARCHITECTURE.md', 'ROADMAP.md', 'TASKS.md', 'ASSET_MANIFEST.md', 'TEST_PLAN.md', 'CHANGELOG.md']:
    check((ROOT/name).is_file(), 'required document: '+name)

manifest = json.loads((ROOT/'Packages/manifest.json').read_text())
check(manifest['dependencies']['com.unity.render-pipelines.universal'] == '17.3.0', 'URP pin')
check('6000.3.28f1' in (ROOT/'ProjectSettings/ProjectVersion.txt').read_text(), 'Editor pin')
check(all(re.fullmatch(r'\d+\.\d+\.\d+', v) for v in manifest['dependencies'].values()), 'no floating/Git package dependencies')

metas = {}
for path in (ROOT/'Assets').rglob('*.meta'):
    match = re.search(r'^guid: ([0-9a-f]{32})$', path.read_text(), re.M)
    assert match, f'Invalid meta {path}'
    assert match[1] not in metas, f'Duplicate GUID {path}'
    metas[match[1]] = path
    assert Path(str(path)[:-5]).exists(), f'Orphan meta {path}'
for path in (ROOT/'Assets').rglob('*'):
    if path.suffix != '.meta':
        assert Path(str(path)+'.meta').is_file(), f'Missing meta {path}'
check(bool(metas), f'{len(metas)} unique GUIDs, assets and directories have metas')

assemblies = {}
for path in (ROOT/'Assets').rglob('*.asmdef'):
    data = json.loads(path.read_text())
    assert data['name'] not in assemblies
    assemblies[data['name']] = data
external = {'Unity.InputSystem', 'Unity.RenderPipelines.Universal.Runtime', 'Unity.RenderPipelines.Core.Runtime'}
for name, data in assemblies.items():
    assert all(ref in assemblies or ref in external for ref in data.get('references', [])), name
def visit(name, stack):
    assert name not in stack, f'Assembly cycle: {stack} -> {name}'
    for ref in assemblies[name].get('references', []):
        if ref in assemblies:
            visit(ref, stack+[name])
for name in assemblies:
    visit(name, [])
check(True, f'{len(assemblies)} assemblies: references resolve and graph is acyclic')
check(all('using Unity' not in p.read_text() for p in (ROOT/'Assets/RoyalPirate/Scripts/Domain').glob('*.cs')), 'domain independent of Unity')

scene = (ROOT/'Assets/RoyalPirate/Scenes/Integration.unity').read_text()
for guid in re.findall(r'guid: ([0-9a-f]{32})',scene):
    assert guid in metas
check(True, 'scene script GUID resolves')

catalog = json.loads((ROOT/'Assets/RoyalPirate/Data/Resources/Navio01.json').read_text())
modules = {m['id']:m for m in catalog['modules']}
check(len(modules)==len(catalog['modules'])==10, 'ten unique module definitions')
check(set(m['kind'] for m in modules.values())==set(range(10)), 'all ten component categories covered')
check(len({m['id'] for m in catalog['mounts']})==len(catalog['mounts']), 'unique mount IDs')
for mount in catalog['mounts']:
    assert modules[mount['defaultModuleId']]['kind']==mount['kind']
check(True, 'all starter mounts compatible')

for entry in json.loads((ROOT/'Documentation/asset-checksums.json').read_text()):
    data=(ROOT/entry['path']).read_bytes()
    check(len(data)==entry['bytes'] and hashlib.sha256(data).hexdigest()==entry['sha256'], 'original checksum: '+entry['path'])
data=(ROOT/'Modelos_3D/Navio_01/RoyalPirate_Navio01_Modular.glb').read_bytes()
magic,version,length=struct.unpack_from('<III',data)
assert magic==0x46546c67 and version==2 and length==len(data)
chunk_length,chunk_type=struct.unpack_from('<II',data,12)
assert chunk_type==0x4e4f534a
gltf=json.loads(data[20:20+chunk_length])
check(len(gltf['meshes'])==26, 'GLB header, length, JSON and 26 meshes')

files=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=ROOT,text=True).splitlines()
check(not any(any(part.lower() in {'library','temp','obj','bin','build','builds','logs','usersettings'} for part in Path(f).parts) for f in files), 'no cache/build files in proposed source set')
print(f'RESULT: {checks} structural checks passed. Unity NOT executed.')
