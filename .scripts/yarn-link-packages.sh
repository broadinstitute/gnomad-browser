#!/usr/bin/env bash

IFS=$'\n' read -d '' -r -a packages <$(dirname $0)/RELEASABLE_PACKAGES

cd packages

for d in "${packages[@]}"; do
  echo "> ($d)";
  cd $d;
  localDeps=$(cat ./package.json | echo $(../../node_modules/.bin/jase localDependencies));
  for d2 in "${packages[@]}"; do
    if `echo ${localDeps} | grep "${d2}" 1>/dev/null 2>&1`; then
      echo "> yarn link $d2 in node_modules";
      yarn link $d2
    fi
  done
  echo "";
  cd ..;
done
