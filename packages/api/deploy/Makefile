#!make
include ../../../cluster/config.sh

POOL_NAME=redis
PROJECT_NAME=gnomad-api

BASE_IMAGE_PREFIX=gcr.io/$(GCLOUD_PROJECT)/$(PROJECT_NAME)-base
IMAGE_PREFIX=gcr.io/$(GCLOUD_PROJECT)/$(PROJECT_NAME)
VERSION=0
BUILD_TIME=$(shell date -j -f "%a %b %d %T %Z %Y" "`date`" "+%s")
IMAGE_TAG=$(BUILD_TIME)
SOURCE_DIRECTORY=..
API_EXTERNAL_IP=35.192.159.174

BASE_IMAGE_NAME="$(BASE_IMAGE_PREFIX):$(IMAGE_TAG)"
MAIN_IMAGE_NAME="$(IMAGE_PREFIX):$(IMAGE_TAG)"

mongo-legacy:
	kubectl create -f gnomad-mongo-controller.yaml
	kubectl create -f gnomad-mongo-service.yaml

build-base:
	docker build -f dockerfiles/gnomadgraphqlbase.dockerfile \
		-t $(BASE_IMAGE_NAME) $(SOURCE_DIRECTORY)
	gcloud docker -- push $(BASE_IMAGE_NAME)

build-main:
	npm run build
	docker build -f dockerfiles/gnomadgraphql.dockerfile \
		-t $(MAIN_IMAGE_NAME) $(SOURCE_DIRECTORY)
	gcloud docker -- push $(MAIN_IMAGE_NAME)

build-all: build-base build-main

gnomad-api:
	kubectl create -f gnomad-api-controller.yaml

gnomad-api-service:
	kubectl expose deployment $(PROJECT_NAME) \
	--type="LoadBalancer" \
	--load-balancer-ip="(API_EXTERNAL_IP)"

update-gnomad-api:
	# $(sed -ie "s/THIS_STRING_IS_REPLACED_DURING_BUILD/$(BUILD_TIME)/g" gnomad-api-controller.yml)
	kubectl delete -f gnomad-api-controller.yaml
	kubectl create -f gnomad-api-controller.yaml
