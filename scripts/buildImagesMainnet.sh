#!/bin/bash
set -e

echo "Building oou-build"
docker build -f Dockerfile -t oou-build --target oou-build --build-arg NODE_ENV=mainnet .

echo "Building oou-base"
docker build -f Dockerfile -t oou-base --target oou-base --build-arg NODE_ENV=mainnet .

echo "Building images using docker-compose"
docker-compose -f docker/docker-compose-mainnet.yml build
