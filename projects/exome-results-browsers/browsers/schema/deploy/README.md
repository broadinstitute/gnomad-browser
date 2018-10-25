### Deployment to Kubernetes
```
cd exome-results-browsers
./build-docker-image.sh schema
gcloud docker -- push gcr.io/exac-gnomad/schema-browser
kubectl create -f browsers/schema/deploy/deployment.yaml
kubectl expose deployment/schema-browser --type=LoadBalancer
```
