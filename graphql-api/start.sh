#!/bin/sh -eu

export NODE_ENV=development

if [[ -n ${DEBUG:-""} ]]; then
	# Invoking Node with these flags allows us to attach the interactive
	# debugger for Node that's built into Chrome.
	pnpm node -r ts-node/register --inspect ./src/app.ts
elif [[ -n ${PROFILE:-""} ]]; then
	pnpm node -r ts-node/register --inspect --cpu-prof --cpu-prof-dir=./profiles ./src/app.ts
else
	pnpm ts-node ./src/app.ts
fi