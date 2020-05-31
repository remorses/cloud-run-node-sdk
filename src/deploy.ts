import { run_v1 } from 'googleapis'
import { v4 as uuidV4 } from 'uuid'
import { CloudRunSdk, getDefaultOptions } from '.'
import { addZeros, removeUndefinedValues } from './utils'

interface DeployParams {
    // container: run_v1.Schema$Container
    name: string
    allowUnauthenticated?: boolean
    projectId?: string
    region: string
    env?: Record<string, string>
    image: string
    args?: string[]
    command?: string[]
    port?: number
    workingDir?: string
    memory?: string
    cpu?: string
    annotations?: Record<string, string>
}

export async function deployService(this: CloudRunSdk, p: DeployParams) {
    const cloudrun = await this.getCloudRunClient()
    const projectId = p.projectId || this.options.projectId
    if (!projectId) {
        throw new Error('missing projectId')
    }
    const { name, region } = p
    const env: run_v1.Schema$EnvVar[] = Object.keys(p.env || {}).map((k) => ({
        name: k,
        value: p.env[k],
    }))
    const existingService = await this.getService({
        name,
        region,
        projectId,
        throwIfDoesNotExists: false,
    })
    let deployedService: run_v1.Schema$Service
    if (existingService) {
        const service = updateService(existingService, { ...p, env })
        console.log('updating service')
        let res = await cloudrun.namespaces.services.replaceService(
            {
                requestBody: service,
                name: `namespaces/${projectId}/services/${name}`,
            },
            getDefaultOptions(region),
        )
        deployedService = res.data
    } else {
        console.log('creating new service')

        const res = await cloudrun.namespaces.services.create(
            {
                parent: `namespaces/${projectId}`,
                requestBody: {
                    apiVersion: 'serving.knative.dev/v1',
                    kind: 'Service',
                    metadata: {
                        annotations: p.annotations || {},
                        name,
                        namespace: projectId,
                    },
                    spec: {
                        template: {
                            metadata: {
                                name: generateRevisionName(name, 0),
                                annotations: {},
                            },
                            spec: {
                                containers: [makeContainer({ ...p, env })],
                            },
                        },
                    },
                },
            },
            getDefaultOptions(region),
        )
        deployedService = res.data
    }
    const { allowUnauthenticated = true } = p
    if (allowUnauthenticated) {
        await this.allowUnauthenticatedRequestsToService({
            name,
            projectId,
            region,
        })
    }
    return deployedService
}

function generateRevisionName(name: string, objectGeneration: number): string {
    const num = addZeros((objectGeneration + 1).toString(), 5)
    const random = uuidV4().toString().slice(0, 3)
    const out = name + '-' + num + '-' + random
    return out
}

function makeContainer(
    p: Omit<DeployParams, 'env' | 'name'> & { env: run_v1.Schema$EnvVar[] },
) {
    const container: run_v1.Schema$Container = removeUndefinedValues({
        image: p.image,
        args: p.args && p.args,
        command: p.command && p.command,
        ports: p.port && [{ containerPort: p.port }],
        workingDir: p.workingDir && p.workingDir,
        env: p.env || [],
        resources: {
            limits: removeUndefinedValues({
                memory: p.memory,
                cpu: p.cpu,
            }),
        },
    })
    return container
}

function updateService(
    svc: run_v1.Schema$Service,
    p: Omit<DeployParams, 'name' | 'env'> & {
        env: run_v1.Schema$EnvVar[]
        image
    },
) {
    // update container image
    const containers = svc.spec.template.spec.containers
    containers[0] = {
        ...containers[0],
        ...makeContainer(p),
        env: mergeEnvs(
            svc.spec.template.spec.containers[0].env || [],
            p.env || [],
        ),
    }
    svc.spec.template.metadata.name = generateRevisionName(
        svc.metadata.name,
        svc.metadata.generation,
    )
    return svc
}

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

export function mergeEnvs(
    a: run_v1.Schema$EnvVar[],
    b: run_v1.Schema$EnvVar[],
) {
    let aNames = a.map((x) => x.name)
    const missing = b.filter((x) => !aNames.includes(x.name))
    return [...a, ...missing]
}
