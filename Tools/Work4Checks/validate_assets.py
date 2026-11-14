"""Static Work 4 integration checks. Not an asset import / render / Unity compile."""
import json,re,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2]
metas={re.search(r'^guid: ([0-9a-f]{32})$',p.read_text(),re.M)[1]:p for p in (root/'Assets').rglob('*.meta')}
count=0
def check(ok,label):
 global count
 assert ok,label
 count+=1;print('PASS',label)
script=root/'Assets/RoyalPirate/Scripts/Runtime/UI/HarbourBootstrap.cs.meta'
guid=re.search(r'^guid: (.+)$',script.read_text(),re.M)[1]
for rel in ['Assets/RoyalPirate/Scenes/Shipyard/Harbour.unity','Assets/RoyalPirate/Prefabs/UI/Harbour.prefab']:
 text=(root/rel).read_text();refs=re.findall(r'guid: ([0-9a-f]{32})',text)
 check(guid in refs and all(x in metas for x in refs),'Harbour script reference: '+rel)
config=json.loads((root/'Assets/RoyalPirate/UI/Resources/Work4Economy.json').read_text())
check(len(config['ships'])==24 and sum(s['available'] for s in config['ships'])==1,'24 planned ships; exactly one available')
check(len(config['stageNames'])==5 and len(config['stageCosts'])==4,'five Royal Sloop stages')
check(len(config['heroes'])==5 and {h['heroClass'] for h in config['heroes']}==set(range(5)),'five distinct hero classes')
check(config['initialCoins']>=sum(config['stageCosts']),'sandbox starting wallet permits testing all five stages')
check((root/'Assets/RoyalPirate/UI/Resources/HarbourTheme.tss').read_text().strip()=='@import url("unity-theme://default");','runtime default theme included')
changed=subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=root,text=True).splitlines()
check(all(p.startswith(('Assets/RoyalPirate/Prefabs/UI','Assets/RoyalPirate/Scenes/Shipyard','Assets/RoyalPirate/Scripts/Runtime/Progression','Assets/RoyalPirate/Scripts/Runtime/UI','Assets/RoyalPirate/Tests/Work4','Assets/RoyalPirate/UI/Resources','Tools/Work4','Documentation/Work4')) for p in changed),'changes confined to Work 4 paths')
check(not subprocess.check_output(['git','diff','--diff-filter=MD','--name-only','HEAD'],cwd=root,text=True).strip(),'no pre-existing source/model modified or deleted')
print(f'RESULT: {count} Work 4 structural checks passed. Unity NOT executed.')
