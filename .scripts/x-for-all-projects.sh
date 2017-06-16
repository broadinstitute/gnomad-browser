#!/usr/bin/env bash

# This script runs a yarn command for every registered package
# in the file `RELEASABLE_PACKAGES`.
#
# E.g.: calling this script will the command line args "run test"
# will execute `yarn run test` for each package.

IFS=$'\n' read -d '' -r -a packages <$(dirname $0)/PROJECTS

cd packages

exitstatus=0

for d in "${packages[@]}"; do
  echo "> ($d)";
  cd $d;
  $@ || exitstatus=$?;
  echo "";
  cd ..;
  if [ $exitstatus -ne 0 ]; then
    break;
    exit $exitstatus;
  fi
done

exit $exitstatus
