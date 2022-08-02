# Creating a Demo Deployment:

This is very similar to creating a new deployment (NewDeployment.md), particularly in the browser/api section.

However, there is additional cleanup that should be performed as demo instances are typically temporary, and should be removed after their purpose is served.

There exist several Python scripts in the `deployctl` package that make this process straightforward. These files are located in `gnomad-browser/deploy/deployctl/subcommands`.

###  Create Browser/API Demo Deployment

Have the branch you wish to deploy as a demo as the active branch

Ensure that `Docker CLI` is running, and that you are connected to the Broad's network, either by being in the office, or by use of the VPN.

- Create and push Docker Images to the [Google Container Registry](https://console.cloud.google.com/gcr/images/exac-gnomad?project=exac-gnomad) with:

	```
	./deployctl images build --push
	```

- Create a local manifest file that describes the deployment with:

	```
	./deployctl deployments create --name <DEPLOYMENT_NAME> --browser-tag <BROWSER_IMAGE_TAG> --api-tag <API_IMAGE_TAG>
	```

- 'Apply' the deployment, assigning pods to run it in the [Google Kubernetes Engine](https://console.cloud.google.com/kubernetes/workload/overview?project=exac-gnomad):

	```
	./deployctl deployments apply <DEPLOYMENT_NAME>
	```

- Apply an ingress, allowing access to the demo via an IP address that gets assigned:

	```
	./deployctl demo apply-ingress <DEPLOYMENT_NAME>
	```

- Check the status of the ingress with:

	```
	kubectl describe ingress gnomad-ingress-demo-<DEPLOYMENT_NAME>
	```

	It typically takes ~5 minutes for the IP to resolve to the new deployment

**Where:**

- `<BROWSER_IMAGE_TAG>` and `<API_IMAGE_TAG>`
Are the tags assigned to the docker images, these can be found in the Container Registry, and in your command line when they are created. The script '`deployments create`' names them with the git commit hash, and the git branch name by default. i.e. '`c4baa347-add-team-page`'
Both of these tags are optional, if one or either are not provided, the most recent images will be used by default.

- `<DEPLOYMENT_NAME>` is what you wish to call the deployment, i.e. '`team-demo`'

### Clean Up Old Demo Deployments

In general, it's good to clean up old deployments that are still around after serving their purpose, due to a limited amount of resources in GKE.

- Check which deployments are being used in production with:
	```
	./deployctl production describe
	```

- Check all of the current deployments (`local` and `cluster`) with:
	```
	./deployctl deployments list
	```

- Remove `local` deployments with:
	```
	./deployctl deployments clean <DEPLOYMENT_NAME>
	```

- Remove unwanted `cluster` deployments with:
	```
	./deployctl deployments delete <DEPLOYMENT_NAME>
	```

- Check all of the current GKE ingresses with:
	```
	kubectl get ingress
	```

- Delete an unwanted ingress with:
	```
	kubectl delete ingress <INGRESS_NAME>
	```

---

###  tl;dr

Just the commands

```
./deployctl images build --push
```

```
./deployctl deployments create --name <DEPLOYMENT_NAME> --browser-tag <BROWSER_IMAGE_TAG> --api-tag <API_IMAGE_TAG>
```

```
./deployctl deployments apply <DEPLOYMENT_NAME>
```

```
./deployctl demo apply-ingress <DEPLOYMENT_NAME>
```
