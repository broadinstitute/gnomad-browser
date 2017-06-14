#!/usr/bin/env bash

IFS=$'\n' read -d '' -r -a packages <$(dirname $0)/RELEASABLE_PACKAGES

cd packages
echo "hello!"
cd gnomad;
localDeps=$(cat ./package.json | echo $(../../node_modules/.bin/jase localDependencies));
for d2 in "${packages[@]}"; do
  if `echo ${localDeps} | grep "${d2}" 1>/dev/null 2>&1`; then
    echo "> Copying local dependency $d2 to node_modules";
    rm -rf ./node_modules/$d2;
    cp -r ../$d2 ./node_modules;
  fi
done
echo "Done copying";
echo "";
