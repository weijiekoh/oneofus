#!/bin/bash

VERIFICATION_KEY_JSON="https://www.dropbox.com/s/chdgp5hlcuzbj3n/verification_key.json?dl=1"
PROVING_KEY_BIN="https://www.dropbox.com/s/xx93jcvft6u4hi8/proving_key.bin?dl=1"
CIRCUIT_JSON="https://www.dropbox.com/s/pv4je0ebr0xp9p6/circuit.json?dl=1"
VERIFIER_SOL="https://www.dropbox.com/s/2g3bvv8r0b36gmz/verifier.sol?dl=1"

CIRCUIT_JSON_PATH="semaphore/semaphorejs/build/circuit.json"
PROVING_KEY_BIN_PATH="semaphore/semaphorejs/build/proving_key.bin"
VERIFICATION_KEY_PATH="semaphore/semaphorejs/build/verification_key.json"
VERIFIER_SOL_PATH="semaphore/semaphorejs/build/verifier.sol"

mkdir -p semaphore/semaphorejs/build

if [ ! -f "$CIRCUIT_JSON_PATH" ]; then
    echo "Downloading circuit.json"
    wget --quiet $CIRCUIT_JSON -O $CIRCUIT_JSON_PATH
fi

if [ ! -f "$PROVING_KEY_BIN_PATH" ]; then
    echo "Downloading proving_key.bin"
    wget --quiet $PROVING_KEY_BIN -O $PROVING_KEY_BIN_PATH
fi

if [ ! -f "$VERIFICATION_KEY_PATH" ]; then
    echo "Downloading verification_key.json"
    wget --quiet $VERIFICATION_KEY_JSON -O $VERIFICATION_KEY_PATH
fi

if [ ! -f "$VERIFIER_SOL_PATH" ]; then
    echo "Downloading verifier.sol"
    wget --quiet $VERIFIER_SOL -O $VERIFIER_SOL_PATH
fi
