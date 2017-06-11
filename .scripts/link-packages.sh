#!/usr/bin/env bash

IFS=$'\n' read -d '' -r -a packages <$(dirname $0)/RELEASABLE_PACKAGES

cd packages

for d in "${packages[@]}"; do
  echo "> ($d)";
  cd $d;
  localDeps=$(cat ./package.json | echo $(../../node_modules/.bin/jase localDependencies));
  for d2 in "${packages[@]}"; do
    if `echo ${localDeps} | grep "${d2}" 1>/dev/null 2>&1`; then
      echo "> Copying local dependency $d2 to node_modules";
      cp -r ../$d2 ./node_modules
    fi
  done
  echo "";
  cd ..;
done
