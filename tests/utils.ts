import { strict as assert } from 'assert'
import { addZeros } from '../src/utils'

describe('utils', () => {
    it('addZeros', () => {
        assert.equal(addZeros(1, 5), '00001')
        assert.equal(addZeros('xxx', 5), '00xxx')
    })
})
