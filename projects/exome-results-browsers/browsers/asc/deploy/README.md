### Deployment to Kubernetes
```
cd exome-results-browsers
./build-docker-image.sh asc
gcloud docker -- push gcr.io/exac-gnomad/asc-browser:$TAG
kubectl create -f browsers/asc/deploy/deployment.yaml
kubectl expose deployment/asc-browser --type=LoadBalancer
```
