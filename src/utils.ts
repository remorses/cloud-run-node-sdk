export const pretty = (x) => console.log(JSON.stringify(x, null, 4))

export function addZeros(num: any, len: number) {
    const cur = num.toString().split('').length
    if (cur < len) {
        return '0'.repeat(len - cur) + num
    }
    return num.slice(0, len)
}

export function removeUndefinedValues<T extends Record<string, any>>(x: T): T {
    Object.keys(x).forEach((k) => {
        if (x[k] === undefined) {
            delete x[k]
        }
    })
    return x
}