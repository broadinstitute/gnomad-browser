#!/usr/bin/env bash

IFS=$'\n' read -d '' -r -a packages <$(dirname $0)/RELEASABLE_PACKAGES

cd packages

for d in "${packages[@]}"; do
  echo "> ($d)";
  cd lens-$d;
  deps=$(cat ./package.json | echo $(../../node_modules/.bin/jase dependencies));
  devdeps=$(cat ./package.json | echo $(../../node_modules/.bin/jase devDependencies));
  for d2 in "${packages[@]}"; do
    if `echo ${deps} | grep "@lens/${d2}" 1>/dev/null 2>&1`; then
      echo "> yarn link @lens/$d2 in node_modules";
      yarn link @lens/$d2
      # mkdir -p node_modules/@lens;
      # ln -s "../lens-"$d2 "node_modules/@lens/"$d2;
    fi
    if `echo ${devdeps} | grep "@lens/${d2}" 1>/dev/null 2>&1`; then
      echo "> yarn link @lens/$d2 in node_modules";
      yarn link @lens/$d2
      # mkdir -p node_modules/@lens;
      # ln -s "../lens-"$d2 "node_modules/@lens/"$d2;
    fi
  done
  echo "";
  cd ..;
done
