#!/bin/bash

VERIFICATION_KEY_JSON="https://oneofus.blob.core.windows.net/snarks/verification_key.json"
PROVING_KEY_BIN="https://oneofus.blob.core.windows.net/snarks/proving_key.bin"
CIRCUIT_JSON="https://oneofus.blob.core.windows.net/snarks/circuit.json"
VERIFIER_SOL="https://oneofus.blob.core.windows.net/snarks/verifier.sol"

CIRCUIT_JSON_PATH="semaphore/semaphorejs/build/circuit.json"
PROVING_KEY_BIN_PATH="semaphore/semaphorejs/build/proving_key.bin"
VERIFICATION_KEY_PATH="semaphore/semaphorejs/build/verification_key.json"
VERIFIER_SOL_PATH="semaphore/semaphorejs/build/verifier.sol"

mkdir -p semaphore/semaphorejs/build

if [ ! -f "$CIRCUIT_JSON_PATH" ]; then
    echo "Downloading circuit.json"
    wget --quiet -O - $CIRCUIT_JSON | gunzip -c > $CIRCUIT_JSON_PATH
fi

if [ ! -f "$PROVING_KEY_BIN_PATH" ]; then
    echo "Downloading proving_key.bin"
    wget --quiet -O - $PROVING_KEY_BIN | gunzip -c > $PROVING_KEY_BIN_PATH
fi

if [ ! -f "$VERIFICATION_KEY_PATH" ]; then
    echo "Downloading verification_key.json"
    wget --quiet $VERIFICATION_KEY_JSON -O $VERIFICATION_KEY_PATH
fi

if [ ! -f "$VERIFIER_SOL_PATH" ]; then
    echo "Downloading verifier.sol"
    wget --quiet $VERIFIER_SOL -O $VERIFIER_SOL_PATH
fi
