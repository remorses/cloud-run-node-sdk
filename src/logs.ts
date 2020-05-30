import dayjs from 'dayjs'
import { CloudRunSdk } from '.'
const baseFilter = `resource.type=cloud_run_revision AND severity>=DEFAULT`

export interface LoggedLine {
    datetime: Date
    line: string
    service: string
    insertId: string
}

export async function getServicesLogs(
    this: CloudRunSdk,
    input: GetFilterArg,
): Promise<LoggedLine[]> {
    const filter = getFilter(input)
    console.log('getting logs with filter ' + filter)
    const logging = this.getStackDriverClient()
    const [entries] = await logging.getEntries({
        filter,
        orderBy: 'timestamp asc',
        // maxApiCalls: 2,
    })

    const nodes = entries
        .filter(({ data, metadata }) => {
            if (
                typeof data === 'string' &&
                metadata.resource?.labels?.service_name
            ) {
                return true
            }
        })
        .map(({ data, metadata }) => {
            const ts: Date = metadata.timestamp as any

            return {
                datetime: ts,
                line: data,
                service: metadata.resource?.labels?.service_name,
                insertId: metadata.insertId,
            }
        })
    return nodes
}

type GetFilterArg = {
    lastInsertId?: string
    services: string[]
    from: Date
    to: Date
}

export function getFilter({
    lastInsertId,
    services,
    ...p
}: GetFilterArg): string {
    const from = dayjs(p.from)
    const to = dayjs(p.to)
    if (from.isAfter(to)) {
        throw new Error('from cannot be after to')
    }
    let filter: string = baseFilter
    if (from)
        if (lastInsertId) {
            filter += ` AND insertId>"${lastInsertId}"`
        }
    if (from) {
        filter += ` AND timestamp>="${from.toISOString()}"`
    }
    if (to) {
        filter += ` AND timestamp<="${to.toISOString()}"`
    }
    if (services?.length) {
        filter += ' AND ('
        services.forEach((service, i) => {
            filter += `resource.labels.service_name="${service}"`
            if (i !== services.length - 1) {
                filter += ' OR '
            }
        })

        filter += ' )'
    }
    return filter
}
