import { run_v1, google, GoogleApis } from 'googleapis'
import { Logging } from '@google-cloud/logging'
import { MetricServiceClient } from '@google-cloud/monitoring'
import { MetricServiceClient as MetricServiceClientType } from '@google-cloud/monitoring/build/src/v3'

// import { GoogleAuthOptions  } from 'googleapis/build/src/auth/googleauth'
import to from 'await-to-js'
import { allowUnauthenticatedRequestsToService, deployService } from './deploy'

import { getServicesLogs } from './logs'
import { getRequestsCountMetrics, getRequestsLatencyMetrics } from './metrics'
import { deleteService } from './delete'
import { waitReady } from './waitReady'

type SdkOptions = {
    projectId?: string
    keyFile?: string
    credentials?: Record<string, any>
}

export class CloudRunSdk {
    protected options: SdkOptions

    constructor(options: SdkOptions) {
        this.options = options
    }

    getService = getService
    getServiceStatus = getServiceStatus
    deployService = deployService
    getServicesLogs = getServicesLogs
    getRequestsCountMetrics = getRequestsCountMetrics
    getRequestsLatencyMetrics = getRequestsLatencyMetrics
    deleteService = deleteService
    waitServiceReady = waitReady

    protected allowUnauthenticatedRequestsToService = allowUnauthenticatedRequestsToService

    protected cloudrun: run_v1.Run
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

    protected stackDriver: Logging
    protected getStackDriverClient() {
        const { credentials, keyFile, projectId } = this.options
        if (this.stackDriver) {
            return this.stackDriver
        }

        this.stackDriver = new Logging({
            // projectId,
            credentials,
            keyFile,
        })

        return this.stackDriver
    }

    protected metricsClient: MetricServiceClientType
    protected getMetricsClient(): MetricServiceClientType {
        const { credentials, keyFile, projectId } = this.options
        if (!this.metricsClient) {
            this.metricsClient = new MetricServiceClient({
                // projectId,
                credentials,
                keyFile,
            })
        }
        return this.metricsClient
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

// conditions: [
//     {
//         type: 'Ready',
//         status: 'True',
//         lastTransitionTime: '2020-05-30T22:22:02.777Z',
//     },
//     {
//         type: 'ConfigurationsReady',
//         status: 'True',
//         lastTransitionTime: '2020-05-30T22:21:56.467Z',
//     },
//     {
//         type: 'RoutesReady',
//         status: 'True',
//         lastTransitionTime: '2020-05-30T22:22:02.777Z',
//     },
// ],

type ServiceStatus = {
    ready: boolean
    error?: undefined | Omit<Error, 'stack'>
}

async function getServiceStatus(
    this: CloudRunSdk,
    { name, region, projectId = '' },
): Promise<ServiceStatus> {
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
    if (!ready) {
        return {
            ready: false,
        }
    }
    if (ready.status === 'False') {
        return {
            ready: false,
            error: {
                name: ready.reason,
                message: ready.message,
            },
        }
    }
    if (ready.status === 'True') {
        return {
            ready: true,
        }
    }

    return { ready: false }
}

export function getDefaultOptions(region) {
    return {
        rootUrl: `https://${region}-run.googleapis.com`,
    }
}
