#!make
include ../../../cluster/config.sh
# include ../../../cluster/Makefile

POOL_NAME=redis
PROJECT_NAME=gnomad-legacy

IMAGE_PREFIX=gcr.io/$(GCLOUD_PROJECT)/$(PROJECT_NAME)
VERSION=0
BUILD_TIME=$(shell date -j -f "%a %b %d %T %Z %Y" "`date`" "+%s")
IMAGE_TAG=
# IMAGE_TAG=:$(BUILD_TIME)
SOURCE_DIRECTORY=.
LEGACY_DIRECTORY=/Users/msolomon/Projects/exacg/exac_gnomad_private
GNOMAD_EXTERNAL_IP=35.202.229.180

IMAGE_NAME="$(IMAGE_PREFIX)$(IMAGE_TAG)"

SERVICE_FORWARDING_RULE_ID=$(shell gcloud compute forwarding-rules list --format='value[terminator=" "](name)' --filter=35.202.229.180)

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

create-gnomad-legacy:
	kubectl create -f gnomad-legacy-deployment.yaml

update-gnomad-legacy:
	# $(sed -ie "s/THIS_STRING_IS_REPLACED_DURING_BUILD/$(BUILD_TIME)/g" gnomad-api-controller.yml)
	kubectl delete -f gnomad-legacy-deployment.yaml
	kubectl create -f gnomad-legacy-deployment.yaml

pod-name:
	kubectl get pods -o jsonpath={.items[*].spec.containers[*].name}

copy-javascript:
	kubectl cp /Users/msolomon/Projects/exacg/exac_gnomad_private/static/genepage.js gnomad-p-serve-2775023726-02vfk:/var/www/static/

update: build-javascript build-legacy update-gnomad-legacy

copy: build-javascript copy-javascript

gnomad-legacy-service:
	# gcloud -q compute forwarding-rules delete $(SERVICE_FORWARDING_RULE_ID) --region $(GCLOUD_REGION)
	kubectl expose deployment gnomad-p-serve \
	--type="LoadBalancer"
	# --load-balancer-ip="(API_EXTERNAL_IP)"
