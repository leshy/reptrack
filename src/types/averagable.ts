export type AveragableObj = {
    avg: (items: AveragableObj[]) => AveragableObj
}

export type Averagable = AveragableObj | number

export type NonEmptyArray<T> = [T, ...T[]]

export function notEmpty<T>(x: T[]): x is NonEmptyArray<T> {
    return x.length > 0
}

export function isNumber(value: unknown): value is number {
    return typeof value === "number"
}

export function isNumberArray(
    values: unknown[],
): values is NonEmptyArray<number> {
    return typeof values[0] === "number"
}

const averageNumbers = (items: number[]) =>
    items.reduce((sum: number, val: number) => sum + val, 0) / items.length

const averageObj = (items: NonEmptyArray<AveragableObj>): AveragableObj =>
    items[0].avg(items.slice(1))

export function average(items: Iterable<number>): number
export function average(items: Iterable<AveragableObj>): AveragableObj

export function average(items: Iterable<Averagable>): Averagable {
    const itemsArray = [...items]

    if (!notEmpty(itemsArray)) {
        throw new Error("collection is empty, can't determine type")
    }

    if (isNumberArray(itemsArray)) return averageNumbers(itemsArray)
    return averageObj(itemsArray as NonEmptyArray<AveragableObj>)
}
