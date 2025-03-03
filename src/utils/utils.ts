export { merge as deepMerge } from "npm:ts-deepmerge"
import { AnyArray, isAnyArray, TypedArray } from "../types/mod.ts"
import { curried } from "./curry.ts"

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

export function padToPowerOfTwo(data: AnyArray<number>): AnyArray<number> {
    const size = nextPowerOfTwo(data.length)
    if (size === data.length) {
        return data
    }

    if (Array.isArray(data)) {
        return data.concat(new Array(size - data.length).fill(0))
    } else {
        // For TypedArrays, we need to create a new one with the correct size
        const Constructor = data.constructor as new (
            length: number,
        ) => TypedArray
        const result = new Constructor(size)
        result.set(data, 0) // Copy existing values
        return result
    }
}

export const getValue = curried(
    <T>(key: string | number, dict: { [key: string]: T }): T => {
        return dict[String(key)]
    },
)

export const setValue = curried(
    <T>(key: string | number, value: T, dict: { [key: string]: T }): T => {
        dict[String(key)] = value
        return value
    },
)
