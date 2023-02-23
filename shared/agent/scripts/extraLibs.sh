#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
mkdir -p "$SCRIPT_DIR/../dist"
if [ -f "$SCRIPT_DIR/../dist/node_modules/fsevents/fsevents.node" ]; then
  echo "fsevents already downloaded, skipping extraClientBuildLibs"
  exit 0
fi

mytmpdir=$(mktemp -d 2>/dev/null || mktemp -d -t 'mytmpdir')
function cleanup {
  if [ -n "$mytmpdir" -a "$mytmpdir" != "" ]; then
    echo "Cleaning up $mytmpdir"
    rm "$mytmpdir/extraClientBuildLibs.zip"
    rmdir "$mytmpdir"
  fi
}
trap cleanup EXIT

echo "Downloading extraClientBuildLibs to $mytmpdir"
curl -s --fail -o "$mytmpdir/extraClientBuildLibs.zip" https://assets.codestream.com/lib/extraClientBuildLibs.zip
exit_code=$?
if [ $exit_code != 0 ]; then
  echo "Warning: could not download extraClientBuildLibs.zip. This is OK unless running full package deployment"
  exit 0
fi

pushd "$SCRIPT_DIR/../dist"
unzip -o "$mytmpdir/extraClientBuildLibs.zip"
pwd
# TODO should be in esbuild.ts but the copyPlugin royally messes up directory copies (flattens them)
cp -R node_modules ../../../vscode/dist/
popd
