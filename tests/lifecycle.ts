import { strict as assert } from 'assert'
import dayjs from 'dayjs'
import { CloudRunSdk } from '../src'
import { pretty } from '../src/utils'

describe('complete lifecycle', () => {
    const client = new CloudRunSdk({
        projectId: 'molten-enigma-261612',
    })

    // complete lifecycle

    const name = 'example-service'
    const region = 'europe-west1'
    it('deploy', async () => {
        const data = await client.deployService({
            name,
            region,
            image: 'gcr.io/cloudrun/hello',
            port: 8080,
            env: {
                CIAO: '1',
            },
            annotations: {
                'cloud-run-node-sdk': 'true',
            },
        })
        pretty(data)
        assert.ok(data)
    })
    it('waitServiceReady', async () => {
        const error = await client.waitServiceReady({
            name,
            region,
        })
        assert.ok(!error)
    })

    it('getServiceStatus is ready', async () => {
        const { ready, error } = await client.getServiceStatus({
            name,
            region,
        })
        error && pretty(error)
        assert.ok(!error)
        assert.ok(ready)
    })

    it('getService', async () => {
        const data = await client.getService({
            name,
            region,
        })
        pretty(data)
        assert.ok(data)
        console.log('url', data.status.url)
        // console.log('status', data.status)
    })

    it('getServicesLogs', async () => {
        const data = await client.getServicesLogs({
            from: dayjs().subtract(1, 'day').toDate(),
            to: new Date(),
            services: [name],
        })
        pretty(data)
        assert.ok(data)
    })
    it('getRequestsCountMetrics', async () => {
        const data = await client.getRequestsCountMetrics({
            lastHours: 10,
            services: [name],
        })
        pretty(data)
        assert.ok(data)
    })
    it('getRequestsLatencyMetrics', async () => {
        const data = await client.getRequestsLatencyMetrics({
            lastHours: 10,
            services: [name],
        })
        pretty(data)
        assert.ok(data)
    })
    it('delete', async () => {
        const data = await client.deleteService({
            name,
            region,
        })
        pretty(data)
        assert.ok(data)
    })
})
