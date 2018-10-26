#!make
include ../../../cluster/config.sh
# include ../../../cluster/Makefile

SERVICE_FORWARDING_RULE_ID=$(shell gcloud compute forwarding-rules list --format='value[terminator=" "](name)' --filter=35.202.229.180)

context:
	gcloud container clusters get-credentials $(CLUSTER_NAME) --zone=$(GCLOUD_ZONE) --project=$(GCLOUD_PROJECT)
	kubectl config set-context $(CLUSTER_NAME) \
	--cluster $(CLUSTER_NAME) \
	--user $(CLUSTER_NAME) \
	--namespace $(CLUSTER_NAMESPACE)
	kubectl config use-context gke_$(GCLOUD_PROJECT)_$(GCLOUD_ZONE)_$(CLUSTER_NAME)

create-gnomad-prod:
	kubectl create -f gnomad-deployment-prod.yaml

create-gnomad-dev:
	kubectl create -f gnomad-deployment-dev.yaml

pod-name:
	kubectl get pods -o jsonpath={.items[*].spec.containers[*].name}

delete-gcloud-forwarding-rule:
	gcloud -q compute forwarding-rules delete $(SERVICE_FORWARDING_RULE_ID) --region $(GCLOUD_REGION)

gnomad-prod-service:
	kubectl expose deployment gnomad-p-serve \
	--type="LoadBalancer" \
	--load-balancer-ip="35.184.206.249"

gnomad-dev-service:
	kubectl expose deployment gnomad-d-serve \
	--type="LoadBalancer" \
	--load-balancer-ip="104.196.202.92"
