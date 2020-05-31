import { run_v1 } from 'googleapis'
import { v4 as uuidV4 } from 'uuid'
import { CloudRunSdk, getDefaultOptions } from '.'
import { addZeros, removeUndefinedValues } from './utils'

interface DeleteParams {
    // container: run_v1.Schema$Container
    name: string
    projectId?: string
    region: string
}

export async function deleteService(this: CloudRunSdk, p: DeleteParams) {
    const cloudrun = await this.getCloudRunClient()
    const projectId = p.projectId || this.options.projectId
    if (!projectId) {
        throw new Error('missing projectId')
    }
    const { name } = p
    const res = await cloudrun.namespaces.services.delete(
        {
            name: `namespaces/${projectId}/services/${name}`,
        },
        getDefaultOptions(p.region),
    )
    return res.data
}
