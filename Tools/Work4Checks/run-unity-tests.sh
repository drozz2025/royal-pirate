#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ -z "${UNITY_EDITOR:-}" || ! -x "$UNITY_EDITOR" ]]; then
  echo "BLOCKED: set UNITY_EDITOR to the executable for Unity 6000.3.28f1. No Unity compilation or tests were run."
  exit 2
fi
mkdir -p "$project_dir/TestResults/Work4"
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$project_dir" -executeMethod RoyalPirate.Editor.MobileProjectSetup.Prepare -quit -logFile "$project_dir/TestResults/Work4/setup-foundation.log"
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$project_dir" -executeMethod RoyalPirate.UI.Editor.Work4Setup.Prepare -quit -logFile "$project_dir/TestResults/Work4/setup-harbour.log"
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$project_dir" -runTests -testPlatform EditMode -testFilter RoyalPirate.Work4Tests -testResults "$project_dir/TestResults/Work4/editmode.xml" -logFile "$project_dir/TestResults/Work4/editmode.log"
# PlayMode visual/URP tests require a working graphics/display environment (e.g. an existing desktop or Xvfb).
"$UNITY_EDITOR" -batchmode -projectPath "$project_dir" -runTests -testPlatform PlayMode -testFilter RoyalPirate.Work4Tests -testResults "$project_dir/TestResults/Work4/playmode.xml" -logFile "$project_dir/TestResults/Work4/playmode.log"
