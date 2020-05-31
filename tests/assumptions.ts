import { strict as assert } from 'assert'
import { CloudRunSdk } from '../src'
import { pretty, addZeros } from '../src/utils'
import { mergeEnvs } from '../src/deploy'
import dayjs from 'dayjs'

describe('assumptions', () => {
    const client = new CloudRunSdk({
        projectId: 'molten-enigma-261612',
    })

    // complete lifecycle
    it('getServiceStatus with error', async () => {
        const { ready, error } = await client.getServiceStatus({
            name: 'errored',
            region: 'europe-west1',
        })
        pretty(error)
        assert.ok(error)
        assert.ok(!ready)
    })

    it('getService not exist returns null', async () => {
        const data = await client.getService({
            name: 'non-existent-service',
            region: 'us-central1',
        })
        assert.equal(data, null)
    })
})
