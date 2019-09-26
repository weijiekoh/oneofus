#!/usr/bin/env bash

cd "$(dirname "$0")"
cd ..
rm -rf abi
mkdir -p abi

if [[ -z "${SOLC}" ]]; then
    solcBinary="solc"
else
    solcBinary="${SOLC}"
fi

$solcBinary -o ./abi ./sol/*.sol --overwrite --optimize --abi --bin-runtime

node ./build/buildMiMC.js > abi/MiMC.bin
