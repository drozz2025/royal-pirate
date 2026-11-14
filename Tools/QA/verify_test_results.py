#!/usr/bin/env python3
"""Fail closed on absent, empty, skipped, inconclusive or failed NUnit results."""
import argparse
import json
from pathlib import Path
import xml.etree.ElementTree as ET


def validate(path):
    root = ET.parse(path).getroot()
    if root.tag != 'test-run' or root.get('result') != 'Passed':
        raise ValueError(f'{path}: test-run must report Passed')
    cases = root.findall('.//test-case')
    if not cases:
        raise ValueError(f'{path}: no test cases executed')
    failures = [c.get('fullname', c.get('name', '?')) for c in cases if c.get('result') != 'Passed']
    if failures:
        raise ValueError(f'{path}: non-passing cases: {failures}')
    for name in ('failed', 'skipped', 'inconclusive'):
        if int(root.get(name, '0')) != 0:
            raise ValueError(f'{path}: {name} is nonzero')
    if int(root.get('total', '-1')) != len(cases) or int(root.get('passed', '-1')) != len(cases):
        raise ValueError(f'{path}: inconsistent counters')
    return len(cases)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('xml', nargs='+', type=Path)
    args = parser.parse_args()
    results = {str(path): validate(path) for path in args.xml}
    print(json.dumps({'status': 'passed', 'executedCases': results}))


if __name__ == '__main__':
    main()
