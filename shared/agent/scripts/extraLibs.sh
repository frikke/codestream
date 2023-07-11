#!/usr/bin/env bash

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
mkdir -p "$SCRIPT_DIR/../dist"

if [[ -n "${TCBUILD_BYPASS_SUPPLEMENTAL_SOFTWARE}" ]]; then
  echo "Warning: TCBUILD_BYPASS_SUPPLEMENTAL_SOFTWARE set, skipping extraClientBuildLibs"
  exit 0
fi

if [[ -z "${TCBUILD_SUPPLEMENTAL_SOFTWARE_PATH}" ]]; then
  if [[ -n "${TEAMCITY_VERSION}" ]]; then
    echo "Error: TCBUILD_SUPPLEMENTAL_SOFTWARE_PATH missing in teamcity build"
    exit 1
  fi
  echo "Warning: TCBUILD_SUPPLEMENTAL_SOFTWARE_PATH not set, skipping extraClientBuildLibs"
  exit 0
fi

TARGET_PATH=$(readlink -f "$SCRIPT_DIR/../dist")

echo "Copying extraClientBuildLibs to $TARGET_PATH"
cp -r "$TCBUILD_SUPPLEMENTAL_SOFTWARE_PATH/node_modules" "$TARGET_PATH"
