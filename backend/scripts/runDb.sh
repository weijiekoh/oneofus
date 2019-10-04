#!/bin/bash

cd "$(dirname "$0")"
cd ../db
docker build . -t postgres_alpine
docker run -d --name oneofus_db_dev -p 5001:5432 postgres_alpine
