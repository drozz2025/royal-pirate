#!/usr/bin/env bash
set -euo pipefail
: "${UNITY_EDITOR:?Set UNITY_EDITOR to an existing licensed Unity 6000.3.28f1 executable}"
combat_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
mkdir -p "$combat_root/TestResults"
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$combat_root" -executeMethod RoyalPirate.Editor.MobileProjectSetup.Prepare -quit -logFile "$combat_root/TestResults/setup.log"
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$combat_root" -runTests -testPlatform EditMode -testResults "$combat_root/TestResults/editmode.xml" -logFile "$combat_root/TestResults/editmode.log"
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$combat_root" -runTests -testPlatform PlayMode -testResults "$combat_root/TestResults/playmode.xml" -logFile "$combat_root/TestResults/playmode.log"
python3 - "$combat_root/TestResults" <<'PY'
import sys, pathlib, xml.etree.ElementTree as ET
for name in ['editmode.xml','playmode.xml']:
    root=ET.parse(pathlib.Path(sys.argv[1])/name).getroot()
    assert root.get('result')=='Passed' and int(root.get('failed','0'))==0 and int(root.get('total','0'))>0, ET.tostring(root).decode()[:500]
    print(name, root.get('total'), 'passed')
PY
