"""Integrated scene wiring checks; never a substitute for Unity import."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def read(path):return (ROOT/path).read_text()
checks=[]
def check(value,label):
    if not value:raise AssertionError(label)
    checks.append(label);print('PASS '+label)
base='Assets/RoyalPirate/'
scene=read(base+'Scenes/Integration.unity')
for name,path in [('combat','Scripts/Runtime/BattleBootstrap.cs'),('UI bridge','Scripts/Runtime/UI/BattleHudBridge.cs')]:
    guid=re.search(r'^guid: (.+)$',read(base+path+'.meta'),re.M)[1]
    check(scene.count('guid: '+guid+',')==1,'exactly one scene '+name)
bridge=read(base+'Scripts/Runtime/UI/BattleHudBridge.cs')
check('battle.diagnosticHud=false' in bridge and 'input.ExternalActionControls=true' in bridge,'integrated HUD disables diagnostic presentation and action input')
check('input.AdditionalUiBlocker=BlocksAim' in bridge,'UI excludes touch aiming')
check('presenter?.Dispose()' in bridge and 'adapter?.Dispose()' in bridge,'bridge releases subscriptions')
check(bridge.index('document.panelSettings=panel') < bridge.index('document.enabled=true'),'panel assigned before UIDocument re-enable')
check('cachedSafeArea==area' in bridge and 'cachedPanel==safe.panel' in bridge and 'cachedScreenWidth==Screen.width' in bridge and 'cachedScreenHeight==Screen.height' in bridge and 'cachedPanel=null' in bridge,'safe area caches stable layout and resets on unbind')
adapter=read(base+'Scripts/Runtime/UI/CombatHudAdapter.cs')
check('battle.TryPlayerFire()' in adapter and 'battle.SetPower(normalized)' in adapter and 'battle.TryAbility()' in adapter,'actions route to existing combat authority')
check('BattleOutcome.Draw' in adapter and 'Mathf.InverseLerp' in adapter,'draw and restricted power mapped')
harbour=read(base+'Scripts/Runtime/UI/HarbourBootstrap.cs')
check('battleStore.Save(loadout)' in harbour and 'new LocalLoadoutStore' in read(base+'Scripts/Runtime/BattleBootstrap.cs'),'harbour and battle share validated loadout projection')
check('AddComponent<BattleReturnButton>' not in harbour,'no extra return overlay spawned')
check('effects.PlayMuzzle' in read(base+'Scripts/Runtime/BattleBootstrap.cs'),'accepted shots trigger muzzle effect')
for path in ['Tools/DomainChecks/DomainChecks.csproj','Tools/Work4Checks/Work4Checks.csproj','Tools/QA/QA.csproj','Tools/IntegrationChecks/IntegrationChecks.csproj','Tools/Work4Syntax/Work4Syntax.csproj']:
    check((ROOT/path).is_file(),'reproducible runner '+path)
check('RoyalPirate.Editor.MobileProjectSetup.Prepare()' in read(base+'Scripts/Runtime/UI/Editor/IntegrationProjectSetup.cs'),'combined explicit project setup')
print(f'RESULT: {len(checks)} integration wiring checks passed. Unity NOT executed.')
