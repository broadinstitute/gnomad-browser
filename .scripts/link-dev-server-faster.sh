#!/usr/bin/env bash

IFS=$'\n' read -d '' -r -a projects <$(dirname $0)/PROJECTS

PACKAGE=$1

cd packages/lens-dev-server;
echo "> Copying local dependency $PACKAGE to node_modules";
rm -rf ./node_modules/lens-test/lib;
cp -r ../$PACKAGE/lib ./node_modules/lens-test/lib;
cd ..;
for project in "${projects[@]}"; do
  if [ "$project" != "lens-dev-server" ]; then \
    cd $project;
    rm -rf ./node_modules/$PACKAGE/lib;
    cp -r ../$PACKAGE/lib ./node_modules/$PACKAGE/lib;
    cd ..;
  fi
done
echo "Done copying";
echo "";
