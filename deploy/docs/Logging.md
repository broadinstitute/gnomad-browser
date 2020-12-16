# Logging

Logs can be viewed in the [Logs Explorer](https://console.cloud.google.com/logs/query) section of the Cloud Console.

To find application logs, filter based on resource type, K8S deployment name, and container name. For example, to find API logs:

```
resource.type="k8s_container"
labels."k8s-pod/name"="gnomad-api"
resource.labels.container_name="app"
```

Optionally, also filter by severity. For example, for error logs:

```
severity="ERROR"
```

Errors can also be seen in the [Error Reporting](https://console.cloud.google.com/errors) section of the Cloud Console.

### References

- [Cloud Logging documentation](https://cloud.google.com/logging/docs)
- [Error Reporting documentation](https://cloud.google.com/error-reporting/docs/)
