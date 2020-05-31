import sleep from 'await-sleep'
import dayjs from 'dayjs'
import { CloudRunSdk } from '.'

interface WaitReadyParams {
    // container: run_v1.Schema$Container
    name: string
    projectId?: string
    region: string
}

export async function waitReady(
    this: CloudRunSdk,
    p: WaitReadyParams,
): Promise<Error | null> {
    const projectId = p.projectId || this.options.projectId
    if (!projectId) {
        throw new Error('missing projectId')
    }
    const { name, region } = p
    const waitMinutes = 4
    const deadline = dayjs().add(waitMinutes, 'minute').toDate().getTime()
    while (new Date().getTime() < deadline) {
        console.log('sleeping 2 seconds')
        await sleep(2000)
        const { ready, error } = await this.getServiceStatus({
            name,
            region,
            projectId,
        })
        if (ready) {
            return null
        }
        if (error) {
            return error
        }
    }
    return new Error(
        `the service did not become ready in ${waitMinutes} minute`,
    )
}
