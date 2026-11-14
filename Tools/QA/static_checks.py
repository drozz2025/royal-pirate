#!/usr/bin/env python3
"""Source hygiene complements (never replaces) Unity compilation and secret review."""
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
CONFLICT = re.compile(r'^(?:<{7}(?: |$)|={7}$|>{7}(?: |$))', re.M)
# Only high confidence patterns. Never print matching credential contents.
SECRET = re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bAKIA[A-Z0-9]{16}\b')
FORBIDDEN = {'.p12', '.pfx', '.jks', '.keystore', '.mobileprovision'}


def check_file(path, data):
    problems = []
    if Path(path).suffix.lower() in FORBIDDEN or Path(path).name == '.env':
        problems.append('credential/signing file')
    if b'\0' not in data:
        text = data.decode('utf-8', errors='replace')
        if CONFLICT.search(text): problems.append('unresolved merge conflict')
        if SECRET.search(text): problems.append('possible embedded credential')
    return problems


def main():
    paths = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
    failures = []
    for relative in sorted(set(filter(None, paths))):
        path = ROOT / relative
        if not path.is_file(): continue
        for reason in check_file(relative, path.read_bytes()): failures.append({'path': relative, 'reason': reason})
    required = ['Tools/QA/QA.csproj', 'Tools/QA/run_unity.py',
                'Documentation/Reports/Work5/COMPATIBILITY.md', 'Documentation/Reports/Work5/RISKS.md']
    for relative in required:
        if not (ROOT/relative).is_file(): failures.append({'path': relative, 'reason': 'required QA file missing'})
    print(json.dumps({'suite': 'source-hygiene', 'filesScanned': len(set(filter(None, paths))), 'failures': failures}, indent=2))
    return bool(failures)


if __name__ == '__main__':
    sys.exit(main())
