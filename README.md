# cloud-run-node-sdk

Google Cloud Run client for nodejs (uses `googleapis`, '@google-cloud/monitoring`and`@google-cloud/logging` under the hood)

The package exposes detailed typescript types, use them to explore the shape of returned resources

## Installation

```
npm i cloud-run-node-sdk
```

## Example usage

Deploying a service

```js
import { CloudRunSdk } from 'cloud-run-node-sdk'
const client = new CloudRunSdk({
    projectId: 'proj-id',
})
const data = await client.deployService({
    name: 'name',
    region: 'us-central1,
    image: 'gcr.io/cloudrun/hello',
    port: 8080,
    env: {
        CIAO: '1',
    },
})
const error = await client.waitServiceReady({
    name,
    region,
})
```

Getting logs and metrics of a service

```js
import { CloudRunSdk } from 'cloud-run-node-sdk'
const client = new CloudRunSdk({
    projectId: 'proj-id',
})
const logs = await client.getServicesLogs({
    from: dayjs().subtract(1, 'day').toDate(),
    to: new Date(),
    services: ['example-service'],
})
const requestsCountPoints = await client.getRequestsCountMetrics({
    lastHours: 10,
    services: ['example-service'],
})
const requestsLatencyPoints = await client.getRequestsLatencyMetrics({
    lastHours: 10,
    services: ['example-service'],
})
```

Inspecting service details

```ts
import { CloudRunSdk } from 'cloud-run-node-sdk'
const client = new CloudRunSdk({
    projectId: 'proj-id',
})
const data = await client.getService({
    name,
    region,
})
console.log('url', data.status.url)
const { ready, error } = await client.getServiceStatus({
    name,
    region,
})
```
