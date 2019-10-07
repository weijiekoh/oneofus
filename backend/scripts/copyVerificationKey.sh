#!/bin/sh

set -e

cd "$(dirname "$0")"
cd ../..

mkdir -p backend/snarks/
cp semaphore/semaphorejs/build/verification_key.json backend/snarks/
