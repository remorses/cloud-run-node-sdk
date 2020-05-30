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
    const container: run_v1.Schema$Container = removeUndefinedValues({
        image: p.image,
        args: p.args && p.args,
        command: p.command && p.command,
        ports: p.port && [{ containerPort: p.port }],
        workingDir: p.workingDir && p.workingDir,
        env: Object.keys(p.env || {}).map((k) => ({
            name: k,
            value: p.env[k],
        })),
    })
    const res = await cloudrun.namespaces.services.create(
        {
            parent: `namespaces/${projectId}`,
            requestBody: {
                apiVersion: 'serving.knative.dev/v1',
                kind: 'Service',
                metadata: {
                    annotations: {},
                    name: p.name,
                    namespace: projectId,
                },
                spec: {
                    template: {
                        metadata: {
                            name: generateRevisionName(p.name, 0),
                            annotations: {},
                        },
                        spec: {
                            containers: [container],
                        },
                    },
                },
            },
        },
        getDefaultOptions(p.region),
    )
    const { allowUnauthenticated = true, name, region } = p
    if (allowUnauthenticated) {
        await allowUnauthenticatedRequestsToService({ name, projectId, region })
    }
    return res.data
}

function generateRevisionName(name: string, objectGeneration: number): string {
    const num = addZeros(objectGeneration.toString(), 5)
    const random = uuidV4().toString().slice(0, 3)
    const out = name + '-' + num + '-' + random
    return out
}
