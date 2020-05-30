import { CloudRunSdk } from '.'

export async function allowUnauthenticatedRequestsToService({
    name,
    projectId,
    region,
}) {
    const resource = `projects/${projectId}/locations/${region}/services/${name}`
    const cloudrun = await this.getCloudRunClient()
    const res = await cloudrun.projects.locations.services.getIamPolicy({
        resource,
    })
    res.data.bindings.push({
        members: ['allUsers'],
        role: 'roles/run.invoker',
    })
    const setIamRes = await cloudrun.projects.locations.services.setIamPolicy({
        resource,
        requestBody: { policy: res.data },
    })
    return setIamRes.data
}
