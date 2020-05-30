import monitoring from '@google-cloud/monitoring'
import * as dayjs from 'dayjs'
import { flatten } from 'lodash'
import { MetricServiceClient } from '@google-cloud/monitoring'

export const makeServicesFilter = (serviceNames) => {
    let filter = serviceNames
        .map((serviceName) => `resource.labels.service_name="${serviceName}"`)
        .join(' OR ')
    if (filter) {
        filter = `AND (${filter})`
    }
    return filter
}

export const makeRequestsLatencyRequest = ({
    name,
    alignmentPeriod = 60,
    lastHours = 1,
    serviceNames,
    projectId,
    nowTimestamp,
}) => {
    // 1 hours -> 60s
    // 6 hours -> 60s
    // 1 day -> 300
    // 7 day -> 3600s
    // 30 day -> 10800s
    const filter = `metric.type="run.googleapis.com/request_latencies" AND resource.type="cloud_run_revision" ${makeServicesFilter(
        serviceNames,
    )} AND resource.labels.project_id="${projectId}"`
    return {
        name,
        filter: filter,
        interval: {
            startTime: {
                // Limit results to the last 20 minutes
                seconds: nowTimestamp / 1000 - 60 * 60 * lastHours,
            },
            endTime: {
                seconds: nowTimestamp / 1000,
            },
        },
        aggregation: {
            groupByFields: [`resource.labels.service_name`],
            crossSeriesReducer: `REDUCE_SUM`,
            alignmentPeriod: { seconds: alignmentPeriod },
            perSeriesAligner: `ALIGN_PERCENTILE_99`,
        },
        secondaryAggregation: { crossSeriesReducer: `REDUCE_NONE` },
    }
}

export const makeRequestsCountRequest = ({
    name,
    alignmentPeriod = 60,
    lastHours = 1,
    serviceNames,
    projectId,
    nowTimestamp,
}) => {
    const filter = `metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision" ${makeServicesFilter(
        serviceNames,
    )} AND resource.labels.project_id="${projectId}"`
    // console.log({ filter })
    return {
        name,
        filter,
        interval: {
            startTime: {
                // Limit results to the last 20 minutes
                seconds: nowTimestamp / 1000 - 60 * 60 * lastHours,
            },
            endTime: {
                seconds: nowTimestamp / 1000,
            },
        },
        aggregation: {
            groupByFields: [`resource.labels.service_name`],
            crossSeriesReducer: `REDUCE_SUM`,
            alignmentPeriod: { seconds: alignmentPeriod },
            perSeriesAligner: `ALIGN_RATE`,
        },
        secondaryAggregation: { crossSeriesReducer: `REDUCE_NONE` },
    }
}

export interface Point {
    x: Date
    y: number
    serviceName: string
}

export const timeSeriesToPoints = (data: any): Point => {
    // console.log(data.metric.labels)
    // console.log(JSON.stringify(data, null, 4))
    return data.points.map(({ interval, value }) => {
        // console.log(
        //     interval.endTime.seconds - interval.startTime.seconds
        // )
        return {
            y: value[value.value],
            x: new Date(Number(interval.startTime.seconds) * 1000),
            serviceName: data.resource.labels.service_name,
        }
    })
}
