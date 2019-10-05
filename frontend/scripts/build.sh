#!/bin/bash

rm -rf build

npx parcel build index.html --no-source-maps --out-dir=build --no-minify
