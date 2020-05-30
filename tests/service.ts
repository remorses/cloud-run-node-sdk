import { strict as assert } from 'assert'
import { CloudRunSdk } from '../src'
import { pretty } from './utils'

describe('service', () => {
    const client = new CloudRunSdk({
        projectId: 'molten-enigma-261612',
    })
    it('getService', async () => {
        const data = await client.getService({
            name: 'cli-example-with-clix',
            region: 'us-central1',
        }).catch(e => console.log(e.name))
        pretty(data)
    })
    it('getServiceErrors', async () => {
        const data = await client.getServiceErrors({
            name: 'cli-example-with-cli',
            region: 'us-central1',
        })
        pretty(data)
    })
})
