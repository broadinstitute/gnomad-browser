import KubernetesClient, { print, loadYaml } from './utilities'

const k8s = new KubernetesClient()

const gnomadDeploymentConfigYaml = loadYaml('./gnomad-deployment.yaml')

const developmentConfig = {
  name: 'gnomad-development',
  image: 'gcr.io/exac-gnomad/gnomad-browser-v1',
  replicas: 1,
  readVizPersistentDiskName: 'gnomad-readviz-exons-gpd-3',
  deploymentEnvironment: 'development',
}

function getGnomadServerManifest ({
  name,
  image,
  replicas,
  readVizPersistentDiskName,
  deploymentEnvironment,
}) {
  const readvizVolume = {
    name: 'readviz',
    gcePersistentDisk: {
      pdName: readVizPersistentDiskName,
      fsType: 'ext4',
      readOnly: true,
    }
  }
  const serverContainerDefaults = gnomadDeploymentConfigYaml
    .getIn(['spec', 'template', 'spec', 'containers']).first()

  const serverContainer = serverContainerDefaults
    .set('name', name)
    .set('image', image)
    .set('env', serverContainerDefaults.get('env').push({
      name: 'DEPLOYMENT_ENV',
      value: deploymentEnvironment,
    }))

  return gnomadDeploymentConfigYaml
    .setIn(['metadata', 'name'], name)
    .setIn(['spec', 'selector', 'matchLabels', 'name'], name)
    .setIn(['spec', 'replicas'], replicas)
    .setIn(['spec', 'template', 'metadata', 'labels', 'name'], name)
    .setIn(['spec', 'template', 'spec', 'containers'], [serverContainer])
    .setIn(['spec', 'template', 'spec', 'volumes'], [readvizVolume])
}

function deploy (config) {
  const manifest = getGnomadServerManifest(config)
  const { name } = config
  k8s.extensions.namespaces.deployments.post({ body: manifest })
    .then((response) => {
      console.log(response)
      k8s.listDeployments()
      k8s.getDeploymentStatus(name)
      setTimeout(() => {
        console.log('Deleting')
        k8s.extensions.namespaces.deployments.delete({ name, preservePods: false })
          .then(response => k8s.listDeployments())
      }, 5000)
    }).catch(error => console.log(error))
}

deploy(developmentConfig)

