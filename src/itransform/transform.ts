import { Averagable, average } from "../types/mod.ts"
import { curried } from "../utils/mod.ts"

export type Transform<X, Y> = (input: Iterable<X>) => Iterable<Y>

export function smooth(
    windowSize: number = 10,
): Transform<Averagable, Averagable> {
    return function* (input: Iterable<Averagable>): Iterable<Averagable> {
        const window: Averagable[] = []

        for (const item of input) {
            window.push(item)
            if (window.length > windowSize) {
                window.shift()
            }
            // @ts-ignore
            yield average(window)
        }
    }
}

export function* range(
    min: number,
    max: number,
): Iterable<number> {
    for (let i = min; i <= max; i++) {
        yield i
    }
}

export function* map<T, U>(
    input: Iterable<T>,
    fn: (item: T) => U,
): Iterable<U> {
    for (const item of input) {
        yield fn(item)
    }
}

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
