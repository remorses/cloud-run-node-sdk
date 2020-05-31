import flatten from 'lodash.flatten'
import { CloudRunSdk } from '.'
import { makeRequestsCountRequest, makeRequestsLatencyRequest, timeSeriesToPoints } from './metricsRequests'


type MetricsOptions = {
    projectId?: string
    services: string[]
    lastHours: number
    binSecondsWidth?: number
    nowUnixTime?: number
}

export async function getRequestsCountMetrics(
    this: CloudRunSdk,
    input: MetricsOptions,
) {
    const projectId = input.projectId || this.options.projectId
    if (!projectId) {
        throw new Error('missing projectId')
    }
    const client = this.getMetricsClient()
    const [timeSeries] = await client.listTimeSeries(
        makeRequestsCountRequest({
            name: client.projectPath(projectId),
            lastHours: input.lastHours ?? 1,
            alignmentPeriod: input.binSecondsWidth ?? 60,
            serviceNames: input.services || [],
            projectId,
            nowTimestamp: getNow(input.nowUnixTime),
        }) as any,
    )
    // console.log(JSON.stringify(timeSeries, null, 4))
    return flatten(timeSeries.map(timeSeriesToPoints))
}

export async function getRequestsLatencyMetrics(
    this: CloudRunSdk,
    input: MetricsOptions,
) {
    const projectId = input.projectId || this.options.projectId
    if (!projectId) {
        throw new Error('missing projectId')
    }
    const client = this.getMetricsClient()
    const [timeSeries] = await client.listTimeSeries(
        makeRequestsLatencyRequest({
            name: client.projectPath(projectId),
            lastHours: input?.lastHours ?? 1,
            alignmentPeriod: input?.binSecondsWidth ?? 60,
            serviceNames: input?.services || [],
            projectId,
            nowTimestamp: getNow(input?.nowUnixTime),
        }) as any,
    )
    // console.log(JSON.stringify(timeSeries, null, 4))
    return flatten(timeSeries.map(timeSeriesToPoints))
}

function getNow(nowUnix) {
    if (!nowUnix) {
        return new Date().getTime()
    }
    return nowUnix * 1000
}
