import { strict as assert } from 'assert'
import { CloudRunSdk } from '../src'
import { pretty, addZeros } from '../src/utils'

describe('service', () => {
    const client = new CloudRunSdk({
        projectId: 'molten-enigma-261612',
    })
    it('getService', async () => {
        const data = await client
            .getService({
                name: 'cli-example-with-cli',
                region: 'us-central1',
            })
            .catch((e) => console.log(e.name))
        assert.ok(data)
        pretty(data)
    })
    it('getService does not exist returns null', async () => {
        const data = await client.getService({
            name: 'non-existent-service',
            region: 'us-central1',
        })
        assert.equal(data, null)
    })
    it('getServiceErrors', async () => {
        const data = await client.getServiceError({
            name: 'errored',
            region: 'europe-west1',
        })
        pretty(data)
        assert.ok(data)
    })
    it('deploy', async () => {
        const data = await client.deploy({
            name: 'example-service',
            region: 'europe-west1',
            image: 'gcr.io/cloudrun/hello',
        })
        pretty(data)
        assert.ok(data)
    })
})

describe('utils', () => {
    it('addZeros', () => {
        assert.equal(addZeros(1, 5), '00001')
        assert.equal(addZeros('xxx', 5), '00xxx')
    })
})
