/* eslint-disable class-methods-use-this */

import fs from 'fs'
import Api from 'kubernetes-client'
import yaml from 'js-yaml'
import { fromJS } from 'immutable'

import config from './untracked/config'

export function print (data, keys = false) {
  if (keys) {
    console.log(Object.keys(data))
    return
  }
  console.log(JSON.stringify(data, null, 2))
}

export function loadYaml (path) {
  return fromJS(yaml.safeLoad(fs.readFileSync(path)))
}

const defaultOptions = {
  url: config.url,
  namespace: 'default',
  insecureSkipTlsVerify: true,
  promises: true,
  auth: {
    user: config.user,
    pass: config.pass,
  }
}

export default class KubernetesClient {
  constructor () {
    this.extensions = new Api.Extensions(defaultOptions)
    this.core = new Api.Core(defaultOptions)
  }

  listDeployments () {
    this.extensions.namespaces.deployments.get()
      .then((response) => {
        console.log('Deployments')
        console.log('----------')
        response.items.forEach(item => console.log(item.metadata.name))
      })
  }

  getDeploymentStatus (name) {
    this.extensions.namespaces.deployments.get(name)
      .then((response) => {
        console.log(response)
      })
  }

  listServices () {
    this.core.namespaces.services.get()
      .then((response) => {
        console.log('Services', '\t\t\t', 'External ip')
        console.log('----------', '\t\t\t', '----------')
        response.items.forEach((service) => {
          const name = service.metadata.name
          const externalIp = service.status.loadBalancer.ingress ?
            service.status.loadBalancer.ingress.map(i => i.ip).join(', ') : ''
          console.log(name, '\t\t\t', externalIp)
          // print(service, false)
        })
        console.log('\n')
      })
  }
}
