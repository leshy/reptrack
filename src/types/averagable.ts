export interface AveragableObj {
    avg(items: this[]): this
    equals(item: this): boolean
}

export type Averagable = number | AveragableObj

export function isNumber(value: unknown): value is number {
    return typeof value === "number"
}

const averageNumbers = (items: number[]) =>
    items.reduce((sum: number, val: number) => sum + val, 0) / items.length

const averageObj = (items: AveragableObj[]): AveragableObj => {
    const first = items[0]
    const rest = items.slice(1) as AveragableObj[]
    return first.avg(rest)
}

export function average(items: Iterable<number>): number
export function average(items: Iterable<AveragableObj>): AveragableObj
export function average(items: Iterable<Averagable>): Averagable {
    const itemsArray = [...items]

    if (!itemsArray.length) {
        throw new Error("collection is empty, can't determine type")
    }

    if (typeof itemsArray[0] === "number") {
        return averageNumbers(itemsArray as number[])
    } else return averageObj(itemsArray as AveragableObj[])
}

export function equals(x: Averagable, y: Averagable): boolean {
    if (isNumber(x) && isNumber(y)) return x === y
    return (x as AveragableObj).equals(y as AveragableObj)
}

export class Vector2D implements AveragableObj {
    constructor(public x: number, public y: number) {}

    avg(items: this[]): this {
        const allItems = [this, ...items]
        const sumX = allItems.reduce((sum, v) => sum + v.x, 0)
        const sumY = allItems.reduce((sum, v) => sum + v.y, 0)
        return new Vector2D(
            sumX / allItems.length,
            sumY / allItems.length,
        ) as this
    }

    equals(item: this): boolean {
        return this.x === item.x && this.y === item.y
    }

    toString(): string {
        return `Vector2D(${this.x}, ${this.y})`
    }
}
