#!/usr/bin/env bash

cd packages/lens-dev-server;
echo "> Copying local dependency lens-plot-traffic to node_modules";
rm -rf ./node_modules/lens-plot-traffic/lib;
cp -r ../lens-plot-traffic/lib ./node_modules/lens-plot-traffic;
# rm -rf ./node_modules/lens-plot-traffic
# cp -r ../lens-plot-traffic ./node_modules
echo "Done copying";
echo "";
