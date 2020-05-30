import { CloudRunSdk, getDefaultOptions } from '.'
import { v4 as uuidV4 } from 'uuid'
import { run_v1 } from 'googleapis'
import { container } from 'googleapis/build/src/apis/container'
import { addZeros, removeUndefinedValues } from './utils'
import { admob } from 'googleapis/build/src/apis/admob'
import { allowUnauthenticatedRequestsToService } from './allowUnauthenticated'

export async function deploy(
    this: CloudRunSdk,
    p: {
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
    },
) {
    const cloudrun = await this.getCloudRunClient()
    const projectId = p.projectId || this.options.projectId
    if (!projectId) {
        throw new Error('missing projectId')
    }
    const { name, region, image } = p
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
        const service = updateService(existingService, { env, image })
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
        const container: run_v1.Schema$Container = removeUndefinedValues({
            image: p.image,
            args: p.args && p.args,
            command: p.command && p.command,
            ports: p.port && [{ containerPort: p.port }],
            workingDir: p.workingDir && p.workingDir,
            env,
        })
        const res = await cloudrun.namespaces.services.create(
            {
                parent: `namespaces/${projectId}`,
                requestBody: {
                    apiVersion: 'serving.knative.dev/v1',
                    kind: 'Service',
                    metadata: {
                        annotations: {},
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
                                containers: [container],
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

function updateService(
    svc: run_v1.Schema$Service,
    p: { env: run_v1.Schema$EnvVar[]; image },
) {
    const { env, image } = p
    svc.spec.template.spec.containers[0].env = mergeEnvs(
        svc.spec.template.spec.containers[0].env || [],
        env || [],
    )

    // update container image
    svc.spec.template.spec.containers[0].image = image

    // update revision name
    svc.spec.template.metadata.name = generateRevisionName(
        svc.metadata.name,
        svc.metadata.generation,
    )
    return svc
}

export function mergeEnvs(
    a: run_v1.Schema$EnvVar[],
    b: run_v1.Schema$EnvVar[],
) {
    let aNames = a.map((x) => x.name)
    const missing = b.filter((x) => !aNames.includes(x.name))
    return [...a, ...missing]
}
