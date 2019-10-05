#!/bin/sh

set -e

cd "$(dirname "$0")"
cd ../..

cp semaphore/semaphorejs/build/verification_key.json backend/snarks/
