export { merge as deepMerge } from "npm:ts-deepmerge"
import { AnyArray, isAnyArray } from "../types/mod.ts"

export function collect<T>(data: Iterable<T> | AnyArray<T>): T[] | AnyArray<T> {
    if (isAnyArray(data)) {
        return data
    } else {
        return [...data]
    }
}

export function nextPowerOfTwo(n: number): number {
    if (n <= 0) {
        throw new Error("Input must be a positive number")
    }

    if ((n & (n - 1)) === 0) {
        return n
    }
    return Math.pow(2, Math.ceil(Math.log2(n)))
}

export function padToPowerOfTwo(data: number[]): number[] {
    const size = nextPowerOfTwo(data.length)
    if (size === data.length) {
        return data
    }
    return data.concat(new Array(size - data.length).fill(0))
}
