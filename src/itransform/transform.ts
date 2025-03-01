import { Averagable, average } from "../types/mod.ts"
import { curried } from "../utils/mod.ts"

export type Transform<X, Y> = (input: Iterable<X>) => Iterable<Y>

// data generators
export function* range(
    min: number,
    max: number,
): Iterable<number> {
    for (let i = min; i <= max; i++) {
        yield i
    }
}

// transforms
export const smooth = curried(
    function* (
        windowSize: number,
        input: Iterable<Averagable>,
    ): Iterable<Averagable> {
        const window: Averagable[] = []

        for (const item of input) {
            window.push(item)
            if (window.length > windowSize) {
                window.shift()
            }
            // @ts-ignore
            yield average(window)
        }
    },
)

// skip N elements
export const skip = curried(function* <T>(
    n: number,
    input: Iterable<T>,
): Iterable<T> {
    let cnt = 0
    for (const item of input) {
        if (cnt < n) {
            cnt++
        } else {
            yield item
        }
    }
})

export const map = curried(function* map<T, U>(
    fn: (item: T) => U,
    input: Iterable<T>,
): Iterable<U> {
    for (const item of input) {
        yield fn(item)
    }
})

// just for chunk implementation below
export function mutableClear<T>(array: T[]): T[] {
    const copy = [...array]
    array.length = 0
    return copy
}

export const chunk = curried(function* <T>(
    windowSize: number,
    input: Iterable<T>,
): Iterable<T[]> {
    const window: T[] = []
    for (const item of input) {
        window.push(item)
        if (window.length == windowSize) {
            yield mutableClear(window)
        }
    }
})
