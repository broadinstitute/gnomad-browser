#!/usr/bin/env bash

IFS=$'\n' read -d '' -r -a packages <$(dirname $0)/RELEASABLE_PACKAGES
IFS=$'\n' read -d '' -r -a projects <$(dirname $0)/PROJECTS

cd packages;

for package in "${packages[@]}"; do
  cd $package;
  yarn link
  cd ..;
done

for package1 in "${packages[@]}"; do
  cd $package1;
  dependencies=$(cat ./package.json | echo $(../../node_modules/.bin/jase dependencies));
  devDependencies=$(cat ./package.json | echo $(../../node_modules/.bin/jase devDependencies));
  for package2 in "${packages[@]}"; do
    if `echo ${dependencies} | grep "@broad/${package2}" 1>/dev/null 2>&1`; then
      echo "> Linking dependency $package1 to $project2";
      yarn link "@broad/${package2}";
    fi
    if `echo ${devDependencies} | grep "@broad/${package2}" 1>/dev/null 2>&1`; then
      echo "> Linking development dependency $package1 to $project2";
      yarn link "@broad/${package2}";
    fi
  done
  cd ..;
done

cd ..
pwd
cd projects;

for project in "${projects[@]}"; do
  cd $project;
  dependencies=$(cat ./package.json | echo $(../../node_modules/.bin/jase dependencies));
  devDependencies=$(cat ./package.json | echo $(../../node_modules/.bin/jase devDependencies));
  for package in "${packages[@]}"; do
    if `echo ${dependencies} | grep "@broad/${package}" 1>/dev/null 2>&1`; then
      echo "> Linking local dependency $package to $project";
      yarn link "@broad/${package}";
    fi
  done
  cd ..;
done
echo "Done copying project dependencies";
echo "";
