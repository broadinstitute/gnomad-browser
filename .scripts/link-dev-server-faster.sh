#!/usr/bin/env bash

PACKAGE=$1

cd packages/lens-dev-server;
echo "> Copying local dependency $PACKAGE to node_modules";
rm -rf ./node_modules/lens-test/lib;
cp -r ../$PACKAGE/lib ./node_modules/lens-test/lib;
echo "Done copying";
echo "";
