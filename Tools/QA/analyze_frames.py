#!/usr/bin/env python3
"""Analyze measured device CSV. Never converts headless timing into mobile FPS."""
import argparse
import csv
import json
import math
from pathlib import Path


def summarize(frames):
    if not frames or any(not math.isfinite(x) or x <= 0 for x in frames):
        raise ValueError('Expected positive measured frame_ms values')
    values = sorted(frames)
    def percentile(p): return values[max(0, math.ceil(p*len(values))-1)]
    return {'frames': len(values), 'duration_seconds': sum(values)/1000,
            'average_fps': 1000*len(values)/sum(values),
            'p50_ms': percentile(.5), 'p95_ms': percentile(.95), 'p99_ms': percentile(.99),
            'frames_over_50ms': sum(x>50 for x in values), 'max_ms': max(values)}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('csv', type=Path)
    parser.add_argument('--device', required=True)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args=parser.parse_args()
    with args.csv.open() as stream: metrics=summarize([float(row['frame_ms']) for row in csv.DictReader(stream)])
    report={'device':args.device,'commit':args.commit,'source':str(args.csv),'metrics':metrics,
            'provisional_frame_budget_met':metrics['p95_ms']<=1000/30 and metrics['p99_ms']<=50 and metrics['duration_seconds']>=1200,
            'release_approved':False,'limitations':'Frame pacing only; memory, GPU, thermals, battery, visual correctness and physical-device provenance require independent evidence.'}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))


if __name__=='__main__': main()
