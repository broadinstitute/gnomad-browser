#!make
include ../../cluster/config.sh

POOL_NAME=redis
PROJECT_NAME=schema-browser

BASE_IMAGE_PREFIX=gcr.io/$(GCLOUD_PROJECT)/$(PROJECT_NAME)-base
IMAGE_PREFIX=gcr.io/$(GCLOUD_PROJECT)/$(PROJECT_NAME)
VERSION=0
BUILD_TIME=$(shell date -j -f "%a %b %d %T %Z %Y" "`date`" "+%s")
# IMAGE_TAG=:$(BUILD_TIME)
IMAGE_TAG=
SOURCE_DIRECTORY=.

BASE_IMAGE_NAME="$(BASE_IMAGE_PREFIX)$(IMAGE_TAG)"
MAIN_IMAGE_NAME="$(IMAGE_PREFIX)$(IMAGE_TAG)"

LOCAL_API_URL=http://localhost:8007
PRODUCTION_API_URL=http://35.184.112.239
PROCESSES=2

# SERVICE_FORWARDING_RULE_ID=$(shell gcloud compute forwarding-rules list --format='value[terminator=" "](name)' --filter=35.184.79.173)

build-server:
	../../node_modules/.bin/babel src -d build --copy-files

build-development-bundle:
	GNOMAD_API_URL='$(PRODUCTION_API_URL)' \
	../../node_modules/.bin/webpack -wd --config webpack.prod.config.js

build-production-bundle:
	GNOMAD_API_URL='$(PRODUCTION_API_URL)' \
	NODE_ENV=production \
	../../node_modules/.bin/webpack -p --config webpack.prod.config.js

start-development-server:
	../../node_modules/.bin/pm2 start src/server.js \
	--watch --interpreter ../../node_modules/.bin/babel-node --name $(PROJECT_NAME)-dev

start-production-server:
	NODE_ENV=production \
	../../node_modules/.bin/pm2 start build/server.js -i $(PROCESSES) --name $(PROJECT_NAME)-prod

stop-all-servers:
	../../node_modules/.bin/pm2 delete all

list-servers:
	../../node_modules/.bin/pm2 ps

start-production: build-server build-production-bundle start-production-server

build-base:
	docker build -f deploy/base.dockerfile \
		-t $(BASE_IMAGE_NAME) $(SOURCE_DIRECTORY)
	gcloud docker -- push $(BASE_IMAGE_NAME)

build-main:
	docker build -f deploy/Dockerfile \
		-t $(MAIN_IMAGE_NAME) $(SOURCE_DIRECTORY)
	gcloud docker -- push $(MAIN_IMAGE_NAME)

build-all: build-base build-main

start: start-deployment start-service

start-deployment:
	@-kubectl create -f deploy/deployment.yaml

# gnomad-api-service-delete-previous:
# 	@-gcloud -q compute forwarding-rules delete $(SERVICE_FORWARDING_RULE_ID) --region $(GCLOUD_REGION)
# 	kubectl create -f gnomad-api-svc.yaml

start-service:
	@-kubectl expose deployment $(PROJECT_NAME) \
	--type="LoadBalancer"

delete-and-create:
	# $(sed -ie "s/THIS_STRING_IS_REPLACED_DURING_BUILD/$(BUILD_TIME)/g" gnomad-api-controller.yml)
	kubectl delete -f deploy/deployment.yaml
	kubectl create -f deploy/deployment.yaml

build-and-update: build-production-bundle build-main delete-and-create
