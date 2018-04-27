#!make
include ../../../cluster/config.sh
# include ../../../cluster/Makefile

POOL_NAME=redis
PROJECT_NAME=gnomad-browser-beta

IMAGE_PREFIX=gcr.io/$(GCLOUD_PROJECT)/$(PROJECT_NAME)
VERSION=0
BUILD_TIME=$(shell date -j -f "%a %b %d %T %Z %Y" "`date`" "+%s")
IMAGE_TAG=
# IMAGE_TAG=:$(BUILD_TIME)
SOURCE_DIRECTORY=.
LEGACY_DIRECTORY=/Users/msolomon/Projects/exacg/exac_gnomad_private
# GNOMAD_EXTERNAL_IP=104.196.46.19
# GNOMAD_EXTERNAL_IP=35.202.229.180
GNOMAD_EXTERNAL=http://35.202.229.180/

IMAGE_NAME="$(IMAGE_PREFIX)$(IMAGE_TAG)"

SERVICE_FORWARDING_RULE_ID=$(shell gcloud compute forwarding-rules list --format='value[terminator=" "](name)' --filter=35.202.229.180)

start-gnomad-prod: build-javascript build-legacy create-gnomad-prod gnomad-prod-service

context:
	gcloud container clusters get-credentials $(CLUSTER_NAME) --zone=$(GCLOUD_ZONE)
	kubectl config set-context $(CLUSTER_NAME) \
	--cluster $(GKE_CLUSTER_NAME) \
	--user $(GKE_CLUSTER_NAME) \
	--namespace $(CLUSTER_NAMESPACE)
	kubectl config use-context $(CLUSTER_NAME)

build-javascript:
	npm run build:umd

build-legacy:
	docker build -f $(LEGACY_DIRECTORY)/deploy/dockerfiles/gnomadserve.dockerfile \
		-t $(IMAGE_NAME) $(LEGACY_DIRECTORY)
	gcloud docker -- push $(IMAGE_NAME)

create-gnomad-prod:
	kubectl create -f gnomad-deployment-prod.yaml

create-gnomad-dev:
	kubectl create -f gnomad-deployment-dev.yaml

recreate-gnomad-prod:
	# $(sed -ie "s/THIS_STRING_IS_REPLACED_DURING_BUILD/$(BUILD_TIME)/g" gnomad-api-controller.yml)
	kubectl delete -f gnomad-deployment-prod.yaml
	kubectl create -f gnomad-deployment-prod.yaml

recreate-gnomad-dev:
	kubectl delete -f gnomad-deployment-dev.yaml
	kubectl create -f gnomad-deployment-dev.yaml

pod-name:
	kubectl get pods -o jsonpath={.items[*].spec.containers[*].name}

copy-javascript:
	kubectl cp /Users/msolomon/Projects/exacg/exac_gnomad_private/static/genepage.js gnomad-production-2775023726-02vfk:/var/www/static/

update-gnomad-prod: build-javascript build-legacy recreate-gnomad-prod

update-gnomad-dev: build-javascript build-legacy recreate-gnomad-dev

# faster?
copy: build-javascript copy-javascript

delete-gcloud-forwarding-rule:
	gcloud -q compute forwarding-rules delete $(SERVICE_FORWARDING_RULE_ID) --region $(GCLOUD_REGION)

gnomad-prod-service:
	kubectl expose deployment gnomad-p-serve \
	--type="LoadBalancer" \
	--load-balancer-ip="35.184.206.249"

gnomad-dev-service:
	kubectl expose deployment gnomad-d-serve \
	--type="LoadBalancer" \
	--load-balancer-ip="35.224.4.236"

test:
	../../../node_modules/.bin/babel-node deploy
	