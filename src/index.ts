import { run_v1, google, GoogleApis } from 'googleapis'
// import { GoogleAuthOptions  } from 'googleapis/build/src/auth/googleauth'
import to from 'await-to-js'
import { deploy } from './deploy'
import { allowUnauthenticatedRequestsToService } from './allowUnauthenticated'

type SdkOptions = {
    projectId?: string
    keyFile?: string
    credentials?: Record<string, any>
}

export class CloudRunSdk {
    protected cloudrun: run_v1.Run = null

    protected options: SdkOptions

    constructor(options: SdkOptions) {
        this.options = options
    }

    getService = getService
    getServiceError = getServiceError
    deploy = deploy

    protected allowUnauthenticatedRequestsToService = allowUnauthenticatedRequestsToService

    protected async getCloudRunClient() {
        if (this.cloudrun) {
            return this.cloudrun
        }
        const { credentials, keyFile } = this.options
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
            credentials,
            keyFile,
        })
        const authClient = await auth.getClient()
        this.cloudrun = new run_v1.Run({
            auth: authClient,
        })
        return this.cloudrun
    }
}

async function getService(
    this: CloudRunSdk,
    { name, region, projectId = '', throwIfDoesNotExists = false },
): Promise<null | run_v1.Schema$Service> {
    projectId = projectId || this.options.projectId
    const run = await this.getCloudRunClient()
    const [err, res] = await to(
        run.namespaces.services.get(
            {
                name: `namespaces/${projectId}/services/${name}`,
            },
            getDefaultOptions(region),
        ),
    )
    if (
        !throwIfDoesNotExists &&
        err &&
        err.message.trim().endsWith('does not exist.')
    ) {
        return null
    }
    if (err || !res) {
        throw err
    }
    return res.data
}

async function getServiceError(
    this: CloudRunSdk,
    { name, region, projectId = '' },
) {
    const service = await this.getService({
        name,
        region,
        projectId,
        throwIfDoesNotExists: true,
    })
    const conditions = service.status.conditions
    const ready = conditions.find((cond) => {
        return cond.type === 'Ready'
    })
    const configurationsReady = conditions.find((cond) => {
        return cond.type === 'ConfigurationsReady'
    })
    if (!ready || !configurationsReady) {
        // TODO what is this
        throw new Error(
            `unexpected error, cannot find Ready or ConfigurationsReady cloud run conditions`,
        )
    }
    if (ready.status === 'False') {
        return {
            ok: false,
            reason: ready.reason,
            message: ready.message,
            ...ready,
        }
    }
    if (configurationsReady.status === 'False') {
        return {
            ok: false,
            reason: configurationsReady.reason,
            message: configurationsReady.message,
            ...ready,
        }
    }
    return null
}

export function getDefaultOptions(region) {
    return {
        rootUrl: `https://${region}-run.googleapis.com`,
    }
}
