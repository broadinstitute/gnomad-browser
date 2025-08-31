#!/bin/bash

export NODE_ENV=${NODE_ENV:-development}

if [[ $NODE_ENV == "development" ]]; then
  npx ts-node src/server.ts
else
  node dist/server.js
fi