import { run_v1, google, GoogleApis } from 'googleapis'
// import { GoogleAuthOptions  } from 'googleapis/build/src/auth/googleauth'
import to from 'await-to-js'

type Options = {
    projectId?: string
}

export class CloudRunSdk {
    protected cloudrun: run_v1.Run = null

    protected options: Options

    constructor(options: Options) {
        this.options = options
    }

    getService = getService
    getServiceErrors = getServiceErrors

    protected async getCloudRunClient() {
        if (this.cloudrun) {
            return this.cloudrun
        }
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
            // credentials,
        })
        const authClient = await auth.getClient()
        this.cloudrun = new run_v1.Run({
            auth: authClient,
        })
        return this.cloudrun
    }
}

async function getService(this: CloudRunSdk, { name, region, projectId = '' }) {
    projectId = projectId || this.options.projectId
    const run = await this.getCloudRunClient()
    const [err, res] = await to(
        run.namespaces.services.get(
            {
                name: `namespaces/${projectId}/services/${name}`,
            },
            {
                rootUrl: `https://${region}-run.googleapis.com`,
            },
        ),
    )
    if (err || !res) {
        throw err
    }
    return res.data
}

async function getServiceErrors(
    this: CloudRunSdk,
    { name, region, projectId = '' },
) {
    const service = await this.getService({ name, region, projectId })
    const conditions = service.status.conditions
    const ready = conditions.find((cond) => {
        return cond.type === 'Ready'
    })
    const configurationsReady = conditions.find((cond) => {
        return cond.type === 'ConfigurationsReady'
    })
    if (!ready || !configurationsReady) {
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
            reason: ready.reason,
            message: ready.message,
            ...ready,
        }
    }
    return {
        ok: true,
        reason: 'Everything Ok',
        message: ready.message || 'Deployed',
        name,
    }
}
