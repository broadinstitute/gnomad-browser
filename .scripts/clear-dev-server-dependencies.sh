#!/usr/bin/env bash

IFS=$'\n' read -d '' -r -a packages <$(dirname $0)/RELEASABLE_PACKAGES

echo "Cleaning dev-server node_modules"
cd packages/lens-dev-server;
localDeps=$(cat ./package.json | echo $(../../node_modules/.bin/jase localDependencies));
for d2 in "${packages[@]}"; do
  echo "> Removing $d2 from node_modules";
  rm -rf ./node_modules/$d2;
done
echo "Done cleaning";
echo "";
