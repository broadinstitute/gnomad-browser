### Deployment to Kubernetes
```
cd exome-results-browsers
./build-docker-image.sh epi25
gcloud docker -- push gcr.io/exac-gnomad/epi25-browser
kubectl create -f browsers/epi25/deploy/deployment.yaml
kubectl expose deployment/epi25-browser --type=LoadBalancer
```
