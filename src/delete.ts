import { CloudRunSdk, getDefaultOptions } from '.'

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
