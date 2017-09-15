#!/usr/bin/env bash

PACKAGE=$1

cd packages/@broad/dev-server;
echo "> Copying local dependency $PACKAGE to node_modules";
rm -rf ./node_modules/$PACKAGE/lib;
cp -r ../$PACKAGE/lib ./node_modules/$PACKAGE/lib;
echo "Done copying";
echo "";
