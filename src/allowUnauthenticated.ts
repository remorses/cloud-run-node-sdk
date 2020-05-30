import { CloudRunSdk, getDefaultOptions } from '.'

export async function allowUnauthenticatedRequestsToService(
    this: CloudRunSdk,
    { name, projectId, region },
) {
    const resource = `projects/${projectId}/locations/${region}/services/${name}`
    const cloudrun = await this.getCloudRunClient()
    const res = await cloudrun.projects.locations.services.getIamPolicy(
        {
            resource,
        },
        getDefaultOptions(region),
    )

    const policy = {
        ...res.data,
        bindings: [
            ...(res.data?.bindings || []),
            {
                members: ['allUsers'],
                role: 'roles/run.invoker',
            },
        ],
    }
    const setIamRes = await cloudrun.projects.locations.services.setIamPolicy(
        {
            resource,
            requestBody: { policy },
        },
        getDefaultOptions(region),
    )
    return setIamRes.data
}
