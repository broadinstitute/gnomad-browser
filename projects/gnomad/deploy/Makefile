#!make
include ../../../cluster/config.sh
# include ../../../cluster/Makefile

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

gnomad-dev-service:
	kubectl expose deployment gnomad-d-serve --type="LoadBalancer"
