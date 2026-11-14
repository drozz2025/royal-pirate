#!/usr/bin/env python3
"""Run available source checks; report Unity availability separately. No installs or spend."""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def main():
    p=argparse.ArgumentParser();p.add_argument('--dotnet',default='dotnet');p.add_argument('--output',type=Path,default=ROOT/'TestResults/Work0');a=p.parse_args()
    out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
    catalog='Assets/RoyalPirate/Data/Resources/Navio01.json'
    def net(project,*args):return [a.dotnet,'run','--project','Tools/'+project,'--',*args]
    suites=[('combat-domain',net('DomainChecks',catalog)),('qa-domain',net('QA',catalog,str(out/'qa-results.json'))),
            ('progression',net('Work4Checks',catalog,'Assets/RoyalPirate/UI/Resources/Work4Economy.json')),
            ('loadout-recovery',net('IntegrationChecks',catalog)),('csharp-syntax',net('Work4Syntax','Assets')),
            ('structure',[sys.executable,'Tools/validate_repository.py']),('integration-wiring',[sys.executable,'Tools/IntegrationChecks/static_checks.py']),
            ('qa-tools',[sys.executable,'-m','unittest','discover','-s','Tools/QA','-p','test_tools.py']),
            ('hygiene',[sys.executable,'Tools/QA/static_checks.py']),('whitespace',['git','diff','--check'])]
    rows=[]
    for name,cmd in suites:
        result=subprocess.run(cmd,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=300)
        (out/(name+'.txt')).write_text(result.stdout);rows.append({'suite':name,'exitCode':result.returncode})
        print(name+': '+('PASS' if result.returncode==0 else 'FAIL'),flush=True)
    sources={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for folder in ['Assets','Packages','ProjectSettings','Tools'] for f in (ROOT/folder).rglob('*') if f.is_file() and not set(f.parts)&{'bin','obj','__pycache__'}}
    report={'sourceHashes':sources,'results':rows,'unityExecuted':False,'mobileBuildExecuted':False,'battlesPlayed':0,
            'note':'C# syntax parsing is not Unity compilation. Persistence checks use System.Text.Json, not JsonUtility.'}
    (out/'execution.json').write_text(json.dumps(report,indent=2))
    return int(any(row['exitCode'] for row in rows))
if __name__=='__main__':sys.exit(main())
