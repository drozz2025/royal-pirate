#!/usr/bin/env python3
"""Explicit local, licensed Unity execution. No installation, activation, upload or spend."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET
from verify_test_results import validate

ROOT = Path(__file__).resolve().parents[2]
VERSION = '6000.3.28f1'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--editor', default=os.environ.get('UNITY_EDITOR'))
    parser.add_argument('--mode', choices=['core', 'simulation'], default='core')
    parser.add_argument('--battles', type=int, default=1000)
    parser.add_argument('--output', type=Path, default=ROOT/'TestResults/QA')
    args = parser.parse_args()
    if not args.editor or not Path(args.editor).is_file():
        print('BLOCKED: UNITY_EDITOR must point to an installed, licensed Unity editor. No tests executed.', file=sys.stderr)
        return 2
    if not 1 <= args.battles <= 10000: parser.error('--battles must be 1..10000')
    output = args.output.resolve(); output.mkdir(parents=True, exist_ok=True)
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip())
    evidence = {'commit': sha, 'dirty': dirty, 'expectedEditor': VERSION, 'mode': args.mode, 'status': 'running', 'runs': []}
    evidence_path = output/('evidence-'+args.mode+'.json')
    evidence_path.write_text(json.dumps(evidence, indent=2))
    try:
        version = subprocess.run([args.editor, '-version'], capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as error:
        evidence['status'] = 'blocked-editor-version'; evidence['error'] = str(error)
        evidence_path.write_text(json.dumps(evidence, indent=2)); return 2
    if version.returncode or VERSION not in version.stdout + version.stderr:
        evidence['status'] = 'blocked-editor-version'; evidence_path.write_text(json.dumps(evidence, indent=2))
        print('BLOCKED: editor version does not match project', file=sys.stderr); return 2
    env = os.environ.copy();env.update(ROYAL_QA_BATTLES=str(args.battles), ROYAL_QA_COMMIT=sha,
                                       ROYAL_QA_SIM_REPORT=str(output/'battles.json'))
    modes = ['EditMode', 'PlayMode'] if args.mode == 'core' else ['PlayMode']
    failed = False
    for mode in modes:
        label = mode.lower() + ('-simulation' if args.mode == 'simulation' else '')
        xml = output/(label+'.xml'); log = output/(label+'.log')
        # Remove stale evidence before invocation. A failed process cannot reuse old passing XML.
        xml.unlink(missing_ok=True);log.unlink(missing_ok=True)
        command = [args.editor, '-batchmode', '-nographics', '-projectPath', str(ROOT), '-runTests',
                   '-testPlatform', mode, '-testCategory', 'Simulation' if args.mode == 'simulation' else '!Simulation',
                   '-testResults', str(xml), '-logFile', str(log)]
        run = {'platform': mode, 'xml': str(xml), 'passed': False}
        try:
            process = subprocess.run(command, cwd=ROOT, env=env, timeout=7200 if args.mode == 'simulation' else 1800)
            run['exitCode'] = process.returncode
            if process.returncode: raise ValueError('Unity process returned nonzero')
            run['cases'] = validate(xml); run['sha256'] = hashlib.sha256(xml.read_bytes()).hexdigest(); run['passed'] = True
        except (ValueError, OSError, ET.ParseError, subprocess.TimeoutExpired) as error:
            run['error'] = str(error); failed = True
        evidence['runs'].append(run);evidence_path.write_text(json.dumps(evidence, indent=2))
    evidence['status'] = 'failed' if failed else 'passed'
    evidence['dirtyAfterRun'] = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip())
    evidence_path.write_text(json.dumps(evidence, indent=2));print(json.dumps(evidence, indent=2))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
